import type { WarehouseType } from "@/lib/warehouse-types";

export const LIVESTOCK_TREATMENT_TYPE_VALUES = [
  "footrot",
  "vaccination",
  "supplement",
  "dehorn",
  "parasite",
  "dry_off",
  "custom",
] as const;

export type LivestockTreatmentType = (typeof LIVESTOCK_TREATMENT_TYPE_VALUES)[number];

export type LivestockTreatmentMetadataField = {
  key: string;
  label: string;
  placeholder?: string;
  inputType?: "text" | "number" | "date" | "select";
  options?: string[];
};

export type LivestockTreatmentTypeOption = {
  value: LivestockTreatmentType;
  label: string;
  shortLabel: string;
  purpose: string;
  defaultDoseUnit: string;
  defaultMethod: string;
  allowedWarehouseTypes: WarehouseType[];
  fields: LivestockTreatmentMetadataField[];
};

const ALL_TREATMENT_WAREHOUSE_TYPES: WarehouseType[] = ["hoa_chat", "thuc_an", "cong_cu"];

export const LIVESTOCK_TREATMENT_TYPE_OPTIONS: LivestockTreatmentTypeOption[] = [
  {
    value: "footrot",
    label: "Điều trị thối móng",
    shortLabel: "Thối móng",
    purpose: "Sát trùng, ngâm chân hoặc dùng thuốc cho bệnh thối móng.",
    defaultDoseUnit: "ml/con",
    defaultMethod: "Ngâm chân / bôi tại chỗ",
    allowedWarehouseTypes: ["hoa_chat"],
    fields: [
      { key: "affectedLeg", label: "Chân bị ảnh hưởng", placeholder: "Trước trái, sau phải..." },
      { key: "severity", label: "Mức độ", inputType: "select", options: ["Nhẹ", "Trung bình", "Nặng"] },
      { key: "repeatAfterDays", label: "Lặp lại sau (ngày)", inputType: "number" },
    ],
  },
  {
    value: "vaccination",
    label: "Tiêm phòng",
    shortLabel: "Tiêm phòng",
    purpose: "Ghi nhận vaccine, mũi nhắc và thời gian ngưng sử dụng sản phẩm.",
    defaultDoseUnit: "ml/con",
    defaultMethod: "Tiêm",
    allowedWarehouseTypes: ["hoa_chat"],
    fields: [
      { key: "diseaseTarget", label: "Bệnh phòng", placeholder: "Lở mồm long móng, tụ huyết trùng..." },
      { key: "injectionRoute", label: "Đường tiêm", inputType: "select", options: ["Dưới da", "Bắp", "Uống", "Nhỏ mắt/mũi"] },
      { key: "boosterDate", label: "Ngày nhắc lại", inputType: "date" },
    ],
  },
  {
    value: "supplement",
    label: "Bổ sung dinh dưỡng",
    shortLabel: "Bổ sung",
    purpose: "Bổ sung khoáng, vitamin, premix hoặc thức ăn chức năng.",
    defaultDoseUnit: "g/con",
    defaultMethod: "Trộn thức ăn / nước uống",
    allowedWarehouseTypes: ["thuc_an", "hoa_chat"],
    fields: [
      { key: "supplementGoal", label: "Mục tiêu bổ sung", placeholder: "Tăng sức đề kháng, phục hồi sau bệnh..." },
      { key: "feedingDays", label: "Số ngày dùng", inputType: "number" },
      { key: "mixingRate", label: "Tỷ lệ phối trộn", placeholder: "1 kg/tấn thức ăn..." },
    ],
  },
  {
    value: "dehorn",
    label: "Cắt sừng",
    shortLabel: "Cắt sừng",
    purpose: "Ghi nhận thuốc tê, sát trùng và chăm sóc sau cắt sừng.",
    defaultDoseUnit: "ml/con",
    defaultMethod: "Thủ thuật",
    allowedWarehouseTypes: ["hoa_chat", "cong_cu"],
    fields: [
      { key: "hornStage", label: "Tình trạng sừng", inputType: "select", options: ["Mầm sừng", "Sừng non", "Sừng trưởng thành"] },
      { key: "anaesthetic", label: "Gây tê/giảm đau", placeholder: "Tên thuốc hoặc phác đồ" },
      { key: "woundCare", label: "Chăm sóc vết thương", placeholder: "Sát trùng, xịt kháng khuẩn..." },
    ],
  },
  {
    value: "parasite",
    label: "Tẩy ký sinh",
    shortLabel: "Tẩy ký sinh",
    purpose: "Tẩy nội/ngoại ký sinh trùng và theo dõi lần lặp lại.",
    defaultDoseUnit: "ml/con",
    defaultMethod: "Uống / tiêm / pour-on",
    allowedWarehouseTypes: ["hoa_chat"],
    fields: [
      { key: "parasiteTarget", label: "Đối tượng ký sinh", inputType: "select", options: ["Nội ký sinh", "Ngoại ký sinh", "Cả hai"] },
      { key: "weightBasis", label: "Cơ sở liều", placeholder: "Theo kg thể trọng, theo đầu con..." },
      { key: "repeatAfterDays", label: "Lặp lại sau (ngày)", inputType: "number" },
    ],
  },
  {
    value: "dry_off",
    label: "Cạn sữa",
    shortLabel: "Cạn sữa",
    purpose: "Ghi nhận thuốc cạn sữa, bầu vú được xử lý và thời gian cách ly.",
    defaultDoseUnit: "tube/con",
    defaultMethod: "Bơm bầu vú",
    allowedWarehouseTypes: ["hoa_chat"],
    fields: [
      { key: "udderQuarter", label: "Bầu vú xử lý", inputType: "select", options: ["Tất cả", "Trước trái", "Trước phải", "Sau trái", "Sau phải"] },
      { key: "dryOffReason", label: "Lý do cạn sữa", placeholder: "Kết thúc chu kỳ, viêm vú..." },
      { key: "calvingDueDate", label: "Dự kiến sinh", inputType: "date" },
    ],
  },
  {
    value: "custom",
    label: "Phác đồ tùy chỉnh",
    shortLabel: "Tùy chỉnh",
    purpose: "Ghi nhận phác đồ riêng nhưng vẫn gắn với vật tư trong kho.",
    defaultDoseUnit: "đơn vị/con",
    defaultMethod: "Theo phác đồ",
    allowedWarehouseTypes: ALL_TREATMENT_WAREHOUSE_TYPES,
    fields: [
      { key: "customCategory", label: "Nhóm xử lý", placeholder: "Kháng sinh, sát trùng, chăm sóc..." },
      { key: "clinicalReason", label: "Lý do điều trị", placeholder: "Triệu chứng hoặc chẩn đoán" },
      { key: "reviewDate", label: "Ngày đánh giá lại", inputType: "date" },
    ],
  },
];

export const LIVESTOCK_TREATMENT_TYPE_LABELS = LIVESTOCK_TREATMENT_TYPE_OPTIONS.reduce(
  (result, option) => {
    result[option.value] = option.shortLabel;
    return result;
  },
  {} as Record<LivestockTreatmentType, string>
);

export function isLivestockTreatmentType(value: unknown): value is LivestockTreatmentType {
  return LIVESTOCK_TREATMENT_TYPE_VALUES.includes(value as LivestockTreatmentType);
}

export function getLivestockTreatmentTypeOption(type: LivestockTreatmentType) {
  return LIVESTOCK_TREATMENT_TYPE_OPTIONS.find((option) => option.value === type) ?? LIVESTOCK_TREATMENT_TYPE_OPTIONS[0];
}
