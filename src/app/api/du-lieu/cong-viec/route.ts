import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { layOwnerIdTuRequest, layOwnerIdTuServerCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleFarmId, type FarmAccessAction } from "@/lib/farm-access";
import { ensureWorkSchema } from "@/lib/cong-viec-schema";
import { loadWorkTasks } from "@/lib/cong-viec-data";
import { isWorkPriority, isWorkStatus, isWorkType, type WorkPriority, type WorkStatus, type WorkType } from "@/lib/cong-viec-types";
import { notifyFarmUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type WorkPayload = {
  code?: unknown;
  title?: unknown;
  type?: unknown;
  status?: unknown;
  startDate?: unknown;
  dueDate?: unknown;
  owner?: unknown;
  description?: unknown;
  items?: unknown;
};

type ItemPayload = {
  title?: unknown;
  dueDate?: unknown;
  note?: unknown;
  priority?: unknown;
  assignee?: unknown;
  reporter?: unknown;
  zoneId?: unknown;
  zoneName?: unknown;
};

function cleanString(value: unknown, max = 240) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function dateOrNull(value: unknown) {
  const raw = cleanString(value, 20);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function normalizeItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const payload = item as ItemPayload;
      const title = cleanString(payload.title, 180);
      if (!title) return null;
      const priority: WorkPriority = isWorkPriority(payload.priority) ? payload.priority : "trung_binh";
      return {
        title,
        priority,
        dueDate: dateOrNull(payload.dueDate),
        note: cleanString(payload.note, 500),
        assignee: cleanString(payload.assignee, 120),
        reporter: cleanString(payload.reporter, 120),
        zoneId: cleanString(payload.zoneId, 80),
        zoneName: cleanString(payload.zoneName, 180),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function makeWorkCode(type: WorkType) {
  const prefix: Record<WorkType, string> = {
    tong_quat: "TQ",
    bao_tri: "BT",
    canh_tac: "CT",
    chan_nuoi: "CN",
    kiem_tra: "KT",
  };
  return `CV-${prefix[type]}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function normalizePayload(body: WorkPayload) {
  const type: WorkType = isWorkType(body.type) ? body.type : "tong_quat";
  const status: WorkStatus = isWorkStatus(body.status) ? body.status : "dang_mo";
  return {
    code: cleanString(body.code, 80),
    title: cleanString(body.title, 180),
    type,
    status,
    startDate: dateOrNull(body.startDate),
    dueDate: dateOrNull(body.dueDate),
    owner: cleanString(body.owner, 120),
    description: cleanString(body.description, 1200),
    items: normalizeItems(body.items),
  };
}

async function getOwnerFarmId(ownerId: string, action: FarmAccessAction = "read") {
  return getAccessibleFarmId(ownerId, action);
}

export async function GET(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

    await ensureWorkSchema();
    const farmId = await getOwnerFarmId(ownerId, "read");
    if (!farmId) return NextResponse.json({ tasks: [] });

    const tasks = await loadWorkTasks(farmId);
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json({ message: "Không thể tải dữ liệu công việc.", error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

    await ensureWorkSchema();
    const farmId = await getOwnerFarmId(ownerId, "write");
    if (!farmId) return NextResponse.json({ message: "Không có quyền thêm công việc." }, { status: 403 });

    const payload = normalizePayload((await request.json()) as WorkPayload);
    if (!payload.title) return NextResponse.json({ message: "Vui lòng nhập tên công việc." }, { status: 400 });
    if (payload.startDate && payload.dueDate && payload.dueDate < payload.startDate) {
      return NextResponse.json({ message: "Ngày hạn hoàn thành phải sau ngày bắt đầu." }, { status: 400 });
    }

    const taskId = randomUUID();
    const client = await db.connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into du_lieu.cong_viec (
          id, trang_trai_id, ma_cong_viec, ten_cong_viec, loai_cong_viec, trang_thai,
          ngay_bat_dau, ngay_het_han, nguoi_phu_trach, mo_ta, metadata_json
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
        [
          taskId,
          farmId,
          payload.code ?? makeWorkCode(payload.type),
          payload.title,
          payload.type,
          payload.status,
          payload.startDate,
          payload.dueDate,
          payload.owner,
          payload.description,
          JSON.stringify({ source: "cong-viec-module" }),
        ]
      );

      for (const item of payload.items) {
        await client.query(
          `insert into du_lieu.cong_viec_hang_muc (
             id, cong_viec_id, tieu_de, trang_thai, muc_uu_tien, ngay_het_han,
             nguoi_phu_trach, nguoi_bao_cao, ghi_chu, metadata_json
           )
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
          [
            randomUUID(),
            taskId,
            item.title,
            "chua_lam",
            item.priority,
            item.dueDate,
            item.assignee,
            item.reporter,
            item.note,
            JSON.stringify({ zoneId: item.zoneId, zoneName: item.zoneName, source: "cong-viec-module" }),
          ]
        );
      }

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    const task = (await loadWorkTasks(farmId)).find((item) => item.id === taskId);
    if (task) {
      await notifyFarmUsers({
        farmId,
        excludeUserId: ownerId,
        title: "Công việc mới",
        body: task.title,
        tone: "info",
        module: "Công việc",
        href: `/dashboard/cong-viec?workId=${task.id}`,
        metadata: { taskId: task.id },
      }).catch(() => undefined);
    }
    return NextResponse.json({ message: "Đã thêm công việc.", task });
  } catch (error) {
    const message = String(error).includes("cong_viec_trang_trai_id_ma_cong_viec_key")
      ? "Mã công việc đã tồn tại."
      : "Không thể thêm công việc.";
    return NextResponse.json({ message, error: String(error) }, { status: 500 });
  }
}
