import { loadWarehouseItems } from "@/lib/warehouse-data";
import { ensureLivestockTreatmentSchema } from "@/lib/livestock-treatment-schema";
import { isLivestockTreatmentType, type LivestockTreatmentType } from "@/lib/livestock-treatment-types";
import { db } from "@/lib/db";
import { isWarehouseType, type WarehouseType } from "@/lib/warehouse-types";

export type TreatmentAttachment = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type TreatmentMetadata = Record<string, string | number | TreatmentAttachment[] | null>;

export type TreatmentWarehouseItem = {
  id: string;
  code: string;
  name: string;
  type: WarehouseType;
  group: string | null;
  quantity: number;
  unit: string;
  expiryDate: string | null;
  status: string;
  batchLot: string | null;
  whpDays: number | null;
  esiDays: number | null;
  supplier: string | null;
  manager: string | null;
  productDescription: string | null;
  manufactureDate: string | null;
  purchaseDate: string | null;
};

export type LivestockTreatmentRecord = {
  id: string;
  code: string;
  groupId: string | null;
  warehouseItemId: string;
  warehouseItemName: string | null;
  warehouseItemCode: string | null;
  warehouseType: WarehouseType | null;
  type: LivestockTreatmentType;
  name: string;
  treatmentDate: string | null;
  targetScope: string;
  treatedCount: number;
  dosePerAnimal: number;
  doseUnit: string;
  totalQuantity: number;
  inventoryUnit: string;
  batchLot: string | null;
  method: string | null;
  performedBy: string | null;
  withdrawalDays: number | null;
  esiDays: number | null;
  withdrawalEndDate: string | null;
  nextDueDate: string | null;
  status: string;
  note: string | null;
  metadata: TreatmentMetadata;
  animalCodes: string[];
  createdAt: string | null;
};

export type LivestockTreatmentSupport = {
  warehouseItems: TreatmentWarehouseItem[];
  treatments: LivestockTreatmentRecord[];
};

type TreatmentRow = {
  id: string;
  nhom_vat_nuoi_id: string | null;
  kho_vat_tu_id: string;
  ma_dieu_tri: string | null;
  loai_dieu_tri: string | null;
  ten_dieu_tri: string | null;
  ngay_dieu_tri: string | Date | null;
  pham_vi_dieu_tri: string | null;
  so_luong_vat_nuoi: number | string | null;
  lieu_luong_moi_con: number | string | null;
  don_vi_lieu_luong: string | null;
  tong_luong_dung: number | string | null;
  don_vi_ton_kho: string | null;
  lo_san_xuat: string | null;
  phuong_phap: string | null;
  nguoi_thuc_hien: string | null;
  thoi_gian_ngung_su_dung_ngay: number | string | null;
  thoi_gian_esi_ngay: number | string | null;
  ngay_ket_thuc_cach_ly: string | Date | null;
  ngay_nhac_lai: string | Date | null;
  trang_thai: string | null;
  ghi_chu: string | null;
  metadata_json: TreatmentMetadata | null;
  created_at: string | Date | null;
  ten_vat_tu: string | null;
  ma_vat_tu: string | null;
  loai_kho: string | null;
  animal_codes: string[] | null;
};

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
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: number | string | null) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isExpiredDate(value: string | null) {
  if (!value) return false;
  const date = new Date(`${value}T23:59:59`);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function mapTreatmentRow(row: TreatmentRow): LivestockTreatmentRecord {
  const type: LivestockTreatmentType = isLivestockTreatmentType(row.loai_dieu_tri) ? row.loai_dieu_tri : "custom";
  const warehouseType = isWarehouseType(row.loai_kho) ? row.loai_kho : null;

  return {
    id: String(row.id),
    code: cleanText(row.ma_dieu_tri) ?? String(row.id),
    groupId: row.nhom_vat_nuoi_id ? String(row.nhom_vat_nuoi_id) : null,
    warehouseItemId: String(row.kho_vat_tu_id),
    warehouseItemName: cleanText(row.ten_vat_tu),
    warehouseItemCode: cleanText(row.ma_vat_tu),
    warehouseType,
    type,
    name: cleanText(row.ten_dieu_tri) ?? "Điều trị vật nuôi",
    treatmentDate: dateOnly(row.ngay_dieu_tri),
    targetScope: cleanText(row.pham_vi_dieu_tri) ?? "nhom",
    treatedCount: numberValue(row.so_luong_vat_nuoi),
    dosePerAnimal: numberValue(row.lieu_luong_moi_con),
    doseUnit: cleanText(row.don_vi_lieu_luong) ?? "đơn vị/con",
    totalQuantity: numberValue(row.tong_luong_dung),
    inventoryUnit: cleanText(row.don_vi_ton_kho) ?? "đơn vị",
    batchLot: cleanText(row.lo_san_xuat),
    method: cleanText(row.phuong_phap),
    performedBy: cleanText(row.nguoi_thuc_hien),
    withdrawalDays: nullableNumber(row.thoi_gian_ngung_su_dung_ngay),
    esiDays: nullableNumber(row.thoi_gian_esi_ngay),
    withdrawalEndDate: dateOnly(row.ngay_ket_thuc_cach_ly),
    nextDueDate: dateOnly(row.ngay_nhac_lai),
    status: cleanText(row.trang_thai) ?? "hoan_tat",
    note: cleanText(row.ghi_chu),
    metadata: row.metadata_json ?? {},
    animalCodes: Array.isArray(row.animal_codes) ? row.animal_codes.filter(Boolean) : [],
    createdAt: dateTime(row.created_at),
  };
}

export async function loadLivestockTreatmentSupport(farmId: string, groupId: string): Promise<LivestockTreatmentSupport> {
  await ensureLivestockTreatmentSchema();

  const [warehouseItems, treatmentRs] = await Promise.all([
    loadWarehouseItems(farmId),
    db.query<TreatmentRow>(
      `select
         d.id::text,
         d.nhom_vat_nuoi_id::text,
         d.kho_vat_tu_id::text,
         d.ma_dieu_tri,
         d.loai_dieu_tri,
         d.ten_dieu_tri,
         d.ngay_dieu_tri,
         d.pham_vi_dieu_tri,
         d.so_luong_vat_nuoi,
         d.lieu_luong_moi_con,
         d.don_vi_lieu_luong,
         d.tong_luong_dung,
         d.don_vi_ton_kho,
         d.lo_san_xuat,
         d.phuong_phap,
         d.nguoi_thuc_hien,
         d.thoi_gian_ngung_su_dung_ngay,
         d.thoi_gian_esi_ngay,
         d.ngay_ket_thuc_cach_ly,
         d.ngay_nhac_lai,
         d.trang_thai,
         d.ghi_chu,
         d.metadata_json,
         d.created_at,
         kv.ten_vat_tu,
         kv.ma_vat_tu,
         kv.loai_kho,
         coalesce(selected_animals.animal_codes, array[]::text[]) as animal_codes
       from du_lieu.dieu_tri_vat_nuoi d
       left join du_lieu.kho_vat_tu kv on kv.id = d.kho_vat_tu_id
       left join lateral (
         select array_remove(array_agg(v.ma_vat_nuoi order by v.ma_vat_nuoi), null) as animal_codes
         from du_lieu.dieu_tri_vat_nuoi_ca_the dc
         join du_lieu.vat_nuoi v on v.id = dc.vat_nuoi_id
         where dc.dieu_tri_id = d.id
       ) selected_animals on true
       where d.trang_trai_id = $1 and d.nhom_vat_nuoi_id::text = $2
       order by d.ngay_dieu_tri desc nulls last, d.created_at desc
       limit 30`,
      [farmId, groupId]
    ),
  ]);

  return {
    warehouseItems: warehouseItems
      .filter((item) => item.status !== "da_huy" && item.status !== "ngung_su_dung" && item.status !== "het_han" && !isExpiredDate(item.expiryDate))
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        type: item.type,
        group: item.group,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
        status: item.status,
        batchLot:
          cleanText(item.metadata.batchCode) ??
          cleanText(item.metadata.productBatch) ??
          cleanText(item.metadata.traceCode) ??
          null,
        whpDays: item.whpDays,
        esiDays: item.esiDays,
        supplier: item.supplier,
        manager: item.manager,
        productDescription: item.productDescription,
        manufactureDate: item.manufactureDate,
        purchaseDate: item.purchaseDate,
      })),
    treatments: treatmentRs.rows.map(mapTreatmentRow),
  };
}
