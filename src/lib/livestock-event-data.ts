import { db } from "@/lib/db";
import { ensureLivestockEventSchema } from "@/lib/livestock-event-schema";
import { isLivestockEventType, type LivestockEventType } from "@/lib/livestock-event-types";

export type LivestockEventMetadata = Record<string, string | number | null>;

export type LivestockEventZone = {
  id: string;
  name: string;
};

export type LivestockEventRecord = {
  id: string;
  code: string;
  groupId: string | null;
  type: LivestockEventType;
  title: string;
  eventDate: string | null;
  scope: string;
  animalCount: number;
  numericValue: number | null;
  unit: string | null;
  sourceZoneName: string | null;
  destinationZoneName: string | null;
  performedBy: string | null;
  followUpDate: string | null;
  note: string | null;
  metadata: LivestockEventMetadata;
  animalCodes: string[];
  createdAt: string | null;
};

export type LivestockEventSupport = {
  zones: LivestockEventZone[];
  events: LivestockEventRecord[];
};

type EventRow = {
  id: string;
  nhom_vat_nuoi_id: string | null;
  ma_su_kien: string | null;
  loai_su_kien: string | null;
  tieu_de: string | null;
  ngay_su_kien: string | Date | null;
  pham_vi_su_kien: string | null;
  so_luong_vat_nuoi: number | string | null;
  gia_tri_so: number | string | null;
  don_vi: string | null;
  nguoi_thuc_hien: string | null;
  ngay_nhac_lai: string | Date | null;
  ghi_chu: string | null;
  metadata_json: LivestockEventMetadata | null;
  created_at: string | Date | null;
  ten_khu_vuc_nguon: string | null;
  ten_khu_vuc_dich: string | null;
  animal_codes: string[] | null;
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

function numberValue(value: number | string | null) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapEventRow(row: EventRow): LivestockEventRecord {
  const type: LivestockEventType = isLivestockEventType(row.loai_su_kien) ? row.loai_su_kien : "adjustment";

  return {
    id: String(row.id),
    code: cleanText(row.ma_su_kien) ?? String(row.id),
    groupId: row.nhom_vat_nuoi_id ? String(row.nhom_vat_nuoi_id) : null,
    type,
    title: cleanText(row.tieu_de) ?? "Sự kiện vật nuôi",
    eventDate: dateOnly(row.ngay_su_kien),
    scope: cleanText(row.pham_vi_su_kien) ?? "ca_the",
    animalCount: Number(row.so_luong_vat_nuoi ?? 0),
    numericValue: numberValue(row.gia_tri_so),
    unit: cleanText(row.don_vi),
    sourceZoneName: cleanText(row.ten_khu_vuc_nguon),
    destinationZoneName: cleanText(row.ten_khu_vuc_dich),
    performedBy: cleanText(row.nguoi_thuc_hien),
    followUpDate: dateOnly(row.ngay_nhac_lai),
    note: cleanText(row.ghi_chu),
    metadata: row.metadata_json ?? {},
    animalCodes: Array.isArray(row.animal_codes) ? row.animal_codes.filter(Boolean) : [],
    createdAt: dateTime(row.created_at),
  };
}

export async function loadLivestockEventSupport(farmId: string, groupId: string): Promise<LivestockEventSupport> {
  await ensureLivestockEventSchema();

  const [zoneRs, eventRs] = await Promise.all([
    db.query<{ id: string; ten_khu_vuc: string | null }>(
      `select id::text, ten_khu_vuc
       from du_lieu.khu_vuc
       where trang_trai_id = $1
         and coalesce(lower(trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
       order by ten_khu_vuc asc nulls last, created_at desc nulls last`,
      [farmId]
    ),
    db.query<EventRow>(
      `select
         s.id::text,
         s.nhom_vat_nuoi_id::text,
         s.ma_su_kien,
         s.loai_su_kien,
         s.tieu_de,
         s.ngay_su_kien,
         s.pham_vi_su_kien,
         s.so_luong_vat_nuoi,
         s.gia_tri_so,
         s.don_vi,
         s.nguoi_thuc_hien,
         s.ngay_nhac_lai,
         s.ghi_chu,
         s.metadata_json,
         s.created_at,
         k1.ten_khu_vuc as ten_khu_vuc_nguon,
         k2.ten_khu_vuc as ten_khu_vuc_dich,
         coalesce(selected_animals.animal_codes, array[]::text[]) as animal_codes
       from du_lieu.su_kien_vat_nuoi s
       left join du_lieu.khu_vuc k1 on k1.id = s.khu_vuc_nguon_id
       left join du_lieu.khu_vuc k2 on k2.id = s.khu_vuc_dich_id
       left join lateral (
         select array_remove(array_agg(v.ma_vat_nuoi order by v.ma_vat_nuoi), null) as animal_codes
         from du_lieu.su_kien_vat_nuoi_ca_the sc
         join du_lieu.vat_nuoi v on v.id = sc.vat_nuoi_id
         where sc.su_kien_id = s.id
       ) selected_animals on true
       where s.trang_trai_id = $1 and s.nhom_vat_nuoi_id::text = $2
       order by s.ngay_su_kien desc nulls last, s.created_at desc
       limit 40`,
      [farmId, groupId]
    ),
  ]);

  return {
    zones: zoneRs.rows.map((row) => ({
      id: String(row.id),
      name: cleanText(row.ten_khu_vuc) ?? "Khu vực chưa đặt tên",
    })),
    events: eventRs.rows.map(mapEventRow),
  };
}
