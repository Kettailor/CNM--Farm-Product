export const GRAZING_PLAN_TYPE_VALUES = ["perpetual", "seasonal", "off_season"] as const;
export type GrazingPlanType = (typeof GRAZING_PLAN_TYPE_VALUES)[number];

export const GRAZING_STATUS_VALUES = ["active", "future", "completed", "paused", "da_huy"] as const;
export type GrazingStatus = (typeof GRAZING_STATUS_VALUES)[number];

export const GRAZING_EVENT_TYPE_VALUES = [
  "grazing",
  "resting",
  "burning",
  "clipping",
  "compacting",
  "cultivating",
  "cutting",
  "deferred",
  "feeding",
  "fertilising",
  "grooming",
  "harrowing",
  "harvesting",
  "hoeing",
  "levelling",
  "maintenance",
  "mowing",
  "move",
  "other",
  "pest_management",
  "plowing",
  "repairing",
  "reseeding",
  "rolling",
  "scarifying",
  "seeding",
  "smoothing",
  "soil_testing",
  "sowing",
  "spell_grazing",
  "spraying",
  "subsoiling",
  "tilling",
  "thinning",
  "top_cutting",
  "weeding",
  "watering",
  "withholding",
] as const;
export type GrazingEventType = (typeof GRAZING_EVENT_TYPE_VALUES)[number];

export type GrazingMetadata = Record<string, string | number | boolean | null>;

export type GrazingPaddock = {
  id: string;
  code: string | null;
  name: string;
  zoneType: string | null;
  zoneTypeLabel: string;
  status: string | null;
  areaHa: number | null;
  priority: number;
  rating: number;
};

export type GrazingLivestockGroup = {
  id: string;
  code: string | null;
  name: string;
  species: string;
  headCount: number;
  zoneId: string | null;
  zoneName: string | null;
};

export type GrazingEvent = {
  id: string;
  planId: string;
  paddockId: string | null;
  paddockName: string | null;
  groupId: string | null;
  groupName: string | null;
  type: GrazingEventType;
  title: string;
  status: GrazingStatus;
  startDate: string | null;
  endDate: string | null;
  note: string | null;
};

export type GrazingPlan = {
  id: string;
  code: string;
  name: string;
  type: GrazingPlanType;
  status: GrazingStatus;
  startDate: string | null;
  endDate: string | null;
  season: string | null;
  manager: string | null;
  note: string | null;
  paddocks: GrazingPaddock[];
  groups: GrazingLivestockGroup[];
  events: GrazingEvent[];
  metadata: GrazingMetadata;
  createdAt: string | null;
  updatedAt: string | null;
};

export const GRAZING_PLAN_TYPE_OPTIONS: Array<{
  value: GrazingPlanType;
  label: string;
  shortLabel: string;
  accent: string;
}> = [
  { value: "perpetual", label: "Kế hoạch vĩnh viễn", shortLabel: "Vĩnh viễn", accent: "#d99a00" },
  { value: "seasonal", label: "Theo mùa vụ", shortLabel: "Mùa vụ", accent: "#67a832" },
  { value: "off_season", label: "Trái mùa", shortLabel: "Trái mùa", accent: "#795548" },
];

export const GRAZING_STATUS_LABELS: Record<GrazingStatus, string> = {
  active: "Đang hoạt động",
  future: "Sắp tới",
  completed: "Hoàn tất",
  paused: "Tạm dừng",
  da_huy: "Đã hủy",
};

export const GRAZING_EVENT_TYPE_LABELS: Record<GrazingEventType, string> = {
  grazing: "Chăn thả",
  resting: "Nghỉ cỏ",
  burning: "Đốt cỏ",
  clipping: "Cắt tỉa",
  compacting: "Nén đất",
  cultivating: "Canh tác",
  cutting: "Cắt",
  deferred: "Tạm hoãn",
  feeding: "Cho ăn",
  fertilising: "Bón phân",
  grooming: "Chăm sóc",
  harrowing: "Bừa đất",
  harvesting: "Thu hoạch",
  hoeing: "Cuốc cỏ",
  levelling: "San phẳng",
  maintenance: "Bảo trì",
  mowing: "Cắt cỏ",
  move: "Di chuyển đàn",
  other: "Khác",
  pest_management: "Quản lý sâu bệnh",
  plowing: "Cày đất",
  repairing: "Sửa chữa",
  reseeding: "Gieo lại",
  rolling: "Lăn đất",
  scarifying: "Xới thoáng",
  seeding: "Gieo hạt",
  smoothing: "Làm mịn mặt đất",
  soil_testing: "Kiểm tra đất",
  sowing: "Gieo cỏ",
  spell_grazing: "Chăn thả luân phiên",
  spraying: "Phun xịt",
  subsoiling: "Cày sâu",
  tilling: "Làm đất",
  thinning: "Tỉa thưa",
  top_cutting: "Cắt ngọn",
  weeding: "Làm cỏ",
  watering: "Tưới nước",
  withholding: "Tạm giữ",
};

export function isGrazingPlanType(value: unknown): value is GrazingPlanType {
  return GRAZING_PLAN_TYPE_VALUES.includes(value as GrazingPlanType);
}

export function isGrazingStatus(value: unknown): value is GrazingStatus {
  return GRAZING_STATUS_VALUES.includes(value as GrazingStatus);
}

export function isGrazingEventType(value: unknown): value is GrazingEventType {
  return GRAZING_EVENT_TYPE_VALUES.includes(value as GrazingEventType);
}

export function getGrazingPlanTypeOption(type: GrazingPlanType) {
  return GRAZING_PLAN_TYPE_OPTIONS.find((item) => item.value === type) ?? GRAZING_PLAN_TYPE_OPTIONS[0];
}
