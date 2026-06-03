import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import { layOwnerIdTuRequest, layOwnerIdTuServerCookie } from "@/lib/auth";
import { getAccessibleFarmId } from "@/lib/farm-access";
import { ensureGrazingSchema } from "@/lib/grazing-schema";
import { loadGrazingPlans } from "@/lib/grazing-data";
import { isGrazingEventType, isGrazingPlanType, isGrazingStatus, type GrazingEventType, type GrazingPlanType, type GrazingStatus } from "@/lib/grazing-types";

export const dynamic = "force-dynamic";
const PERPETUAL_PLAN_DAYS = 7;

type EventPayload = {
  id?: unknown;
  type?: unknown;
  title?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  prerequisite?: unknown;
  prerequisiteId?: unknown;
  note?: unknown;
  repeat?: unknown;
  recurrenceIndex?: unknown;
  durationDays?: unknown;
};
type PaddockPayload = { paddockId?: unknown; priority?: unknown; rating?: unknown; supply?: unknown; events?: unknown };
type NormalizedEventPayload = {
  type: GrazingEventType;
  title: string;
  startDate: string | null;
  endDate: string | null;
  note: string | null;
  metadata: {
    sourceId: string | null;
    prerequisiteId: string | null;
    dependencyType: string | null;
    repeat: boolean;
    recurrenceIndex: number | null;
    durationDays: number | null;
    startTime: string | null;
    endTime: string | null;
  };
};
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
  const raw = cleanString(value, 32);
  const match = raw?.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function timeOrNull(value: unknown) {
  const raw = cleanString(value, 32);
  const match = raw?.match(/(?:T)?(\d{2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) return null;
  return `${match[1]}:${match[2]}`;
}

function addDays(value: string, days: number) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return value;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function minIsoDate(a: string, b: string) {
  return a < b ? a : b;
}

function daysBetween(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null;
  const start = dateToUtcTime(startDate);
  const end = dateToUtcTime(endDate);
  if (start == null || end == null) return null;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function dateToUtcTime(value: string) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const [year, month, day] = parts;
  return Date.UTC(year, month - 1, day);
}

function dateTimeToUtcMs(dateValue: string | null, timeValue: string | null, endOfDay = false) {
  if (!dateValue) return null;
  const date = dateToUtcTime(dateValue);
  if (date == null) return null;
  const time = timeOrNull(timeValue);
  if (!time) return date + (endOfDay ? 86_400_000 - 60_000 : 0);
  const [hour, minute] = time.split(":").map(Number);
  return date + (hour * 60 + minute) * 60_000;
}

function dateTimeFromUtcMs(value: number) {
  const date = new Date(value);
  return { date: date.toISOString().slice(0, 10), time: date.toISOString().slice(11, 16) };
}

function stringList(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return Array.from(new Set(values.map((item) => cleanString(item, 80)).filter((item): item is string => Boolean(item))));
}

function boolValue(value: unknown) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function positiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function alignFinishStartDependencies(events: NormalizedEventPayload[]) {
  return events.map((event) => {
    const prerequisiteId = event.metadata.prerequisiteId;
    if (!prerequisiteId) return event;
    const currentStart = dateTimeToUtcMs(event.startDate, event.metadata.startTime);
    const currentEnd = dateTimeToUtcMs(event.endDate ?? event.startDate, event.metadata.endTime, !event.metadata.endTime);
    if (currentStart == null || currentEnd == null || currentEnd <= currentStart) return event;
    const candidates = events
      .filter((item) => item !== event && item.metadata.sourceId === prerequisiteId)
      .map((item) => ({
        event: item,
        end: dateTimeToUtcMs(item.endDate ?? item.startDate, item.metadata.endTime, !item.metadata.endTime),
      }))
      .filter((item): item is { event: NormalizedEventPayload; end: number } => item.end != null)
      .sort((a, b) => a.end - b.end);
    if (!candidates.length) return event;
    const source = candidates.filter((item) => item.end <= currentStart).at(-1) ?? candidates.find((item) => item.end > currentStart) ?? candidates.at(-1);
    if (!source) return event;
    const durationMinutes = Math.max(1, Math.round((currentEnd - currentStart) / 60_000));
    const nextStart = dateTimeFromUtcMs(source.end);
    const nextEnd = dateTimeFromUtcMs(source.end + durationMinutes * 60_000);
    return {
      ...event,
      startDate: nextStart.date,
      endDate: nextEnd.date,
      metadata: { ...event.metadata, startTime: nextStart.time, endTime: nextEnd.time },
    };
  });
}

function normalizeEvents(value: unknown, fallbackStart: string | null, fallbackEnd: string | null, planType: GrazingPlanType) {
  const items = Array.isArray(value) ? value : [];
  const normalized = items.map((item): NormalizedEventPayload => {
    const event = item as EventPayload;
    const type: GrazingEventType = isGrazingEventType(event.type) ? event.type : "grazing";
    const startDate = dateOrNull(event.startDate) ?? fallbackStart;
    const rawEndDate = dateOrNull(event.endDate) ?? fallbackEnd ?? startDate;
    const maxEndDate = planType === "perpetual" && startDate ? addDays(startDate, PERPETUAL_PLAN_DAYS - 1) : null;
    const clippedEndDate = rawEndDate && maxEndDate ? minIsoDate(rawEndDate, maxEndDate) : rawEndDate;
    const endDate = startDate && clippedEndDate && clippedEndDate < startDate ? startDate : clippedEndDate;
    const startTime = timeOrNull(event.startTime) ?? timeOrNull(event.startDate);
    const rawEndTime = timeOrNull(event.endTime) ?? timeOrNull(event.endDate);
    const endTime = startDate && endDate && startDate === endDate && startTime && rawEndTime && rawEndTime < startTime ? startTime : rawEndTime;
    const durationDays = planType === "perpetual" ? daysBetween(startDate, endDate) : positiveNumber(event.durationDays);
    return {
      type,
      title: cleanString(event.title, 180) ?? "Sự kiện chăn thả",
      startDate,
      endDate,
      note: cleanString(event.prerequisite ?? event.note, 300),
      metadata: {
        sourceId: cleanString(event.id, 120),
        prerequisiteId: cleanString(event.prerequisiteId, 120),
        dependencyType: cleanString(event.prerequisiteId, 120) ? "FS" : null,
        repeat: planType === "perpetual" || boolValue(event.repeat),
        recurrenceIndex: positiveNumber(event.recurrenceIndex),
        durationDays,
        startTime,
        endTime,
      },
    };
  });
  return alignFinishStartDependencies(normalized);
}

function normalizePaddocks(body: GrazingPayload, fallbackStart: string | null, fallbackEnd: string | null, planType: GrazingPlanType) {
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
          events: normalizeEvents(paddock.events, fallbackStart, fallbackEnd, planType),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  return stringList(body.paddockIds).map((paddockId) => ({
    paddockId,
    priority: 5,
    rating: 5,
    supply: null,
    events: [{
      type: "grazing" as const,
      title: "Chăn thả",
      startDate: fallbackStart,
      endDate: fallbackEnd ?? (planType === "perpetual" && fallbackStart ? addDays(fallbackStart, PERPETUAL_PLAN_DAYS - 1) : fallbackStart),
      note: null,
      metadata: { repeat: planType === "perpetual", durationDays: planType === "perpetual" ? PERPETUAL_PLAN_DAYS : null },
    }],
  }));
}

function normalizePayload(body: GrazingPayload) {
  const type: GrazingPlanType = isGrazingPlanType(body.type) ? body.type : "seasonal";
  const status: GrazingStatus = isGrazingStatus(body.status) ? body.status : "active";
  const startDate = dateOrNull(body.startDate);
  const endDate = type === "perpetual" ? null : dateOrNull(body.endDate);
  const eventEndDate = type === "perpetual" && startDate ? addDays(startDate, PERPETUAL_PLAN_DAYS - 1) : endDate;
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
    paddocks: normalizePaddocks(body, startDate, eventEndDate, type),
    groupIds: stringList(body.groupIds),
  };
}

async function getOwnerFarmId(ownerId: string) {
  return getAccessibleFarmId(ownerId, "write");
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
          ke_hoach_id, khu_vuc_id, nhom_vat_nuoi_id, loai_su_kien, tieu_de, trang_thai, ngay_bat_dau, ngay_ket_thuc, ghi_chu, metadata_json
        )
        values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
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
          JSON.stringify(event.metadata),
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
    if (!farmId) return NextResponse.json({ message: "Không có quyền cập nhật kế hoạch chăn thả." }, { status: 403 });

    const payload = normalizePayload((await request.json()) as GrazingPayload);
    if (!payload.name) return NextResponse.json({ message: "Vui lòng nhập tên kế hoạch chăn thả." }, { status: 400 });
    if (payload.type !== "perpetual" && !payload.endDate) {
      return NextResponse.json({ message: "Vui lòng nhập ngày kết thúc cho kế hoạch theo mùa hoặc trái mùa." }, { status: 400 });
    }
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
    if (!farmId) return NextResponse.json({ message: "Không có quyền hủy kế hoạch chăn thả." }, { status: 403 });

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
