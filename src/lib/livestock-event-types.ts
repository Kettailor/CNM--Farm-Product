export type LivestockEventType =
  | "adjustment"
  | "reproduction"
  | "health"
  | "move"
  | "weight"
  | "grouping";

export type LivestockEventMetadataField = {
  key: string;
  label: string;
  inputType?: "text" | "number" | "date" | "select";
  placeholder?: string;
  options?: string[];
};

export type LivestockEventTypeOption = {
  value: LivestockEventType;
  label: string;
  shortLabel: string;
  purpose: string;
  defaultTitle: string;
  defaultUnit?: string;
  fields: LivestockEventMetadataField[];
};

export const LIVESTOCK_EVENT_TYPE_OPTIONS: LivestockEventTypeOption[] = [
  {
    value: "adjustment",
    label: "Điều chỉnh",
    shortLabel: "Điều chỉnh",
    purpose: "Ghi nhận thêm, loại bỏ, lưu trữ hoặc điều chỉnh số lượng cá thể.",
    defaultTitle: "Điều chỉnh đàn vật nuôi",
    fields: [],
  },
  {
    value: "reproduction",
    label: "Sinh sản",
    shortLabel: "Sinh sản",
    purpose: "Ghi phối giống, khám thai, sinh con và kết quả sinh sản.",
    defaultTitle: "Ghi nhận sinh sản",
    fields: [
      {
        key: "reproductionStage",
        label: "Nghiệp vụ",
        inputType: "select",
        options: ["Phối giống", "Khám thai", "Sinh con", "Kết quả sinh sản"],
      },
      { key: "sireDamNote", label: "Ghi chú bố/mẹ" },
      { key: "outcome", label: "Kết quả" },
    ],
  },
  {
    value: "health",
    label: "Sức khỏe",
    shortLabel: "Sức khỏe",
    purpose: "Ghi bệnh, chấn thương, triệu chứng, chẩn đoán và nhắc theo dõi.",
    defaultTitle: "Ghi nhận sức khỏe",
    fields: [],
  },
  {
    value: "move",
    label: "Di chuyển",
    shortLabel: "Di chuyển",
    purpose: "Ghi chuyển cá thể giữa chuồng, khu vực hoặc lô nuôi.",
    defaultTitle: "Di chuyển vật nuôi",
    fields: [],
  },
  {
    value: "weight",
    label: "Cân nặng",
    shortLabel: "Cân nặng",
    purpose: "Ghi cân nặng cá thể, tăng trọng và ghi chú thể trạng.",
    defaultTitle: "Ghi nhận cân nặng",
    defaultUnit: "kg",
    fields: [],
  },
  {
    value: "grouping",
    label: "Phân nhóm",
    shortLabel: "Phân nhóm",
    purpose: "Ghi tách, ghép hoặc sắp xếp lại cá thể giữa các nhóm.",
    defaultTitle: "Cập nhật phân nhóm",
    fields: [
      {
        key: "groupingAction",
        label: "Tác vụ",
        inputType: "select",
        options: ["Tách nhóm", "Ghép nhóm", "Sắp xếp lại", "Tạo nhóm mới"],
      },
      { key: "targetGroup", label: "Nhóm đích" },
    ],
  },
];

export function isLivestockEventType(value: unknown): value is LivestockEventType {
  return LIVESTOCK_EVENT_TYPE_OPTIONS.some((option) => option.value === value);
}

export function getLivestockEventTypeOption(value: LivestockEventType) {
  return LIVESTOCK_EVENT_TYPE_OPTIONS.find((option) => option.value === value) ?? LIVESTOCK_EVENT_TYPE_OPTIONS[0];
}
