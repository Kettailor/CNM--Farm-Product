import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import { layOwnerIdTuRequest, layOwnerIdTuServerCookie } from "@/lib/auth";
import { ensureGrazingSchema } from "@/lib/grazing-schema";
import { loadGrazingPlans } from "@/lib/grazing-data";
import { isGrazingEventType, isGrazingPlanType, isGrazingStatus, type GrazingEventType, type GrazingPlanType, type GrazingStatus } from "@/lib/grazing-types";

export const dynamic = "force-dynamic";

type EventPayload = { type?: unknown; title?: unknown; startDate?: unknown; endDate?: unknown; prerequisite?: unknown; note?: unknown };
type PaddockPayload = { paddockId?: unknown; priority?: unknown; rating?: unknown; supply?: unknown; events?: unknown };
type GrazingPayload = {
  code?: unknown;
  name?: unknown;
  type?: unknown;
  status?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  season?: unknown;
  manager?: unknown;
  note?: unknown;
  paddocks?: unknown;
  paddockIds?: unknown;
  groupIds?: unknown;
};

function cleanString(value: unknown, max = 240) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function parseIntValue(value: unknown, fallback = 5) {
  const parsed = Number(String(value ?? "").replace(/[^\d]/g, ""));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(10, Math.round(parsed)));
}

function dateOrNull(value: unknown) {
  const raw = cleanString(value, 20);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function stringList(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return Array.from(new Set(values.map((item) => cleanString(item, 80)).filter((item): item is string => Boolean(item))));
}

function normalizeEvents(value: unknown, fallbackStart: string | null, fallbackEnd: string | null) {
  const items = Array.isArray(value) ? value : [];
  return items.map((item) => {
    const event = item as EventPayload;
    const type: GrazingEventType = isGrazingEventType(event.type) ? event.type : "grazing";
    return {
      type,
      title: cleanString(event.title, 180) ?? "Sự kiện chăn thả",
      startDate: dateOrNull(event.startDate) ?? fallbackStart,
      endDate: dateOrNull(event.endDate) ?? fallbackEnd ?? fallbackStart,
      note: cleanString(event.prerequisite ?? event.note, 300),
    };
  });
}

function normalizePaddocks(body: GrazingPayload, fallbackStart: string | null, fallbackEnd: string | null) {
  if (Array.isArray(body.paddocks)) {
    return body.paddocks
      .map((item) => {
        const paddock = item as PaddockPayload;
        const paddockId = cleanString(paddock.paddockId, 80);
        if (!paddockId) return null;
        return {
          paddockId,
          priority: parseIntValue(paddock.priority),
          rating: parseIntValue(paddock.rating),
          supply: cleanString(paddock.supply, 120),
          events: normalizeEvents(paddock.events, fallbackStart, fallbackEnd),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  return stringList(body.paddockIds).map((paddockId) => ({
    paddockId,
    priority: 5,
    rating: 5,
    supply: null,
    events: [{ type: "grazing" as const, title: "Chăn thả", startDate: fallbackStart, endDate: fallbackEnd ?? fallbackStart, note: null }],
  }));
}

function normalizePayload(body: GrazingPayload) {
  const type: GrazingPlanType = isGrazingPlanType(body.type) ? body.type : "seasonal";
  const status: GrazingStatus = isGrazingStatus(body.status) ? body.status : "active";
  const startDate = dateOrNull(body.startDate);
  const endDate = dateOrNull(body.endDate);
  return {
    code: cleanString(body.code, 80),
    name: cleanString(body.name, 180),
    type,
    status,
    startDate,
    endDate,
    season: cleanString(body.season, 120),
    manager: cleanString(body.manager, 120),
    note: cleanString(body.note, 1200),
    paddocks: normalizePaddocks(body, startDate, endDate),
    groupIds: stringList(body.groupIds),
  };
}

async function getOwnerFarmId(ownerId: string) {
  const farmRs = await db.query<{ id: string }>(
    `select id from du_lieu.trang_trai where chu_so_huu_id = $1 order by created_at desc limit 1`,
    [ownerId]
  );
  return farmRs.rows[0]?.id;
}

async function validateIds(farmId: string, paddockIds: string[], groupIds: string[]) {
  const [paddockRs, groupRs] = await Promise.all([
    paddockIds.length
      ? db.query<{ id: string }>(
          `select id::text from du_lieu.khu_vuc
           where trang_trai_id = $1
             and id::text = any($2::text[])
             and coalesce(lower(trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')`,
          [farmId, paddockIds]
        )
      : Promise.resolve({ rows: [] as { id: string }[] }),
    groupIds.length
      ? db.query<{ id: string }>(`select id::text from du_lieu.nhom_vat_nuoi where trang_trai_id = $1 and id::text = any($2::text[])`, [farmId, groupIds])
      : Promise.resolve({ rows: [] as { id: string }[] }),
  ]);
  if (paddockRs.rows.length !== paddockIds.length) return "Có ô chăn thả không thuộc trang trại hiện tại.";
  if (groupRs.rows.length !== groupIds.length) return "Có nhóm vật nuôi không thuộc trang trại hiện tại.";
  return null;
}

async function replacePlanChildren(client: PoolClient, planId: string, payload: ReturnType<typeof normalizePayload>) {
  await client.query(`delete from du_lieu.ke_hoach_chan_tha_khu_vuc where ke_hoach_id::text = $1`, [planId]);
  await client.query(`delete from du_lieu.ke_hoach_chan_tha_nhom_vat_nuoi where ke_hoach_id::text = $1`, [planId]);
  await client.query(`delete from du_lieu.su_kien_chan_tha where ke_hoach_id::text = $1`, [planId]);

  for (const paddock of payload.paddocks) {
    await client.query(
      `insert into du_lieu.ke_hoach_chan_tha_khu_vuc (ke_hoach_id, khu_vuc_id, do_uu_tien, danh_gia, dien_tich_ha, metadata_json)
       select $1::uuid, k.id, $3, $4, k.dien_tich_ha, $5::jsonb
       from du_lieu.khu_vuc k
       where k.id::text = $2
         and coalesce(lower(k.trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')`,
      [planId, paddock.paddockId, paddock.priority, paddock.rating, JSON.stringify({ supply: paddock.supply })]
    );

    for (const event of paddock.events) {
      await client.query(
        `insert into du_lieu.su_kien_chan_tha (
          ke_hoach_id, khu_vuc_id, nhom_vat_nuoi_id, loai_su_kien, tieu_de, trang_thai, ngay_bat_dau, ngay_ket_thuc, ghi_chu
        )
        values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9)`,
        [
          planId,
          paddock.paddockId,
          payload.groupIds[0] ?? null,
          event.type,
          event.title,
          payload.status,
          event.startDate,
          event.endDate,
          event.note,
        ]
      );
    }
  }

  for (const groupId of payload.groupIds) {
    await client.query(
      `insert into du_lieu.ke_hoach_chan_tha_nhom_vat_nuoi (ke_hoach_id, nhom_vat_nuoi_id, so_luong_du_kien)
       select $1::uuid, n.id, n.so_luong from du_lieu.nhom_vat_nuoi n where n.id::text = $2`,
      [planId, groupId]
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { planId: string } }) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

    await ensureGrazingSchema();
    const farmId = await getOwnerFarmId(ownerId);
    if (!farmId) return NextResponse.json({ message: "Chưa có trang trại để cập nhật kế hoạch chăn thả." }, { status: 404 });

    const payload = normalizePayload((await request.json()) as GrazingPayload);
    if (!payload.name) return NextResponse.json({ message: "Vui lòng nhập tên kế hoạch chăn thả." }, { status: 400 });
    if (payload.startDate && payload.endDate && payload.endDate < payload.startDate) {
      return NextResponse.json({ message: "Ngày kết thúc phải sau ngày bắt đầu." }, { status: 400 });
    }
    const idError = await validateIds(farmId, payload.paddocks.map((item) => item.paddockId), payload.groupIds);
    if (idError) return NextResponse.json({ message: idError }, { status: 400 });

    const client = await db.connect();
    try {
      await client.query("begin");
      const updateRs = await client.query(
        `update du_lieu.ke_hoach_chan_tha
            set ma_ke_hoach = coalesce($1, ma_ke_hoach),
                ten_ke_hoach = $2,
                kieu_ke_hoach = $3,
                trang_thai = $4,
                ngay_bat_dau = $5,
                ngay_ket_thuc = $6,
                mua_vu = $7,
                nguoi_phu_trach = $8,
                ghi_chu = $9,
                updated_at = now()
          where id::text = $10 and trang_trai_id = $11`,
        [payload.code, payload.name, payload.type, payload.status, payload.startDate, payload.endDate, payload.season, payload.manager, payload.note, params.planId, farmId]
      );
      if (updateRs.rowCount === 0) {
        await client.query("rollback");
        return NextResponse.json({ message: "Không tìm thấy kế hoạch hoặc không có quyền sửa." }, { status: 404 });
      }

      await replacePlanChildren(client, params.planId, payload);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    const plan = (await loadGrazingPlans(farmId)).find((item) => item.id === params.planId);
    return NextResponse.json({ message: "Đã cập nhật kế hoạch chăn thả.", plan });
  } catch (error) {
    return NextResponse.json({ message: "Không thể cập nhật kế hoạch chăn thả.", error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { planId: string } }) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

    await ensureGrazingSchema();
    const farmId = await getOwnerFarmId(ownerId);
    if (!farmId) return NextResponse.json({ message: "Chưa có trang trại để hủy kế hoạch chăn thả." }, { status: 404 });

    const result = await db.query(
      `with updated_plan as (
        update du_lieu.ke_hoach_chan_tha
           set trang_thai = 'da_huy',
               ghi_chu = concat_ws(E'\n', nullif(ghi_chu, ''), 'Đã hủy kế hoạch chăn thả vào ' || to_char(now(), 'YYYY-MM-DD HH24:MI')),
               updated_at = now()
         where id::text = $1 and trang_trai_id = $2
         returning id
      ), updated_events as (
        update du_lieu.su_kien_chan_tha
           set trang_thai = 'da_huy', updated_at = now()
         where ke_hoach_id in (select id from updated_plan)
         returning id
      )
      select count(*)::int as count from updated_plan`,
      [params.planId, farmId]
    );
    if (Number(result.rows[0]?.count ?? 0) === 0) {
      return NextResponse.json({ message: "Không tìm thấy kế hoạch hoặc không có quyền hủy." }, { status: 404 });
    }

    const plan = (await loadGrazingPlans(farmId)).find((item) => item.id === params.planId);
    return NextResponse.json({ message: "Đã chuyển kế hoạch chăn thả sang trạng thái hủy.", plan });
  } catch (error) {
    return NextResponse.json({ message: "Không thể hủy kế hoạch chăn thả.", error: String(error) }, { status: 500 });
  }
}
