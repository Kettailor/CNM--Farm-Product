export const WAREHOUSE_TYPE_VALUES = [
  "cong_cu",
  "hoa_chat",
  "thuc_an",
  "thanh_pham_vat_nuoi",
] as const;

export type WarehouseType = (typeof WAREHOUSE_TYPE_VALUES)[number];

export const WAREHOUSE_STATUS_VALUES = [
  "binh_thuong",
  "sap_het",
  "can_kiem_tra",
  "het_han",
  "ngung_su_dung",
  "da_huy",
] as const;

export type WarehouseStatus = (typeof WAREHOUSE_STATUS_VALUES)[number];

export type WarehouseMetadata = Record<string, string | number | null>;

export type WarehouseZone = {
  id: string;
  code: string | null;
  name: string;
  status: string | null;
  areaHa: number | null;
  color: string | null;
  warehouseTypes: WarehouseType[];
};

export type WarehouseItem = {
  id: string;
  code: string;
  name: string;
  zoneId: string | null;
  zoneName: string | null;
  zoneCode: string | null;
  type: WarehouseType;
  group: string | null;
  quantity: number;
  unit: string;
  minimumQuantity: number;
  location: string | null;
  status: WarehouseStatus;
  receivedDate: string | null;
  expiryDate: string | null;
  supplier: string | null;
  manager: string | null;
  estimatedValue: number | null;
  note: string | null;
  metadata: WarehouseMetadata;
  chemicalAlias: string | null;
  chemicalProductType: string | null;
  whpDays: number | null;
  esiDays: number | null;
  productDescription: string | null;
  unitCount: number | null;
  volumePerUnit: number | null;
  volumeUnit: string | null;
  totalVolume: number | null;
  unitCost: number | null;
  totalCost: number | null;
  batchNumber: string | null;
  purchaseDate: string | null;
  manufactureDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export const WAREHOUSE_TYPE_OPTIONS: Array<{
  value: WarehouseType;
  label: string;
  shortLabel: string;
  purpose: string;
  defaultUnit: string;
  accent: string;
}> = [
  {
    value: "cong_cu",
    label: "Kho công cụ nông trại",
    shortLabel: "Công cụ",
    purpose: "Lưu trữ công cụ phục vụ nông trại",
    defaultUnit: "cái",
    accent: "#2563eb",
  },
  {
    value: "hoa_chat",
    label: "Kho hóa chất",
    shortLabel: "Hóa chất",
    purpose: "Lưu trữ hóa chất cho nông trại",
    defaultUnit: "lít",
    accent: "#dc2626",
  },
  {
    value: "thuc_an",
    label: "Kho thức ăn vật nuôi",
    shortLabel: "Thức ăn",
    purpose: "Lưu trữ thức ăn cho vật nuôi",
    defaultUnit: "kg",
    accent: "#d97706",
  },
  {
    value: "thanh_pham_vat_nuoi",
    label: "Kho thành phẩm vật nuôi",
    shortLabel: "Thành phẩm",
    purpose: "Lưu trữ thành phẩm vật nuôi",
    defaultUnit: "kg",
    accent: "#0f766e",
  },
];

export const WAREHOUSE_STATUS_LABELS: Record<WarehouseStatus, string> = {
  binh_thuong: "Bình thường",
  sap_het: "Sắp hết",
  can_kiem_tra: "Cần kiểm tra",
  het_han: "Hết hạn",
  ngung_su_dung: "Ngừng sử dụng",
  da_huy: "Đã hủy",
};

export function isWarehouseType(value: unknown): value is WarehouseType {
  return WAREHOUSE_TYPE_VALUES.includes(value as WarehouseType);
}

export function isWarehouseStatus(value: unknown): value is WarehouseStatus {
  return WAREHOUSE_STATUS_VALUES.includes(value as WarehouseStatus);
}

export function normalizeWarehouseTypeList(value: unknown, fallback: WarehouseType[] = []): WarehouseType[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const normalized = values.filter(isWarehouseType);
  return normalized.length > 0 ? Array.from(new Set(normalized)) : fallback;
}

export function getWarehouseTypeOption(type: WarehouseType) {
  return WAREHOUSE_TYPE_OPTIONS.find((item) => item.value === type) ?? WAREHOUSE_TYPE_OPTIONS[0];
}
