import { db } from "@/lib/db";
import { ensureWarehouseSchema } from "@/lib/warehouse-schema";
import { loadWarehouseItems, loadWarehouseZones } from "@/lib/warehouse-data";
import type { WarehouseItem, WarehouseZone } from "@/lib/warehouse-types";

export type ChemicalZone = WarehouseZone & {
  polygon: Array<{ lat: number; lng: number }>;
};

export type ChemicalUsageLog = {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  actionType: string;
  source: string | null;
  quantity: number;
  beforeQuantity: number | null;
  afterQuantity: number | null;
  unit: string | null;
  note: string | null;
  createdAt: string | null;
};

export type ChemicalProfile = {
  products: WarehouseItem[];
  usageLogs: ChemicalUsageLog[];
  zones: ChemicalZone[];
};

type SampleChemical = {
  alias: string;
  productName: string;
  productType: string;
  whpDays: number | null;
  esiDays: number | null;
  description: string;
  unitCount: number;
  volumePerUnit: number;
  volumeUnit: string;
  totalVolume: number;
  unitCost: number;
  totalCost: number;
  batchNumber: string;
  supplier: string;
  storageLocation: string;
  purchaseDate: string;
  manufactureDate: string;
  expiryDate: string;
};

type ChemicalZoneRow = {
  id: string;
  ma_khu_vuc: string | null;
  ten_khu_vuc: string | null;
  trang_thai: string | null;
  dien_tich_ha: number | string | null;
  mau_sac: string | null;
  nhom_luu_tru_kho: string[] | null;
  hinh_hoc_geojson: {
    geo?: { polygon?: Array<{ lat?: number | string; lng?: number | string }> } | null;
    metadata?: { warehouseTypes?: unknown; extra?: { warehouseTypes?: unknown } | null } | null;
  } | null;
};

type UsageLogRow = {
  id: string;
  kho_vat_tu_id: string;
  ten_vat_tu: string | null;
  ma_vat_tu: string | null;
  loai_giao_dich: string | null;
  nguon_nghiep_vu: string | null;
  so_luong: number | string | null;
  so_luong_truoc: number | string | null;
  so_luong_sau: number | string | null;
  don_vi: string | null;
  ghi_chu: string | null;
  created_at: string | Date | null;
};

export const CHEMICAL_SAMPLE_PRODUCTS: SampleChemical[] = [
  { alias: "Ultravac", productName: "5in1 ultravac", productType: "Thú y", whpDays: 0, esiDays: 0, description: "Vắc xin 5 trong 1", unitCount: 100, volumePerUnit: 1, volumeUnit: "mL", totalVolume: 100, unitCost: 2.5, totalCost: 250, batchNumber: "16402", supplier: "Silmac", storageLocation: "Zoetis", purchaseDate: "2023-08-11", manufactureDate: "2023-07-11", expiryDate: "2023-09-11" },
  { alias: "ClickX", productName: "Clik Extra Spray On Fly Treatment", productType: "Thú y", whpDays: 21, esiDays: 21, description: "Phòng trị ruồi và ký sinh ngoài da", unitCount: 5000, volumePerUnit: 1, volumeUnit: "mL", totalVolume: 5000, unitCost: 0.75, totalCost: 3750, batchNumber: "CLX2023-08", supplier: "Silmac Bathurst", storageLocation: "Kho hóa chất", purchaseDate: "2023-08-11", manufactureDate: "2023-07-11", expiryDate: "2026-08-11" },
  { alias: "Cydectin Pour on (440ml)", productName: "Cydectin Pour on", productType: "Thú y", whpDays: 0, esiDays: 0, description: "Thuốc tẩy ký sinh nội cho cừu", unitCount: 1, volumePerUnit: 440, volumeUnit: "mL", totalVolume: 440, unitCost: 133.5, totalCost: 133.5, batchNumber: "22012001", supplier: "Virbac", storageLocation: "Virbac", purchaseDate: "2023-02-28", manufactureDate: "2023-01-15", expiryDate: "2024-02-29" },
  { alias: "Q-Drench", productName: "Q-Drench", productType: "Thú y", whpDays: 14, esiDays: 21, description: "Thuốc tẩy ký sinh phổ rộng cho cừu", unitCount: 1, volumePerUnit: 20, volumeUnit: "L", totalVolume: 20, unitCost: 350, totalCost: 350, batchNumber: "12345678", supplier: "NuTech", storageLocation: "Nu Tech", purchaseDate: "2022-09-09", manufactureDate: "2022-09-01", expiryDate: "2023-02-17" },
  { alias: "Superphosphate", productName: "Super", productType: "Nông nghiệp", whpDays: 0, esiDays: null, description: "Phân super lân", unitCount: 1000, volumePerUnit: 1, volumeUnit: "kg", totalVolume: 1000, unitCost: 0.66, totalCost: 660, batchNumber: "SP2023-01", supplier: "AgriWest", storageLocation: "Kho phân bón", purchaseDate: "2023-01-15", manufactureDate: "2023-01-01", expiryDate: "2024-12-31" },
  { alias: "Ultravac", productName: "Ultravac 5in1", productType: "Thú y", whpDays: 0, esiDays: 0, description: "Vắc xin 5 trong 1 cho cừu", unitCount: 100, volumePerUnit: 1, volumeUnit: "mL", totalVolume: 100, unitCost: 2.75, totalCost: 275, batchNumber: "UV2022-11", supplier: "AgriWest", storageLocation: "Tủ lạnh vắc xin", purchaseDate: "2022-11-14", manufactureDate: "2022-10-14", expiryDate: "2023-01-01" },
  { alias: "Dual", productName: "Vetmec Dual", productType: "Thú y", whpDays: 0, esiDays: 0, description: "Thuốc tẩy ký sinh cho cừu", unitCount: 10000, volumePerUnit: 1, volumeUnit: "mL", totalVolume: 10000, unitCost: 0.45, totalCost: 4500, batchNumber: "VD2023-03", supplier: "Silmac", storageLocation: "Silmac", purchaseDate: "2023-03-15", manufactureDate: "2023-02-15", expiryDate: "2024-03-15" },
  { alias: "LV", productName: "Vetmec LV", productType: "Thú y", whpDays: 0, esiDays: 0, description: "Thuốc tẩy ký sinh cho cừu", unitCount: 10000, volumePerUnit: 1, volumeUnit: "mL", totalVolume: 10000, unitCost: 0.4, totalCost: 4000, batchNumber: "LV2023-04", supplier: "Silmac", storageLocation: "Silmac", purchaseDate: "2023-04-01", manufactureDate: "2023-03-01", expiryDate: "2024-04-01" },
  { alias: "Cydectin Drench", productName: "Cydectin", productType: "Thú y", whpDays: 0, esiDays: 0, description: "Thuốc tẩy ký sinh nội cho cừu", unitCount: 1, volumePerUnit: 5, volumeUnit: "L", totalVolume: 5, unitCost: 239, totalCost: 239, batchNumber: "dsfqew3", supplier: "Norco", storageLocation: "Kho", purchaseDate: "2021-11-03", manufactureDate: "2021-10-03", expiryDate: "2022-12-22" },
  { alias: "Roundup", productName: "Glyophospahte", productType: "Nông nghiệp", whpDays: 0, esiDays: null, description: "Thuốc diệt cỏ phổ rộng", unitCount: 1, volumePerUnit: 5, volumeUnit: "L", totalVolume: 5, unitCost: 46.6, totalCost: 233, batchNumber: "RG2023-01", supplier: "Norco", storageLocation: "Kho hóa chất", purchaseDate: "2023-01-15", manufactureDate: "2023-01-01", expiryDate: "2024-12-31" },
  { alias: "5 in 1", productName: "Ultra vac 5 in 1", productType: "Thú y", whpDays: 0, esiDays: 0, description: "Vắc xin 5 trong 1 cho cừu", unitCount: 2, volumePerUnit: 50, volumeUnit: "mL", totalVolume: 100, unitCost: 35, totalCost: 70, batchNumber: "15704", supplier: "Norco", storageLocation: "Kho", purchaseDate: "2022-02-10", manufactureDate: "2022-01-10", expiryDate: "2024-08-08" },
];

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

function dateTime(value: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function zoneHasChemical(row: ChemicalZoneRow) {
  const values = [
    ...(row.nhom_luu_tru_kho ?? []),
    ...(Array.isArray(row.hinh_hoc_geojson?.metadata?.warehouseTypes) ? row.hinh_hoc_geojson?.metadata?.warehouseTypes ?? [] : []),
    ...(Array.isArray(row.hinh_hoc_geojson?.metadata?.extra?.warehouseTypes) ? row.hinh_hoc_geojson?.metadata?.extra?.warehouseTypes ?? [] : []),
  ].map((item) => String(item));
  return values.length === 0 || values.includes("hoa_chat");
}

function polygonFromGeojson(value: ChemicalZoneRow["hinh_hoc_geojson"]) {
  const polygon = value?.geo?.polygon;
  if (!Array.isArray(polygon)) return [];
  return polygon
    .filter((point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)))
    .map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }));
}

async function loadChemicalZones(farmId: string): Promise<ChemicalZone[]> {
  const result = await db.query<ChemicalZoneRow>(
    `select id::text, ma_khu_vuc, ten_khu_vuc, trang_thai, dien_tich_ha, mau_sac, nhom_luu_tru_kho, hinh_hoc_geojson
     from du_lieu.khu_vuc
     where trang_trai_id = $1
       and coalesce(lower(trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
       and (
         lower(coalesce(loai_khu_vuc, '')) = 'storage'
         or lower(coalesce(hinh_hoc_geojson->'metadata'->>'kind', '')) = 'storage'
         or lower(coalesce(mo_ta, '')) like '%kho%'
       )
     order by ten_khu_vuc asc, created_at asc`,
    [farmId]
  );

  return result.rows.filter(zoneHasChemical).map((row) => ({
    id: row.id,
    code: row.ma_khu_vuc ?? null,
    name: row.ten_khu_vuc ?? "Khu vực hóa chất",
    status: row.trang_thai ?? null,
    areaHa: row.dien_tich_ha == null ? null : Number(row.dien_tich_ha),
    color: row.mau_sac ?? "#dc2626",
    warehouseTypes: ["hoa_chat"],
    polygon: polygonFromGeojson(row.hinh_hoc_geojson),
  }));
}

async function seedChemicalSamples(farmId: string, zones: WarehouseZone[]) {
  const countRs = await db.query<{ count: string }>(
    `select count(*)::text as count from du_lieu.kho_vat_tu where trang_trai_id = $1 and loai_kho = 'hoa_chat'`,
    [farmId]
  );
  if (Number(countRs.rows[0]?.count ?? 0) > 0) return;

  const zone = zones.find((item) => item.warehouseTypes.includes("hoa_chat")) ?? zones[0] ?? null;
  if (!zone) return;

  for (const item of CHEMICAL_SAMPLE_PRODUCTS) {
    const metadata = { nguon_mau: "chemical-products.csv" };
    await db.query(
      `insert into du_lieu.kho_vat_tu (
         trang_trai_id, khu_vuc_id, ma_vat_tu, ten_vat_tu, loai_kho, nhom_hang, so_luong, don_vi,
         nguong_toi_thieu, vi_tri_luu_tru, trang_thai, ngay_nhap, han_su_dung, nha_cung_cap,
         gia_tri_uoc_tinh, ghi_chu, ten_rut_gon, phan_loai_san_pham, whp_ngay, esi_ngay,
         mo_ta_san_pham, so_don_vi, dung_tich_moi_don_vi, don_vi_dung_tich, tong_dung_tich,
         don_gia, tong_chi_phi, so_lo, ngay_mua, ngay_san_xuat, metadata_json
       )
       values (
         $1,$2::uuid,$3,$4,'hoa_chat',$5,$6,$7,0,$8,'binh_thuong',$9,$10,$11,
         $12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28::jsonb
       )
       on conflict (trang_trai_id, ma_vat_tu) do nothing`,
      [
        farmId,
        zone.id,
        `HC-${item.batchNumber}`,
        item.productName,
        item.productType,
        item.totalVolume,
        item.volumeUnit,
        item.storageLocation,
        item.purchaseDate,
        item.expiryDate,
        item.supplier,
        item.totalCost,
        item.description,
        item.alias,
        item.productType,
        item.whpDays,
        item.esiDays,
        item.description,
        item.unitCount,
        item.volumePerUnit,
        item.volumeUnit,
        item.totalVolume,
        item.unitCost,
        item.totalCost,
        item.batchNumber,
        item.purchaseDate,
        item.manufactureDate,
        JSON.stringify(metadata),
      ]
    );
  }
}

async function loadChemicalUsageLogs(farmId: string): Promise<ChemicalUsageLog[]> {
  const result = await db.query<UsageLogRow>(
    `select gd.id::text, gd.kho_vat_tu_id::text, kv.ten_vat_tu, kv.ma_vat_tu, gd.loai_giao_dich,
            gd.nguon_nghiep_vu, gd.so_luong, gd.so_luong_truoc, gd.so_luong_sau, gd.don_vi,
            gd.ghi_chu, gd.created_at
     from du_lieu.kho_vat_tu_giao_dich gd
     join du_lieu.kho_vat_tu kv on kv.id = gd.kho_vat_tu_id
     where gd.trang_trai_id = $1 and kv.loai_kho = 'hoa_chat'
     order by gd.created_at desc
     limit 40`,
    [farmId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    itemId: row.kho_vat_tu_id,
    itemName: row.ten_vat_tu ?? "Hóa chất",
    itemCode: row.ma_vat_tu ?? "",
    actionType: row.loai_giao_dich ?? "su_dung",
    source: row.nguon_nghiep_vu,
    quantity: numberValue(row.so_luong),
    beforeQuantity: nullableNumber(row.so_luong_truoc),
    afterQuantity: nullableNumber(row.so_luong_sau),
    unit: row.don_vi,
    note: row.ghi_chu,
    createdAt: dateTime(row.created_at),
  }));
}

export async function loadChemicalProfile(farmId: string): Promise<ChemicalProfile> {
  await ensureWarehouseSchema();

  const warehouseZones = await loadWarehouseZones(farmId);
  await seedChemicalSamples(farmId, warehouseZones);

  const [items, usageLogs, zones] = await Promise.all([
    loadWarehouseItems(farmId),
    loadChemicalUsageLogs(farmId),
    loadChemicalZones(farmId),
  ]);

  return {
    products: items.filter((item) => item.type === "hoa_chat" && item.status !== "da_huy"),
    usageLogs,
    zones,
  };
}
