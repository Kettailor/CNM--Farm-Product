import { db } from "@/lib/db";
import { ensureWorkSchema } from "@/lib/cong-viec-schema";
import {
  isWorkItemStatus,
  isWorkPriority,
  isWorkStatus,
  isWorkType,
  type WorkItem,
  type WorkItemStatus,
  type WorkPriority,
  type WorkStatus,
  type WorkTask,
  type WorkType,
} from "@/lib/cong-viec-types";

type WorkRow = {
  id: string;
  ma_cong_viec: string | null;
  ten_cong_viec: string | null;
  loai_cong_viec: string | null;
  trang_thai: string | null;
  ngay_bat_dau: string | Date | null;
  ngay_het_han: string | Date | null;
  nguoi_phu_trach: string | null;
  mo_ta: string | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

type WorkItemRow = {
  id: string;
  cong_viec_id: string;
  tieu_de: string | null;
  trang_thai: string | null;
  muc_uu_tien: string | null;
  ngay_het_han: string | Date | null;
  nguoi_phu_trach: string | null;
  nguoi_bao_cao: string | null;
  ghi_chu: string | null;
  metadata_json: {
    zoneId?: unknown;
    zoneName?: unknown;
    estimate?: unknown;
    attachments?: unknown;
  } | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function dateOnly(value: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function dateTime(value: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeAttachments(value: unknown): WorkItem["attachments"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = cleanText(row.id) ?? "";
    const name = cleanText(row.name) ?? "";
    const type = cleanText(row.type) ?? "application/octet-stream";
    const dataUrl = cleanText(row.dataUrl) ?? "";
    const uploadedAt = cleanText(row.uploadedAt) ?? "";
    const size = Number(row.size ?? 0);
    if (!id || !name || !dataUrl || !Number.isFinite(size)) return [];
    return [{
      id,
      name,
      type,
      size,
      dataUrl,
      uploadedAt,
      uploadedBy: cleanText(row.uploadedBy),
    }];
  });
}

function mapItem(row: WorkItemRow): WorkItem {
  const status: WorkItemStatus = isWorkItemStatus(row.trang_thai) ? row.trang_thai : "chua_lam";
  const priority: WorkPriority = isWorkPriority(row.muc_uu_tien) ? row.muc_uu_tien : "trung_binh";
  return {
    id: String(row.id),
    title: cleanText(row.tieu_de) ?? "Hạng mục công việc",
    status,
    priority,
    dueDate: dateOnly(row.ngay_het_han),
    assignee: cleanText(row.nguoi_phu_trach),
    reporter: cleanText(row.nguoi_bao_cao),
    zoneId: cleanText(row.metadata_json?.zoneId),
    zoneName: cleanText(row.metadata_json?.zoneName),
    estimate: cleanText(row.metadata_json?.estimate),
    attachments: normalizeAttachments(row.metadata_json?.attachments),
    note: cleanText(row.ghi_chu),
    createdAt: dateTime(row.created_at),
    updatedAt: dateTime(row.updated_at),
  };
}

export async function loadWorkTasks(farmId: string): Promise<WorkTask[]> {
  await ensureWorkSchema();

  const [workRs, itemRs] = await Promise.all([
    db.query<WorkRow>(
      `select id::text, ma_cong_viec, ten_cong_viec, loai_cong_viec, trang_thai,
              ngay_bat_dau, ngay_het_han, nguoi_phu_trach, mo_ta, created_at, updated_at
       from du_lieu.cong_viec
       where trang_trai_id = $1
       order by created_at desc nulls last, id desc`,
      [farmId]
    ),
    db.query<WorkItemRow>(
      `select hm.id::text, hm.cong_viec_id::text, hm.tieu_de, hm.trang_thai,
              hm.muc_uu_tien, hm.ngay_het_han, hm.nguoi_phu_trach, hm.nguoi_bao_cao,
              hm.ghi_chu, hm.metadata_json, hm.created_at, hm.updated_at
       from du_lieu.cong_viec_hang_muc hm
       join du_lieu.cong_viec cv on cv.id = hm.cong_viec_id
       where cv.trang_trai_id = $1
       order by hm.created_at asc, hm.id asc`,
      [farmId]
    ),
  ]);

  const itemsByWork = new Map<string, WorkItem[]>();
  for (const row of itemRs.rows) {
    const key = String(row.cong_viec_id);
    itemsByWork.set(key, [...(itemsByWork.get(key) ?? []), mapItem(row)]);
  }

  return workRs.rows.map((row) => {
    const id = String(row.id);
    const type: WorkType = isWorkType(row.loai_cong_viec) ? row.loai_cong_viec : "tong_quat";
    const status: WorkStatus = isWorkStatus(row.trang_thai) ? row.trang_thai : "dang_mo";
    return {
      id,
      code: cleanText(row.ma_cong_viec) ?? id,
      title: cleanText(row.ten_cong_viec) ?? "Công việc",
      type,
      status,
      startDate: dateOnly(row.ngay_bat_dau),
      dueDate: dateOnly(row.ngay_het_han),
      owner: cleanText(row.nguoi_phu_trach),
      description: cleanText(row.mo_ta),
      items: itemsByWork.get(id) ?? [],
      createdAt: dateTime(row.created_at),
      updatedAt: dateTime(row.updated_at),
    };
  });
}
