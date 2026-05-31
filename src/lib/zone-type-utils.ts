export type ZoneTypeKey = "parking" | "storage" | "cropping" | "livestock" | "grazing" | "water";

export type ZoneTypeInfo = {
  key: ZoneTypeKey;
  slug: string;
  label: string;
  detailTitle: string;
  isVegetationRelevant: boolean;
};

export type ZoneTypeFieldConfig = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number";
  step?: string;
};

export type ZoneTypeFormConfig = {
  title: string;
  subtitle: string;
  fields: ZoneTypeFieldConfig[];
};

export const ZONE_TYPE_INFO: Record<ZoneTypeKey, ZoneTypeInfo> = {
  parking: {
    key: "parking",
    slug: "bai-do-xe",
    label: "Bãi đỗ xe",
    detailTitle: "Thông tin bãi đỗ xe",
    isVegetationRelevant: false,
  },
  storage: {
    key: "storage",
    slug: "kho",
    label: "Kho",
    detailTitle: "Thông tin kho lưu trữ",
    isVegetationRelevant: false,
  },
  cropping: {
    key: "cropping",
    slug: "trong-trot",
    label: "Trồng trọt",
    detailTitle: "Thông tin trồng trọt",
    isVegetationRelevant: true,
  },
  livestock: {
    key: "livestock",
    slug: "chan-nuoi",
    label: "Chăn nuôi",
    detailTitle: "Thông tin chăn nuôi",
    isVegetationRelevant: false,
  },
  grazing: {
    key: "grazing",
    slug: "dong-co",
    label: "Đồng cỏ",
    detailTitle: "Thông tin đồng cỏ chăn thả",
    isVegetationRelevant: false,
  },
  water: {
    key: "water",
    slug: "nguon-nuoc",
    label: "Nguồn nước",
    detailTitle: "Thông tin nguồn nước",
    isVegetationRelevant: false,
  },
};

export const ZONE_TYPE_OPTIONS: Array<{ value: ZoneTypeKey; label: string }> = [
  { value: "parking", label: ZONE_TYPE_INFO.parking.label },
  { value: "storage", label: ZONE_TYPE_INFO.storage.label },
  { value: "cropping", label: ZONE_TYPE_INFO.cropping.label },
  { value: "livestock", label: ZONE_TYPE_INFO.livestock.label },
  { value: "grazing", label: ZONE_TYPE_INFO.grazing.label },
  { value: "water", label: ZONE_TYPE_INFO.water.label },
];

export const ZONE_TYPE_FORM_CONFIGS: Record<ZoneTypeKey, ZoneTypeFormConfig> = {
  parking: {
    title: "Thông tin bãi đỗ xe",
    subtitle: "Dùng để quản lý khu vực đỗ xe, máy móc và tuyến ra vào.",
    fields: [
      { key: "parkingType", label: "Loại phương tiện", type: "text", placeholder: "Ví dụ: xe tải, máy kéo, xe nâng" },
      { key: "capacity", label: "Sức chứa", type: "number", step: "0.01", placeholder: "Nhập sức chứa" },
      { key: "surface", label: "Bề mặt", type: "text", placeholder: "Ví dụ: bê tông, đất nền, mái che" },
      { key: "accessRoute", label: "Tuyến ra vào", type: "text", placeholder: "Ví dụ: cổng đông, đường nội bộ số 2" },
      { key: "maintenanceNote", label: "Ghi chú vận hành", type: "text", placeholder: "Ghi chú thêm" },
    ],
  },
  storage: {
    title: "Thông tin kho lưu trữ",
    subtitle: "Dùng để quản lý khu vực lưu trữ và các nhóm vật tư được phép đặt trong kho.",
    fields: [
      { key: "capacity", label: "Sức chứa", type: "number", step: "0.01", placeholder: "Nhập sức chứa" },
      { key: "temperature", label: "Nhiệt độ vận hành (°C)", type: "number", step: "0.01", placeholder: "Nhập nhiệt độ" },
      { key: "humidityTarget", label: "Độ ẩm mục tiêu (%)", type: "number", step: "0.01", placeholder: "Nhập độ ẩm mục tiêu" },
      { key: "storageCondition", label: "Điều kiện bảo quản", type: "text", placeholder: "Ví dụ: khô ráo, tránh nắng, thông gió" },
      { key: "notes", label: "Ghi chú kho", type: "text", placeholder: "Ghi chú thêm" },
    ],
  },
  cropping: {
    title: "Thông tin trồng trọt",
    subtitle: "Dùng cho module trồng trọt, cây trồng và điều kiện canh tác sau này.",
    fields: [
      { key: "cropType", label: "Cây trồng", type: "text", placeholder: "Ví dụ: lúa, ngô, rau" },
      { key: "cropVariety", label: "Giống / nhóm cây", type: "text", placeholder: "Ví dụ: ST25, bắp lai, rau ăn lá" },
      { key: "plantingStage", label: "Giai đoạn canh tác", type: "text", placeholder: "Ví dụ: gieo sạ, sinh trưởng, thu hoạch" },
      { key: "soilPh", label: "pH đất", type: "number", step: "0.01", placeholder: "Nhập pH đất" },
      { key: "soilMoisture", label: "Độ ẩm đất (%)", type: "number", step: "0.01", placeholder: "Nhập độ ẩm đất" },
      { key: "irrigationMethod", label: "Hình thức tưới", type: "text", placeholder: "Ví dụ: nhỏ giọt, phun mưa, thủ công" },
      { key: "sunHours", label: "Số giờ nắng", type: "number", step: "0.01", placeholder: "Nhập số giờ nắng" },
    ],
  },
  livestock: {
    title: "Thông tin chăn nuôi",
    subtitle: "Dùng cho module vật nuôi, chuồng trại và sức chứa đàn.",
    fields: [
      { key: "livestockType", label: "Loại vật nuôi", type: "text", placeholder: "Ví dụ: bò sữa, heo thịt, gà đẻ" },
      { key: "herdCapacity", label: "Sức chứa đàn", type: "number", step: "1", placeholder: "Nhập số con tối đa" },
      { key: "housingType", label: "Kiểu chuồng / ô nuôi", type: "text", placeholder: "Ví dụ: chuồng kín, bán chăn thả, ô cách ly" },
      { key: "biosecurityLevel", label: "Mức an toàn sinh học", type: "text", placeholder: "Ví dụ: thường, kiểm soát, cách ly" },
      { key: "feedPlan", label: "Kế hoạch thức ăn", type: "text", placeholder: "Ví dụ: TMR, cám viên, thức ăn xanh" },
      { key: "wastePlan", label: "Xử lý chất thải", type: "text", placeholder: "Ví dụ: hầm biogas, ủ phân, thu gom định kỳ" },
    ],
  },
  grazing: {
    title: "Thông tin đồng cỏ",
    subtitle: "Dùng cho module vật nuôi theo kiểu chăn thả và sức tải đồng cỏ.",
    fields: [
      { key: "pastureType", label: "Loại cỏ / thảm phủ", type: "text", placeholder: "Ví dụ: cỏ voi, cỏ ruzi, cỏ tự nhiên" },
      { key: "pastureState", label: "Trạng thái cỏ", type: "text", placeholder: "Ví dụ: tốt, cần phục hồi, mới cắt" },
      { key: "daysEmpty", label: "Số ngày nghỉ cỏ", type: "number", placeholder: "Nhập số ngày nghỉ cỏ" },
      { key: "dseLoad", label: "DSE Load", type: "number", step: "0.01", placeholder: "Nhập DSE Load" },
      { key: "stockingRate", label: "Tỷ lệ chăn thả", type: "number", step: "0.01", placeholder: "Nhập tỷ lệ chăn thả" },
      { key: "feedOnOffer", label: "Thức ăn sẵn có (kg DM/ha)", type: "number", step: "0.01", placeholder: "Nhập lượng thức ăn" },
      { key: "grazingDaysRemaining", label: "Số ngày chăn thả còn lại", type: "number", placeholder: "Nhập số ngày còn lại" },
      { key: "pastureGrowthRate", label: "Tốc độ mọc cỏ", type: "number", step: "0.01", placeholder: "Nhập tốc độ mọc cỏ" },
    ],
  },
  water: {
    title: "Thông tin nguồn nước",
    subtitle: "Ghi nhận nguồn nước thuộc khu vực để biết đặc điểm, chất lượng và mục đích sử dụng; không quản lý như một module riêng.",
    fields: [
      { key: "waterSourceType", label: "Loại nguồn nước", type: "text", placeholder: "Ví dụ: ao, hồ, giếng, kênh, bể chứa" },
      { key: "waterQuality", label: "Chất lượng nước", type: "text", placeholder: "Ví dụ: tốt, cần lọc, nhiễm phèn, cần kiểm tra" },
      { key: "waterLevel", label: "Mực nước", type: "text", placeholder: "Ví dụ: đầy, trung bình, thấp, theo mùa" },
      { key: "usagePurpose", label: "Mục đích sử dụng", type: "text", placeholder: "Ví dụ: tưới tiêu, chăn nuôi, dự phòng PCCC" },
      { key: "maintenanceNote", label: "Ghi chú theo dõi", type: "text", placeholder: "Ghi chú thêm nếu cần" },
    ],
  },
};

const WAREHOUSE_TYPE_LABELS: Record<string, string> = {
  cong_cu: "Công cụ",
  hoa_chat: "Hóa chất",
  thuc_an: "Thức ăn",
  thanh_pham_vat_nuoi: "Thành phẩm vật nuôi",
};

export function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[_-]+/g, " ")
    .trim();
}

export function normalizeWarehouseTypeValues(value: unknown): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,\s;|]+/)
      : [];

  return Array.from(
    new Set(
      rawValues
        .map((item) => String(item ?? "").trim())
        .filter((item) => item.length > 0)
    )
  );
}

export function warehouseLabelFromTypes(value: unknown) {
  const warehouseTypes = normalizeWarehouseTypeValues(value);
  if (warehouseTypes.length === 1) return WAREHOUSE_TYPE_LABELS[warehouseTypes[0]] ?? ZONE_TYPE_INFO.storage.label;
  if (warehouseTypes.length > 1) return "Kho tổng hợp";
  return ZONE_TYPE_INFO.storage.label;
}

export function getZoneTypeInfo(rawType: unknown, warehouseTypes?: unknown): ZoneTypeInfo {
  const value = normalizeText(rawType);

  if (value.includes("parking") || value.includes("bai do xe") || value.includes("phuong tien") || value.includes("vehicle")) return ZONE_TYPE_INFO.parking;
  if (value.includes("storage") || value.includes("warehouse") || value.includes("nha kho") || value.includes("kho") || value.includes("dung cu") || value.includes("cong cu") || value.includes("tool")) return ZONE_TYPE_INFO.storage;
  if (value.includes("livestock") || value.includes("chan nuoi") || value.includes("vat nuoi") || value.includes("cattle")) return ZONE_TYPE_INFO.livestock;
  if (value.includes("pasture") || value.includes("grazing") || value.includes("dong co") || value.includes("chan tha") || value.includes("hay") || value.includes("co kho")) return ZONE_TYPE_INFO.grazing;
  if (value.includes("water") || value.includes("nguon nuoc") || value.includes("nguon_nuoc")) return ZONE_TYPE_INFO.water;
  if (value.includes("cropping") || value.includes("trong trot") || value.includes("cay trong") || value.includes("resting") || value.includes("nghi dat")) return ZONE_TYPE_INFO.cropping;

  const parsedWarehouseTypes = normalizeWarehouseTypeValues(warehouseTypes);
  if (parsedWarehouseTypes.length > 0) return ZONE_TYPE_INFO.storage;

  return ZONE_TYPE_INFO.cropping;
}
