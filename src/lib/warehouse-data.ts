import { db } from "@/lib/db";
import { ensureWarehouseSchema } from "@/lib/warehouse-schema";
import { ensureZoneSchema } from "@/lib/zone-schema";
import {
  isWarehouseStatus,
  isWarehouseType,
  normalizeWarehouseTypeList,
  type WarehouseItem,
  type WarehouseMetadata,
  type WarehouseStatus,
  type WarehouseType,
  type WarehouseZone,
} from "@/lib/warehouse-types";

export type WarehouseRow = {
  id: string;
  khu_vuc_id: string | null;
  ten_khu_vuc: string | null;
  ma_khu_vuc: string | null;
  ma_vat_tu: string | null;
  ten_vat_tu: string | null;
  loai_kho: string | null;
  nhom_hang: string | null;
  so_luong: number | string | null;
  don_vi: string | null;
  nguong_toi_thieu: number | string | null;
  vi_tri_luu_tru: string | null;
  trang_thai: string | null;
  ngay_nhap: string | Date | null;
  han_su_dung: string | Date | null;
  nha_cung_cap: string | null;
  nguoi_phu_trach: string | null;
  gia_tri_uoc_tinh: number | string | null;
  ghi_chu: string | null;
  ten_rut_gon: string | null;
  phan_loai_san_pham: string | null;
  whp_ngay: number | string | null;
  esi_ngay: number | string | null;
  mo_ta_san_pham: string | null;
  so_don_vi: number | string | null;
  dung_tich_moi_don_vi: number | string | null;
  don_vi_dung_tich: string | null;
  tong_dung_tich: number | string | null;
  don_gia: number | string | null;
  tong_chi_phi: number | string | null;
  so_lo: string | null;
  ngay_mua: string | Date | null;
  ngay_san_xuat: string | Date | null;
  metadata_json: WarehouseMetadata | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
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

function numberOrNull(value: number | string | null) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapWarehouseRow(row: WarehouseRow): WarehouseItem {
  const type: WarehouseType = isWarehouseType(row.loai_kho) ? row.loai_kho : "cong_cu";
  const status: WarehouseStatus = isWarehouseStatus(row.trang_thai) ? row.trang_thai : "binh_thuong";

  return {
    id: String(row.id),
    code: String(row.ma_vat_tu ?? ""),
    name: String(row.ten_vat_tu ?? "Vật tư chưa đặt tên"),
    zoneId: row.khu_vuc_id ? String(row.khu_vuc_id) : null,
    zoneName: row.ten_khu_vuc ?? null,
    zoneCode: row.ma_khu_vuc ?? null,
    type,
    group: row.nhom_hang ?? null,
    quantity: numberOrNull(row.so_luong) ?? 0,
    unit: String(row.don_vi ?? "cái"),
    minimumQuantity: numberOrNull(row.nguong_toi_thieu) ?? 0,
    location: row.vi_tri_luu_tru ?? null,
    status,
    receivedDate: dateOnly(row.ngay_nhap),
    expiryDate: dateOnly(row.han_su_dung),
    supplier: row.nha_cung_cap ?? null,
    manager: row.nguoi_phu_trach ?? null,
    estimatedValue: numberOrNull(row.gia_tri_uoc_tinh),
    note: row.ghi_chu ?? null,
    metadata: row.metadata_json ?? {},
    chemicalAlias: row.ten_rut_gon ?? (typeof row.metadata_json?.alias === "string" ? row.metadata_json.alias : null),
    chemicalProductType: row.phan_loai_san_pham ?? (typeof row.metadata_json?.productType === "string" ? row.metadata_json.productType : null),
    whpDays: numberOrNull(row.whp_ngay) ?? numberOrNull(row.metadata_json?.whpDays ?? null),
    esiDays: numberOrNull(row.esi_ngay) ?? numberOrNull(row.metadata_json?.esiDays ?? null),
    productDescription: row.mo_ta_san_pham ?? (typeof row.metadata_json?.description === "string" ? row.metadata_json.description : null),
    unitCount: numberOrNull(row.so_don_vi) ?? numberOrNull(row.metadata_json?.unitCount ?? null),
    volumePerUnit: numberOrNull(row.dung_tich_moi_don_vi) ?? numberOrNull(row.metadata_json?.volumePerUnit ?? null),
    volumeUnit: row.don_vi_dung_tich ?? (typeof row.metadata_json?.volumeUnit === "string" ? row.metadata_json.volumeUnit : null),
    totalVolume: numberOrNull(row.tong_dung_tich) ?? numberOrNull(row.metadata_json?.totalVolume ?? null),
    unitCost: numberOrNull(row.don_gia) ?? numberOrNull(row.metadata_json?.unitCost ?? null),
    totalCost: numberOrNull(row.tong_chi_phi) ?? numberOrNull(row.metadata_json?.totalCost ?? null),
    batchNumber: row.so_lo ?? (typeof row.metadata_json?.batchNumber === "string" ? row.metadata_json.batchNumber : null),
    purchaseDate: dateOnly(row.ngay_mua) ?? dateOnly(typeof row.metadata_json?.purchaseDate === "string" ? row.metadata_json.purchaseDate : null),
    manufactureDate: dateOnly(row.ngay_san_xuat) ?? dateOnly(typeof row.metadata_json?.manufactureDate === "string" ? row.metadata_json.manufactureDate : null),
    createdAt: dateTime(row.created_at),
    updatedAt: dateTime(row.updated_at),
  };
}

type WarehouseZoneRow = {
  id: string;
  ma_khu_vuc: string | null;
  ten_khu_vuc: string | null;
  trang_thai: string | null;
  dien_tich_ha: number | string | null;
  mau_sac: string | null;
  hinh_hoc_geojson: {
    metadata?: {
      warehouseTypes?: unknown;
      extra?: { warehouseTypes?: unknown; storageType?: unknown } | null;
    } | null;
  } | null;
  loai_khu_vuc: string | null;
  nhom_luu_tru_kho: string[] | null;
};

const ALL_WAREHOUSE_TYPES: WarehouseType[] = ["cong_cu", "hoa_chat", "thuc_an", "thanh_pham_vat_nuoi"];

function warehouseTypesFromZone(row: WarehouseZoneRow): WarehouseType[] {
  const columnTypes = normalizeWarehouseTypeList(row.nhom_luu_tru_kho, []);
  if (columnTypes.length > 0) return columnTypes;

  const metadata = row.hinh_hoc_geojson?.metadata ?? {};
  const explicit = normalizeWarehouseTypeList(metadata.warehouseTypes, []);
  if (explicit.length > 0) return explicit;

  const extra = metadata.extra ?? {};
  const extraTypes = normalizeWarehouseTypeList(extra.warehouseTypes, []);
  if (extraTypes.length > 0) return extraTypes;

  const storageText = String(extra.storageType ?? "").toLowerCase();
  if (storageText.includes("hoa") || storageText.includes("chemical")) return ["hoa_chat"];
  if (storageText.includes("thuc") || storageText.includes("feed")) return ["thuc_an"];
  if (storageText.includes("thanh") || storageText.includes("product")) return ["thanh_pham_vat_nuoi"];
  if (storageText.includes("dung") || storageText.includes("tool")) return ["cong_cu"];

  return ALL_WAREHOUSE_TYPES;
}

export async function loadWarehouseZones(farmId: string): Promise<WarehouseZone[]> {
  await ensureZoneSchema();
  const result = await db.query<WarehouseZoneRow>(
    `select
       k.id::text as id,
       k.ma_khu_vuc,
       k.ten_khu_vuc,
       k.trang_thai,
       k.loai_khu_vuc,
       k.nhom_luu_tru_kho,
       k.dien_tich_ha,
       k.mau_sac,
       k.hinh_hoc_geojson
     from du_lieu.khu_vuc k
     left join du_lieu.danh_muc_loai_khu_vuc loai on loai.id = k.loai_khu_vuc_id
     where k.trang_trai_id = $1
       and coalesce(lower(k.trang_thai), '') not in ('da_huy', 'da huy', 'dã hủy', 'đã hủy')
       and (
         lower(coalesce(k.loai_khu_vuc, '')) = 'storage'
         or lower(coalesce(k.hinh_hoc_geojson->'metadata'->>'kind', '')) = 'storage'
         or lower(coalesce(loai.ten, '')) = 'storage'
         or lower(coalesce(k.nguon_tao, '')) like '%:storage%'
         or lower(coalesce(k.mo_ta, '')) like '%kho%'
       )
     order by k.ten_khu_vuc asc, k.created_at asc`,
    [farmId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    code: row.ma_khu_vuc ?? null,
    name: String(row.ten_khu_vuc ?? "Khu vực kho"),
    status: row.trang_thai ?? null,
    areaHa: row.dien_tich_ha == null ? null : Number(row.dien_tich_ha),
    color: row.mau_sac ?? null,
    warehouseTypes: warehouseTypesFromZone(row),
  }));
}

export async function loadWarehouseItems(farmId: string): Promise<WarehouseItem[]> {
  await ensureWarehouseSchema();

  const result = await db.query<WarehouseRow>(
    `select kv.id::text, kv.khu_vuc_id::text, zone.ten_khu_vuc, zone.ma_khu_vuc,
            kv.ma_vat_tu, kv.ten_vat_tu, kv.loai_kho, kv.nhom_hang, kv.so_luong, kv.don_vi,
            kv.nguong_toi_thieu, kv.vi_tri_luu_tru, kv.trang_thai, kv.ngay_nhap, kv.han_su_dung,
            kv.nha_cung_cap, kv.nguoi_phu_trach, kv.gia_tri_uoc_tinh, kv.ghi_chu, kv.metadata_json,
            kv.ten_rut_gon, kv.phan_loai_san_pham, kv.whp_ngay, kv.esi_ngay, kv.mo_ta_san_pham,
            kv.so_don_vi, kv.dung_tich_moi_don_vi, kv.don_vi_dung_tich, kv.tong_dung_tich,
            kv.don_gia, kv.tong_chi_phi, kv.so_lo, kv.ngay_mua, kv.ngay_san_xuat,
            kv.created_at, kv.updated_at
     from du_lieu.kho_vat_tu kv
     left join du_lieu.khu_vuc zone on zone.id = kv.khu_vuc_id
     where kv.trang_trai_id = $1
     order by kv.updated_at desc nulls last, kv.created_at desc nulls last, kv.ten_vat_tu asc`,
    [farmId]
  );

  return result.rows.map(mapWarehouseRow);
}
