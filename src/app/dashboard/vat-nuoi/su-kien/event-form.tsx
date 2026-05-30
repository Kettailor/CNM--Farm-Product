"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import jsQR from "jsqr";
import CowLoading from "@/components/cow-loading";
import type { LivestockEventRecord, LivestockEventZone } from "@/lib/livestock-event-data";
import {
  LIVESTOCK_EVENT_TYPE_OPTIONS,
  getLivestockEventTypeOption,
  type LivestockEventMetadataField,
  type LivestockEventType,
} from "@/lib/livestock-event-types";
import styles from "./page.module.css";

type AnimalOption = {
  id: string;
  code: string | null;
  qrCode: string | null;
  identity: string | null;
  status: string | null;
};

type MovementScope = "on_farm" | "off_farm";

type MovementType =
  | "move_group_to_new_paddock"
  | "entry_to_on_farm_location"
  | "between_on_farm_locations"
  | "exit_to_holding"
  | "temporary_agistment"
  | "transport_dispatch";

type MovementOption = {
  value: MovementType;
  label: string;
  scope: MovementScope;
  summary: string;
  defaultTitle: string;
  destinationLabel?: string;
};

type MovementMetadataField = {
  key: string;
  label: string;
  inputType?: "text" | "number" | "date" | "time" | "select" | "textarea";
  placeholder?: string;
  required?: boolean;
  options?: string[];
};

type AdjustmentType = "add_animals" | "archive_animals" | "archive_group" | "remove_animals";

type AdjustmentOption = {
  value: AdjustmentType;
  label: string;
  summary: string;
  defaultTitle: string;
  quantityLabel?: string;
  quantityRequired?: boolean;
};

type AdjustmentMetadataField = MovementMetadataField;

type HealthType =
  | "castration"
  | "shearing"
  | "hoof_trim"
  | "crutching"
  | "shoeing"
  | "misc_observation"
  | "general_measurement"
  | "condition_score"
  | "feeding"
  | "milk_production"
  | "veterinary_consultation"
  | "diagnosis_case_recorded"
  | "sample_collected"
  | "test_result_recorded"
  | "parasite_monitoring"
  | "other";

type HealthCategory = "procedures" | "observations" | "production" | "clinical" | "other";

type HealthOption = {
  value: HealthType;
  label: string;
  category: HealthCategory;
  summary: string;
  defaultTitle: string;
};

type HealthMetadataField = MovementMetadataField;

type WeightSource = "tape_estimate" | "digital_estimate" | "visual_estimate" | "carcass_weight";

type WeightSourceOption = {
  value: WeightSource;
  label: string;
  summary: string;
  defaultTitle: string;
  weightLabel: string;
};

type WeightMetadataField = MovementMetadataField;

type AnimalWeightMap = Record<string, string>;

type FormState = {
  type: LivestockEventType;
  title: string;
  selectedAnimalIds: string[];
  animalWeights: AnimalWeightMap;
  eventDate: string;
  sourceZoneId: string;
  destinationZoneId: string;
  numericValue: string;
  unit: string;
  performedBy: string;
  followUpDate: string;
  note: string;
  metadata: Record<string, string>;
};

type CameraConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string;
  exposureMode?: string;
  whiteBalanceMode?: string;
  zoom?: number;
};

const DEFAULT_MOVEMENT_TYPE: MovementType = "move_group_to_new_paddock";
const DEFAULT_ADJUSTMENT_TYPE: AdjustmentType = "add_animals";

const ON_FARM_MOVEMENT_TYPES: MovementType[] = [
  "move_group_to_new_paddock",
  "entry_to_on_farm_location",
  "between_on_farm_locations",
];

const MOVE_TYPE_OPTIONS: MovementOption[] = [
  {
    value: "move_group_to_new_paddock",
    label: "Chuyển nhóm sang khu/chuồng mới",
    scope: "on_farm",
    summary: "Chuyển các cá thể đã chọn trong nhóm sang khu hoặc chuồng mới trong trang trại.",
    defaultTitle: "Chuyển nhóm sang khu/chuồng mới",
    destinationLabel: "Khu/chuồng mới",
  },
  {
    value: "entry_to_on_farm_location",
    label: "Nhập vào vị trí trong trang trại",
    scope: "on_farm",
    summary: "Ghi nhận vật nuôi được đưa vào một vị trí cụ thể trong trang trại.",
    defaultTitle: "Nhập vật nuôi vào vị trí trong trang trại",
    destinationLabel: "Vị trí nhận trong trang trại",
  },
  {
    value: "between_on_farm_locations",
    label: "Di chuyển giữa các vị trí trong trang trại",
    scope: "on_farm",
    summary: "Theo dõi việc chuyển vật nuôi từ khu hiện tại sang khu khác trong cùng trang trại.",
    defaultTitle: "Di chuyển giữa các vị trí trong trang trại",
    destinationLabel: "Khu vực đích",
  },
  {
    value: "exit_to_holding",
    label: "Xuất sang cơ sở/mã đăng ký",
    scope: "off_farm",
    summary: "Ghi nhận vật nuôi rời trang trại để sang cơ sở, điểm giữ hoặc mã đăng ký khác.",
    defaultTitle: "Xuất vật nuôi sang cơ sở/mã đăng ký",
  },
  {
    value: "temporary_agistment",
    label: "Gửi nuôi/chăn thả tạm",
    scope: "off_farm",
    summary: "Ghi nhận vật nuôi được gửi nuôi, chăn thả hoặc lưu giữ tạm ở bên ngoài.",
    defaultTitle: "Gửi nuôi/chăn thả tạm",
  },
  {
    value: "transport_dispatch",
    label: "Vận chuyển/xuất lô",
    scope: "off_farm",
    summary: "Ghi nhận chuyến vận chuyển, điều phối hoặc xuất lô vật nuôi.",
    defaultTitle: "Vận chuyển/xuất lô vật nuôi",
  },
];

const MOVE_FIELD_CONFIG: Record<MovementType, MovementMetadataField[]> = {
  move_group_to_new_paddock: [
    { key: "movementReason", label: "Lý do di chuyển", placeholder: "Ví dụ: tách đàn, đổi khu chăn thả" },
    { key: "movementTime", label: "Giờ di chuyển", inputType: "time" },
    { key: "supervisor", label: "Người phụ trách" },
  ],
  entry_to_on_farm_location: [
    { key: "receivingNote", label: "Ghi chú tiếp nhận", inputType: "textarea" },
  ],
  between_on_farm_locations: [
    { key: "movementReason", label: "Lý do di chuyển", placeholder: "Ví dụ: đổi khu, tách nhóm, kiểm kê" },
    { key: "routeNote", label: "Lộ trình/đường đi" },
    { key: "consignment", label: "Mã lô/chuyến" },
  ],
  exit_to_holding: [
    { key: "destinationHolding", label: "Cơ sở/mã đăng ký nhận", required: true },
    { key: "destinationAddress", label: "Địa chỉ/điểm nhận" },
    {
      key: "exitReason",
      label: "Lý do xuất",
      inputType: "select",
      options: ["Bán", "Chuyển cơ sở", "Kiểm dịch", "Khác"],
    },
    { key: "consignment", label: "Mã lô/chuyến" },
  ],
  temporary_agistment: [
    { key: "agistmentLocation", label: "Nơi gửi nuôi/chăn thả tạm", required: true },
    { key: "agistmentOwner", label: "Người/đơn vị quản lý" },
    { key: "agistmentContact", label: "Liên hệ" },
    { key: "expectedReturnDate", label: "Ngày dự kiến quay lại", inputType: "date" },
    { key: "movementReason", label: "Lý do" },
  ],
  transport_dispatch: [
    { key: "dispatchDestination", label: "Điểm đến/lệnh điều phối", required: true },
    { key: "transporter", label: "Đơn vị vận chuyển" },
    { key: "vehiclePlate", label: "Biển số xe" },
    { key: "driverName", label: "Tài xế/người nhận" },
    { key: "consignment", label: "Mã chuyến/phiếu xuất" },
  ],
};

const ADJUSTMENT_TYPE_OPTIONS: AdjustmentOption[] = [
  {
    value: "add_animals",
    label: "Thêm vật nuôi",
    summary: "Ghi nhận cá thể mới được bổ sung vào nhóm đang chọn.",
    defaultTitle: "Thêm vật nuôi vào nhóm",
    quantityLabel: "Số lượng thêm",
    quantityRequired: true,
  },
  {
    value: "archive_animals",
    label: "Lưu trữ vật nuôi",
    summary: "Đưa các cá thể đã chọn vào trạng thái lưu trữ để vẫn giữ lịch sử theo dõi.",
    defaultTitle: "Lưu trữ vật nuôi",
  },
  {
    value: "archive_group",
    label: "Lưu trữ nhóm",
    summary: "Lưu trữ cả nhóm và toàn bộ cá thể trong nhóm, không xóa lịch sử đã ghi nhận.",
    defaultTitle: "Lưu trữ nhóm vật nuôi",
  },
  {
    value: "remove_animals",
    label: "Loại bỏ vật nuôi",
    summary: "Ghi nhận cá thể rời khỏi nhóm hoặc không còn được quản lý trong nhóm này.",
    defaultTitle: "Loại bỏ vật nuôi khỏi nhóm",
  },
];

const ADJUSTMENT_FIELD_CONFIG: Record<AdjustmentType, AdjustmentMetadataField[]> = {
  add_animals: [
    { key: "sourceNote", label: "Nguồn bổ sung", placeholder: "Ví dụ: mua mới, sinh sản, chuyển từ nhóm khác" },
    { key: "batchLot", label: "Mã lô/phiếu nhập" },
    { key: "reason", label: "Lý do", placeholder: "Ghi chú lý do điều chỉnh số lượng" },
  ],
  archive_animals: [
    {
      key: "archiveReason",
      label: "Lý do lưu trữ",
      inputType: "select",
      required: true,
      options: ["Đã bán", "Chết", "Mất tích", "Không còn theo dõi", "Khác"],
    },
    { key: "archiveReference", label: "Mã chứng từ/biên bản" },
    { key: "archiveNote", label: "Ghi chú lưu trữ", inputType: "textarea" },
  ],
  archive_group: [
    {
      key: "archiveGroupReason",
      label: "Lý do lưu trữ nhóm",
      inputType: "select",
      required: true,
      options: ["Kết thúc lứa nuôi", "Đã bán toàn bộ", "Chuyển sang nhóm khác", "Không còn sử dụng", "Khác"],
    },
    { key: "archiveReference", label: "Mã chứng từ/biên bản" },
    { key: "archiveNote", label: "Ghi chú lưu trữ nhóm", inputType: "textarea" },
  ],
  remove_animals: [
    {
      key: "removalReason",
      label: "Lý do loại bỏ",
      inputType: "select",
      required: true,
      options: ["Bán/loại thải", "Chết", "Hủy ghi nhận", "Chuyển nhầm nhóm", "Khác"],
    },
    { key: "removalReference", label: "Mã chứng từ/biên bản" },
    { key: "removalDestination", label: "Nơi đến/ghi chú xử lý" },
  ],
};

const HEALTH_CATEGORY_LABELS: Record<HealthCategory, string> = {
  procedures: "Thủ thuật & xử lý",
  observations: "Quan sát & đo lường",
  production: "Sản xuất",
  clinical: "Thú y & lâm sàng",
  other: "Khác",
};

const HEALTH_TYPE_OPTIONS: HealthOption[] = [
  {
    value: "castration",
    label: "Thiến",
    category: "procedures",
    summary: "Ghi nhận thủ thuật thiến, phương pháp, chăm sóc sau thủ thuật và nhắc theo dõi.",
    defaultTitle: "Thiến vật nuôi",
  },
  {
    value: "shearing",
    label: "Xén lông",
    category: "procedures",
    summary: "Ghi nhận lần xén lông, người thực hiện, khối lượng lông và tình trạng sau xén.",
    defaultTitle: "Xén lông vật nuôi",
  },
  {
    value: "hoof_trim",
    label: "Cắt móng",
    category: "procedures",
    summary: "Ghi nhận cắt móng, tình trạng móng, xử lý kèm theo và lịch kiểm tra lại.",
    defaultTitle: "Cắt móng vật nuôi",
  },
  {
    value: "crutching",
    label: "Cắt lông vùng sau",
    category: "procedures",
    summary: "Ghi nhận vệ sinh/cắt lông vùng sau để giảm bẩn, ký sinh hoặc chuẩn bị sinh sản.",
    defaultTitle: "Cắt lông vùng sau",
  },
  {
    value: "shoeing",
    label: "Đóng móng",
    category: "procedures",
    summary: "Ghi nhận đóng móng, loại móng, người thực hiện và lịch kiểm tra.",
    defaultTitle: "Đóng móng vật nuôi",
  },
  {
    value: "misc_observation",
    label: "Quan sát khác",
    category: "observations",
    summary: "Ghi nhận dấu hiệu, hành vi hoặc quan sát sức khỏe chưa thuộc nhóm cụ thể.",
    defaultTitle: "Quan sát sức khỏe",
  },
  {
    value: "general_measurement",
    label: "Đo lường chung",
    category: "observations",
    summary: "Ghi nhận chỉ số đo lường như nhiệt độ, nhịp thở, vòng ngực hoặc chỉ số tùy chọn.",
    defaultTitle: "Đo lường sức khỏe",
  },
  {
    value: "condition_score",
    label: "Điểm thể trạng",
    category: "observations",
    summary: "Ghi nhận điểm thể trạng và nhận xét tình trạng dinh dưỡng.",
    defaultTitle: "Chấm điểm thể trạng",
  },
  {
    value: "feeding",
    label: "Cho ăn",
    category: "production",
    summary: "Ghi nhận khẩu phần, loại thức ăn, phản ứng ăn và ghi chú sản xuất.",
    defaultTitle: "Ghi nhận cho ăn",
  },
  {
    value: "milk_production",
    label: "Sản lượng sữa",
    category: "production",
    summary: "Ghi nhận sản lượng sữa, ca vắt, chất lượng và bất thường nếu có.",
    defaultTitle: "Ghi nhận sản lượng sữa",
  },
  {
    value: "veterinary_consultation",
    label: "Tư vấn thú y",
    category: "clinical",
    summary: "Ghi nhận bác sĩ thú y, lý do tư vấn, khuyến nghị và kế hoạch theo dõi.",
    defaultTitle: "Tư vấn thú y",
  },
  {
    value: "diagnosis_case_recorded",
    label: "Ghi nhận ca chẩn đoán",
    category: "clinical",
    summary: "Ghi nhận triệu chứng, chẩn đoán, mức độ và xử lý đã thực hiện.",
    defaultTitle: "Ghi nhận ca chẩn đoán",
  },
  {
    value: "sample_collected",
    label: "Lấy mẫu",
    category: "clinical",
    summary: "Ghi nhận loại mẫu, mã mẫu, phòng xét nghiệm và vị trí lấy mẫu.",
    defaultTitle: "Lấy mẫu xét nghiệm",
  },
  {
    value: "test_result_recorded",
    label: "Ghi nhận kết quả xét nghiệm",
    category: "clinical",
    summary: "Ghi nhận tên xét nghiệm, kết quả, ngày trả kết quả và mã tham chiếu.",
    defaultTitle: "Ghi nhận kết quả xét nghiệm",
  },
  {
    value: "parasite_monitoring",
    label: "Theo dõi ký sinh trùng (WEC/FEC)",
    category: "clinical",
    summary: "Ghi nhận chỉ số WEC/FEC, kết quả ký sinh trùng và kế hoạch xử lý.",
    defaultTitle: "Theo dõi ký sinh trùng",
  },
  {
    value: "other",
    label: "Khác",
    category: "other",
    summary: "Ghi nhận sự kiện sức khỏe khác chưa có trong danh sách.",
    defaultTitle: "Ghi nhận sức khỏe khác",
  },
];

const HEALTH_FIELD_CONFIG: Record<HealthType, HealthMetadataField[]> = {
  castration: [
    { key: "procedureMethod", label: "Phương pháp", inputType: "select", options: ["Dây thun", "Phẫu thuật", "Kìm Burdizzo", "Khác"] },
    { key: "anaesthetic", label: "Gây tê/giảm đau" },
    { key: "aftercarePlan", label: "Chăm sóc sau thủ thuật", inputType: "textarea" },
  ],
  shearing: [
    { key: "operator", label: "Người xén lông" },
    { key: "fleeceWeight", label: "Khối lượng lông", inputType: "number", placeholder: "kg" },
    { key: "skinCondition", label: "Tình trạng da sau xén" },
  ],
  hoof_trim: [
    { key: "hoofCondition", label: "Tình trạng móng", inputType: "select", options: ["Bình thường", "Dài quá mức", "Nứt móng", "Viêm/đau", "Khác"] },
    { key: "treatmentGiven", label: "Xử lý kèm theo" },
    { key: "nextTrimDate", label: "Ngày kiểm tra/cắt lại", inputType: "date" },
  ],
  crutching: [
    { key: "procedureReason", label: "Lý do", inputType: "select", options: ["Vệ sinh", "Giảm ký sinh", "Chuẩn bị sinh sản", "Khác"] },
    { key: "operator", label: "Người thực hiện" },
    { key: "conditionNote", label: "Ghi chú tình trạng", inputType: "textarea" },
  ],
  shoeing: [
    { key: "farrier", label: "Người đóng móng" },
    { key: "shoeType", label: "Loại móng" },
    { key: "nextCheckDate", label: "Ngày kiểm tra lại", inputType: "date" },
  ],
  misc_observation: [
    { key: "observationType", label: "Loại quan sát" },
    { key: "observedSigns", label: "Dấu hiệu ghi nhận", inputType: "textarea", required: true },
    { key: "severity", label: "Mức độ", inputType: "select", options: ["Nhẹ", "Trung bình", "Nặng", "Cần theo dõi"] },
  ],
  general_measurement: [
    { key: "measurementName", label: "Chỉ số đo", required: true, placeholder: "Ví dụ: nhiệt độ, nhịp thở" },
    { key: "measurementValue", label: "Giá trị", inputType: "number" },
    { key: "measurementUnit", label: "Đơn vị", placeholder: "Ví dụ: °C, lần/phút" },
  ],
  condition_score: [
    { key: "conditionScore", label: "Điểm thể trạng", inputType: "select", required: true, options: ["1 - Rất gầy", "2 - Gầy", "3 - Bình thường", "4 - Béo", "5 - Quá béo"] },
    { key: "scoringMethod", label: "Thang/tiêu chuẩn chấm" },
    { key: "nutritionNote", label: "Nhận xét dinh dưỡng", inputType: "textarea" },
  ],
  feeding: [
    { key: "feedType", label: "Loại thức ăn" },
    { key: "ration", label: "Khẩu phần" },
    { key: "appetite", label: "Mức ăn", inputType: "select", options: ["Tốt", "Giảm ăn", "Bỏ ăn", "Ăn bất thường"] },
    { key: "feedResponse", label: "Phản ứng/ghi chú", inputType: "textarea" },
  ],
  milk_production: [
    { key: "milkVolume", label: "Sản lượng", inputType: "number", placeholder: "Lít" },
    { key: "milkingSession", label: "Ca vắt", inputType: "select", options: ["Sáng", "Chiều", "Tối", "Tổng ngày"] },
    { key: "milkQuality", label: "Chất lượng/bất thường" },
  ],
  veterinary_consultation: [
    { key: "veterinarian", label: "Bác sĩ thú y", required: true },
    { key: "consultationReason", label: "Lý do tư vấn", inputType: "textarea" },
    { key: "recommendation", label: "Khuyến nghị", inputType: "textarea" },
  ],
  diagnosis_case_recorded: [
    { key: "symptoms", label: "Triệu chứng", inputType: "textarea", required: true },
    { key: "diagnosis", label: "Chẩn đoán", required: true },
    { key: "clinicalSeverity", label: "Mức độ", inputType: "select", options: ["Nhẹ", "Trung bình", "Nặng", "Khẩn cấp"] },
    { key: "medication", label: "Thuốc/xử lý đã dùng" },
  ],
  sample_collected: [
    { key: "sampleType", label: "Loại mẫu", inputType: "select", required: true, options: ["Máu", "Phân", "Sữa", "Mô", "Dịch mũi/miệng", "Khác"] },
    { key: "sampleCode", label: "Mã mẫu" },
    { key: "labName", label: "Phòng xét nghiệm" },
    { key: "collectionSite", label: "Vị trí lấy mẫu" },
  ],
  test_result_recorded: [
    { key: "testName", label: "Tên xét nghiệm", required: true },
    { key: "testResult", label: "Kết quả", inputType: "textarea", required: true },
    { key: "resultDate", label: "Ngày có kết quả", inputType: "date" },
    { key: "labReference", label: "Mã tham chiếu" },
  ],
  parasite_monitoring: [
    { key: "sampleCode", label: "Mã mẫu" },
    { key: "wecFecCount", label: "Chỉ số WEC/FEC", inputType: "number" },
    { key: "parasiteResult", label: "Kết quả ký sinh" },
    { key: "treatmentPlan", label: "Kế hoạch xử lý", inputType: "textarea" },
  ],
  other: [
    { key: "otherHealthEvent", label: "Tên sự kiện", required: true },
    { key: "details", label: "Chi tiết", inputType: "textarea" },
  ],
};

const WEIGHT_SOURCE_OPTIONS: WeightSourceOption[] = [
  {
    value: "tape_estimate",
    label: "Ước tính bằng thước đo",
    summary: "Ước tính cân nặng từ số đo vòng ngực, dài thân hoặc công thức đo phù hợp với loài.",
    defaultTitle: "Cân nặng ước tính bằng thước đo",
    weightLabel: "Cân nặng ước tính",
  },
  {
    value: "digital_estimate",
    label: "Cân điện tử",
    summary: "Ghi nhận cân nặng từ cân điện tử hoặc trạm cân, phù hợp để theo dõi tăng trọng chính xác.",
    defaultTitle: "Cân nặng bằng cân điện tử",
    weightLabel: "Cân nặng",
  },
  {
    value: "visual_estimate",
    label: "Ước tính quan sát",
    summary: "Ghi nhận cân nặng ước tính bằng quan sát khi chưa có thiết bị cân.",
    defaultTitle: "Cân nặng ước tính bằng quan sát",
    weightLabel: "Cân nặng ước tính",
  },
  {
    value: "carcass_weight",
    label: "Trọng lượng thân thịt",
    summary: "Ghi nhận trọng lượng thân thịt, tỷ lệ móc hàm hoặc thông tin cơ sở giết mổ/xử lý.",
    defaultTitle: "Trọng lượng thân thịt",
    weightLabel: "Trọng lượng thân thịt",
  },
];

const WEIGHT_FIELD_CONFIG: Record<WeightSource, WeightMetadataField[]> = {
  tape_estimate: [
    { key: "heartGirthCm", label: "Vòng ngực", inputType: "number", placeholder: "cm" },
    { key: "bodyLengthCm", label: "Dài thân", inputType: "number", placeholder: "cm" },
    { key: "measurementFormula", label: "Công thức đo", inputType: "select", options: ["Bò/trâu", "Dê/cừu", "Heo", "Tùy chỉnh"] },
    { key: "measurementNote", label: "Ghi chú đo", inputType: "textarea" },
  ],
  digital_estimate: [
    { key: "scaleName", label: "Tên/mã cân" },
    { key: "weighingSession", label: "Ca cân", inputType: "select", options: ["Sáng", "Chiều", "Trước ăn", "Sau ăn", "Khác"] },
    { key: "stableMinutes", label: "Thời gian đứng yên", inputType: "number", placeholder: "phút" },
    { key: "operatorNote", label: "Ghi chú vận hành", inputType: "textarea" },
  ],
  visual_estimate: [
    { key: "bodyCondition", label: "Thể trạng", inputType: "select", options: ["Gầy", "Bình thường", "Tốt", "Béo", "Cần kiểm tra"] },
    { key: "confidenceLevel", label: "Độ tin cậy", inputType: "select", options: ["Thấp", "Trung bình", "Cao"] },
    { key: "visualBasis", label: "Căn cứ ước tính", inputType: "textarea" },
  ],
  carcass_weight: [
    { key: "dressingPercentage", label: "Tỷ lệ móc hàm", inputType: "number", placeholder: "%" },
    { key: "processor", label: "Cơ sở xử lý/giết mổ" },
    { key: "carcassGrade", label: "Phân hạng thân thịt" },
    { key: "processingReference", label: "Mã chứng từ/lô xử lý" },
  ],
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatNumber(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function parseClientNumber(value: string) {
  const raw = value.trim().replace(/\s/g, "");
  if (!raw) return null;
  const commaIndex = raw.lastIndexOf(",");
  const dotIndex = raw.lastIndexOf(".");
  let normalized = raw;
  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalMark = commaIndex > dotIndex ? "," : ".";
    const thousandsMark = decimalMark === "," ? "." : ",";
    normalized = raw.split(thousandsMark).join("").replace(decimalMark, ".");
  } else if (commaIndex >= 0) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if ((raw.match(/\./g) ?? []).length > 1) {
    normalized = raw.replace(/\./g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function initialForm(groupZoneId = "", currentUserName = ""): FormState {
  const option = LIVESTOCK_EVENT_TYPE_OPTIONS[0];
  return {
    type: option.value,
    title: option.defaultTitle,
    selectedAnimalIds: [],
    animalWeights: {},
    eventDate: today(),
    sourceZoneId: groupZoneId,
    destinationZoneId: "",
    numericValue: "",
    unit: option.defaultUnit ?? "",
    performedBy: currentUserName,
    followUpDate: "",
    note: "",
    metadata: option.value === "adjustment" ? { adjustmentType: DEFAULT_ADJUSTMENT_TYPE } : {},
  };
}

function metadataPayload(metadata: Record<string, string>) {
  return Object.entries(metadata).reduce<Record<string, string | null>>((result, [key, value]) => {
    const clean = value.trim();
    result[key] = clean || null;
    return result;
  }, {});
}

function getMovementType(value: string | undefined): MovementType {
  return MOVE_TYPE_OPTIONS.some((option) => option.value === value) ? (value as MovementType) : DEFAULT_MOVEMENT_TYPE;
}

function getMovementOption(value: MovementType) {
  return MOVE_TYPE_OPTIONS.find((option) => option.value === value) ?? MOVE_TYPE_OPTIONS[0];
}

function needsFarmDestination(value: MovementType) {
  return ON_FARM_MOVEMENT_TYPES.includes(value);
}

function getAdjustmentType(value: string | undefined): AdjustmentType {
  return ADJUSTMENT_TYPE_OPTIONS.some((option) => option.value === value) ? (value as AdjustmentType) : DEFAULT_ADJUSTMENT_TYPE;
}

function getAdjustmentOption(value: AdjustmentType) {
  return ADJUSTMENT_TYPE_OPTIONS.find((option) => option.value === value) ?? ADJUSTMENT_TYPE_OPTIONS[0];
}

function getHealthType(value: string | undefined): HealthType | "" {
  return HEALTH_TYPE_OPTIONS.some((option) => option.value === value) ? (value as HealthType) : "";
}

function getHealthOption(value: HealthType | "") {
  return value ? HEALTH_TYPE_OPTIONS.find((option) => option.value === value) ?? null : null;
}

function getWeightSource(value: string | undefined): WeightSource | "" {
  return WEIGHT_SOURCE_OPTIONS.some((option) => option.value === value) ? (value as WeightSource) : "";
}

function getWeightSourceOption(value: WeightSource | "") {
  return value ? WEIGHT_SOURCE_OPTIONS.find((option) => option.value === value) ?? null : null;
}

function eventMetadataPayload(form: FormState) {
  const payload = metadataPayload(form.metadata);
  if (form.type === "adjustment") {
    const adjustmentType = getAdjustmentType(form.metadata.adjustmentType);
    const option = getAdjustmentOption(adjustmentType);
    return {
      ...payload,
      adjustmentType,
      adjustmentLabel: option.label,
    };
  }

  if (form.type === "health") {
    const healthType = getHealthType(form.metadata.healthType);
    const option = getHealthOption(healthType);
    return {
      ...payload,
      ...(healthType && option
        ? {
            healthType,
            healthLabel: option.label,
            healthCategory: option.category,
          }
        : {}),
    };
  }

  if (form.type === "weight") {
    const weightSource = getWeightSource(form.metadata.weightSource);
    const option = getWeightSourceOption(weightSource);
    return {
      ...payload,
      ...(weightSource && option
        ? {
            weightSource,
            weightSourceLabel: option.label,
          }
        : {}),
    };
  }

  if (form.type !== "move") return payload;

  const movementType = getMovementType(form.metadata.movementType);
  const option = getMovementOption(movementType);
  return {
    ...payload,
    movementType,
    movementLabel: option.label,
    movementScope: option.scope,
  };
}

function normalizeScannedText(value: string) {
  try {
    return decodeURIComponent(value.trim());
  } catch {
    return value.trim();
  }
}

function findAnimalFromScannedText(rawValue: string, animals: AnimalOption[]) {
  const scanned = normalizeScannedText(rawValue);
  const upperScanned = scanned.toUpperCase();
  const candidates = new Set<string>([scanned, upperScanned]);
  const qrMatch = scanned.match(/QR-VN-[A-Z0-9-]+/i);
  const animalCodeMatch = scanned.match(/NVN-[A-Z0-9-]+/i);
  if (qrMatch?.[0]) candidates.add(qrMatch[0].toUpperCase());
  if (animalCodeMatch?.[0]) candidates.add(animalCodeMatch[0].toUpperCase());

  return (
    animals.find((animal) => {
      const values = [animal.code, animal.qrCode, animal.identity]
        .filter((item): item is string => Boolean(item))
        .map((item) => item.trim());
      return values.some((value) => candidates.has(value) || candidates.has(value.toUpperCase()) || upperScanned.includes(value.toUpperCase()));
    }) ?? null
  );
}

function beep() {
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const audio = new AudioContextCtor();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, audio.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.16);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.18);
}

function decodeQrImage(data: Uint8ClampedArray, width: number, height: number) {
  return jsQR(data, width, height, { inversionAttempts: "attemptBoth" })?.data?.trim() ?? null;
}

function thresholdImage(data: Uint8ClampedArray, threshold: number) {
  const result = new Uint8ClampedArray(data);
  for (let index = 0; index < result.length; index += 4) {
    const gray = result[index] * 0.299 + result[index + 1] * 0.587 + result[index + 2] * 0.114;
    const value = gray > threshold ? 255 : 0;
    result[index] = value;
    result[index + 1] = value;
    result[index + 2] = value;
    result[index + 3] = 255;
  }
  return result;
}

function decodeQrImageVariants(data: Uint8ClampedArray, width: number, height: number) {
  const direct = decodeQrImage(data, width, height);
  if (direct) return direct;

  for (const threshold of [96, 120, 144, 168]) {
    const result = decodeQrImage(thresholdImage(data, threshold), width, height);
    if (result) return result;
  }

  return null;
}

async function readApiResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Không thể ghi nhận sự kiện.");
  return data as { message?: string };
}

export default function EventForm({
  groupId,
  groupName,
  animals,
  zones,
  groupZoneId,
  currentUserName,
  recentEvents,
  closeHref,
}: {
  groupId: string;
  groupName: string;
  animals: AnimalOption[];
  zones: LivestockEventZone[];
  groupZoneId: string;
  currentUserName: string;
  recentEvents: LivestockEventRecord[];
  closeHref: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialForm(groupZoneId, currentUserName));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [activeWeightAnimalId, setActiveWeightAnimalId] = useState("");
  const [weightEntryValue, setWeightEntryValue] = useState("");
  const [qrMessage, setQrMessage] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const recentScanRef = useRef<{ value: string; at: number } | null>(null);
  const selectedAnimalIdsRef = useRef<string[]>([]);

  const option = useMemo(() => getLivestockEventTypeOption(form.type), [form.type]);
  const allAnimalIds = useMemo(() => animals.map((animal) => animal.id), [animals]);
  const selectedAnimals = useMemo(
    () => animals.filter((animal) => form.selectedAnimalIds.includes(animal.id)),
    [animals, form.selectedAnimalIds]
  );
  const activeWeightAnimal = useMemo(
    () => animals.find((animal) => animal.id === activeWeightAnimalId) ?? null,
    [activeWeightAnimalId, animals]
  );
  const weightRows = useMemo(
    () =>
      form.selectedAnimalIds
        .map((animalId) => {
          const animal = animals.find((entry) => entry.id === animalId);
          const rawWeight = form.animalWeights[animalId] ?? "";
          const value = parseClientNumber(rawWeight);
          return animal && value != null && value > 0 ? { animal, rawWeight, value } : null;
        })
        .filter((entry): entry is { animal: AnimalOption; rawWeight: string; value: number } => Boolean(entry)),
    [animals, form.animalWeights, form.selectedAnimalIds]
  );
  const averageWeight = useMemo(() => {
    if (weightRows.length === 0) return null;
    return weightRows.reduce((total, entry) => total + entry.value, 0) / weightRows.length;
  }, [weightRows]);
  const sourceZoneName = zones.find((zone) => zone.id === groupZoneId)?.name ?? "Chưa gắn khu vực";
  const adjustmentType = getAdjustmentType(form.metadata.adjustmentType);
  const adjustmentOption = getAdjustmentOption(adjustmentType);
  const healthType = getHealthType(form.metadata.healthType);
  const healthOption = getHealthOption(healthType);
  const weightSource = getWeightSource(form.metadata.weightSource);
  const weightSourceOption = getWeightSourceOption(weightSource);
  const movementType = getMovementType(form.metadata.movementType);
  const movementOption = getMovementOption(movementType);
  const moveNeedsDestination = form.type === "move" && needsFarmDestination(movementType);
  const adjustmentNumericValue =
    form.type === "adjustment" && adjustmentType !== "add_animals"
      ? String(form.selectedAnimalIds.length)
      : form.numericValue;

  const stopQrScanner = useCallback(() => {
    if (scanLoopRef.current != null) {
      window.cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    recentScanRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScannerActive(false);
    setScannerOpen(false);
  }, []);

  useEffect(() => stopQrScanner, [stopQrScanner]);

  useEffect(() => {
    selectedAnimalIdsRef.current = form.selectedAnimalIds;
  }, [form.selectedAnimalIds]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setMetadata = (key: string, value: string) => {
    setForm((current) => ({ ...current, metadata: { ...current.metadata, [key]: value } }));
  };

  const changeType = (type: LivestockEventType) => {
    const nextOption = getLivestockEventTypeOption(type);
    const metadata: Record<string, string> =
      type === "move"
        ? { movementType: DEFAULT_MOVEMENT_TYPE }
        : type === "adjustment"
          ? { adjustmentType: DEFAULT_ADJUSTMENT_TYPE }
          : {};
    setMessage(null);
    setQrMessage(null);
    setActiveWeightAnimalId("");
    setWeightEntryValue("");
    setForm((current) => ({
      ...current,
      type,
      title:
        type === "move"
          ? getMovementOption(DEFAULT_MOVEMENT_TYPE).defaultTitle
          : type === "adjustment"
            ? getAdjustmentOption(DEFAULT_ADJUSTMENT_TYPE).defaultTitle
            : nextOption.defaultTitle,
      unit: type === "adjustment" ? "con" : type === "health" ? "" : type === "weight" ? "kg" : nextOption.defaultUnit ?? "",
      performedBy: currentUserName,
      sourceZoneId: groupZoneId,
      destinationZoneId: type === "move" ? current.destinationZoneId : "",
      selectedAnimalIds: type === "weight" ? [] : current.selectedAnimalIds,
      animalWeights: type === "weight" ? {} : current.animalWeights,
      numericValue: "",
      metadata,
    }));
  };

  const changeWeightSource = (nextSource: WeightSource | "") => {
    if (!nextSource) {
      setMessage(null);
      setForm((current) => ({
        ...current,
        title: getLivestockEventTypeOption("weight").defaultTitle,
        unit: "kg",
        destinationZoneId: "",
        metadata: {},
      }));
      return;
    }

    const nextOption = getWeightSourceOption(nextSource);
    setMessage(null);
    setForm((current) => ({
      ...current,
      title: nextOption?.defaultTitle ?? getLivestockEventTypeOption("weight").defaultTitle,
      unit: "kg",
      destinationZoneId: "",
      metadata: { weightSource: nextSource },
    }));
  };

  const changeHealthType = (nextType: HealthType | "") => {
    if (!nextType) {
      setMessage(null);
      setForm((current) => ({
        ...current,
        title: getLivestockEventTypeOption("health").defaultTitle,
        numericValue: "",
        unit: "",
        destinationZoneId: "",
        metadata: {},
      }));
      return;
    }

    const nextOption = getHealthOption(nextType);
    setMessage(null);
    setForm((current) => ({
      ...current,
      title: nextOption?.defaultTitle ?? getLivestockEventTypeOption("health").defaultTitle,
      numericValue: "",
      unit: "",
      destinationZoneId: "",
      metadata: { healthType: nextType },
    }));
  };

  const changeAdjustmentType = (nextType: AdjustmentType) => {
    const nextOption = getAdjustmentOption(nextType);
    setMessage(null);
    setQrMessage(null);
    setForm((current) => ({
      ...current,
      title: nextOption.defaultTitle,
      unit: "con",
      numericValue: nextType === "add_animals" ? "" : String(nextType === "archive_group" ? allAnimalIds.length : current.selectedAnimalIds.length),
      destinationZoneId: "",
      selectedAnimalIds: nextType === "archive_group" ? allAnimalIds : current.selectedAnimalIds,
      metadata: { adjustmentType: nextType },
    }));
  };

  const changeMovementType = (nextType: MovementType) => {
    const nextOption = getMovementOption(nextType);
    setMessage(null);
    setForm((current) => ({
      ...current,
      title: nextOption.defaultTitle,
      destinationZoneId: needsFarmDestination(nextType) ? current.destinationZoneId : "",
      metadata: { movementType: nextType },
    }));
  };

  const toggleAnimal = (animalId: string) => {
    setForm((current) => {
      const exists = current.selectedAnimalIds.includes(animalId);
      return {
        ...current,
        selectedAnimalIds: exists
          ? current.selectedAnimalIds.filter((item) => item !== animalId)
          : [...current.selectedAnimalIds, animalId],
      };
    });
  };

  const selectAllAnimals = () => {
    setQrMessage(null);
    setField("selectedAnimalIds", allAnimalIds);
  };

  const clearSelectedAnimals = () => {
    setQrMessage(null);
    setActiveWeightAnimalId("");
    setWeightEntryValue("");
    setForm((current) => ({
      ...current,
      selectedAnimalIds: [],
      animalWeights: current.type === "weight" ? {} : current.animalWeights,
      numericValue: current.type === "weight" ? "" : current.numericValue,
    }));
  };

  const focusWeightAnimal = useCallback((animal: AnimalOption, message?: string) => {
    setActiveWeightAnimalId(animal.id);
    setWeightEntryValue(form.animalWeights[animal.id] ?? "");
    setQrMessage(message ?? `${animal.code || animal.qrCode || "Cá thể"} đã sẵn sàng nhập cân nặng.`);
  }, [form.animalWeights]);

  const saveWeightEntry = () => {
    if (!activeWeightAnimal) {
      setQrMessage("Vui lòng quét mã hoặc chọn một cá thể trước khi nhập cân nặng.");
      return;
    }

    const weightValue = parseClientNumber(weightEntryValue);
    if (weightValue == null || weightValue <= 0) {
      setQrMessage("Vui lòng nhập cân nặng hợp lệ cho cá thể đang chọn.");
      return;
    }

    const normalizedWeight = String(weightValue);
    setForm((current) => {
      const selectedAnimalIds = current.selectedAnimalIds.includes(activeWeightAnimal.id)
        ? current.selectedAnimalIds
        : [...current.selectedAnimalIds, activeWeightAnimal.id];
      const animalWeights = {
        ...current.animalWeights,
        [activeWeightAnimal.id]: normalizedWeight,
      };
      const values = Object.values(animalWeights)
        .map((value) => parseClientNumber(value))
        .filter((value): value is number => value != null && value > 0);
      const nextAverage = values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : null;
      return {
        ...current,
        selectedAnimalIds,
        animalWeights,
        numericValue: nextAverage == null ? "" : String(nextAverage),
      };
    });
    beep();
    setWeightEntryValue("");
    setQrMessage(`Đã ghi ${formatNumber(weightValue)} ${form.unit || "kg"} cho ${activeWeightAnimal.code || activeWeightAnimal.qrCode || "cá thể"}. Quét mã tiếp theo để nhập tiếp.`);
  };

  const removeWeightEntry = (animalId: string) => {
    setForm((current) => {
      const animalWeights = { ...current.animalWeights };
      delete animalWeights[animalId];
      const selectedAnimalIds = current.selectedAnimalIds.filter((item) => item !== animalId);
      const values = Object.values(animalWeights)
        .map((value) => parseClientNumber(value))
        .filter((value): value is number => value != null && value > 0);
      const nextAverage = values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : null;
      return {
        ...current,
        selectedAnimalIds,
        animalWeights,
        numericValue: nextAverage == null ? "" : String(nextAverage),
      };
    });
    if (activeWeightAnimalId === animalId) {
      setActiveWeightAnimalId("");
      setWeightEntryValue("");
    }
    setQrMessage(null);
  };

  const selectAnimalByCode = useCallback((rawCode: string) => {
    const code = rawCode.trim();
    if (!code) {
      setQrMessage("Vui lòng nhập mã cá thể hoặc mã QR.");
      return;
    }

    const recent = recentScanRef.current;
    const now = Date.now();
    if (recent?.value === code && now - recent.at < 1500) return;
    recentScanRef.current = { value: code, at: now };

    const animal = findAnimalFromScannedText(code, animals);
    if (!animal) {
      setQrMessage(`Đã đọc mã "${code}" nhưng không tìm thấy cá thể tương ứng trong nhóm này.`);
      return;
    }
    if (form.type === "weight") {
      const hasWeight = Boolean(form.animalWeights[animal.id]);
      focusWeightAnimal(
        animal,
        hasWeight
          ? `${animal.code || animal.qrCode || code} đã có cân nặng, bạn có thể sửa rồi lưu lại.`
          : `${animal.code || animal.qrCode || code} đã sẵn sàng nhập cân nặng.`
      );
      beep();
      return;
    }
    if (selectedAnimalIdsRef.current.includes(animal.id)) {
      setQrMessage(`${animal.code || animal.qrCode || code} đã có trong danh sách ghi nhận.`);
      return;
    }

    setForm((current) => {
      return { ...current, selectedAnimalIds: [...current.selectedAnimalIds, animal.id] };
    });
    beep();
    setQrMessage(`Đã chọn ${animal.code || animal.qrCode || code}.`);
  }, [animals, focusWeightAnimal, form.animalWeights, form.type]);

  const scanManualCode = () => {
    selectAnimalByCode(codeInput);
    setCodeInput("");
  };

  const decodeFromVideo = useCallback((video: HTMLVideoElement) => {
    const canvas = canvasRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!canvas || width <= 0 || height <= 0) return null;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    const fullResult = decodeQrImageVariants(context.getImageData(0, 0, width, height).data, width, height);
    if (fullResult) return fullResult;

    const scanCanvas = scanCanvasRef.current ?? document.createElement("canvas");
    scanCanvasRef.current = scanCanvas;
    const scanContext = scanCanvas.getContext("2d", { willReadFrequently: true });
    if (!scanContext) return null;

    const crops = [0.92, 0.78, 0.64, 0.5];
    const baseSide = Math.min(width, height);

    for (const ratio of crops) {
      const side = Math.floor(baseSide * ratio);
      if (side < 80) continue;
      const left = Math.max(0, Math.floor((width - side) / 2));
      const top = Math.max(0, Math.floor((height - side) / 2));
      const outputSize = Math.max(420, Math.min(900, side * 3));
      scanCanvas.width = outputSize;
      scanCanvas.height = outputSize;
      scanContext.imageSmoothingEnabled = false;
      scanContext.drawImage(canvas, left, top, side, side, 0, 0, outputSize, outputSize);
      const imageData = scanContext.getImageData(0, 0, outputSize, outputSize);
      const result = decodeQrImageVariants(imageData.data, outputSize, outputSize);
      if (result) return result;
    }

    return null;
  }, []);

  const startQrScanner = () => {
    setQrMessage(null);
    setScannerOpen(true);
  };

  useEffect(() => {
    if (!scannerOpen || scannerActive || zxingControlsRef.current) return;

    let cancelled = false;

    const openCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setQrMessage("Trình duyệt không cho phép mở camera. Bạn có thể nhập mã QR thủ công.");
        return;
      }

      try {
        if (!videoRef.current) {
          setQrMessage("Không tìm thấy khung camera. Vui lòng tắt rồi bật lại quét QR.");
          return;
        }

        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 60,
          delayBetweenScanSuccess: 250,
          tryPlayVideoTimeout: 5000,
        });

        setQrMessage("Camera đang quét mã QR...");
        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          },
          videoRef.current,
          (result) => {
            const rawValue = result?.getText()?.trim();
            if (!rawValue) return;
            selectAnimalByCode(rawValue);
          }
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        zxingControlsRef.current = controls;
        setScannerActive(true);
        try {
          controls.streamVideoConstraintsApply?.({
            advanced: [
              { focusMode: "continuous" } as CameraConstraintSet,
              { exposureMode: "continuous" } as CameraConstraintSet,
              { whiteBalanceMode: "continuous" } as CameraConstraintSet,
              { zoom: 2 } as CameraConstraintSet,
            ],
          });
        } catch {
          // Một số webview từ chối constraint phụ dù camera vẫn quét được.
        }

        const scanFrame = async () => {
          if (cancelled || !videoRef.current || !zxingControlsRef.current) return;
          const rawValue = decodeFromVideo(videoRef.current);
          if (rawValue) {
            selectAnimalByCode(rawValue);
            return;
          }
          scanLoopRef.current = window.requestAnimationFrame(scanFrame);
        };
        scanLoopRef.current = window.requestAnimationFrame(scanFrame);
      } catch {
        setScannerActive(false);
        setQrMessage("Không mở được camera. Vui lòng cấp quyền camera hoặc nhập mã QR thủ công.");
      }
    };

    void openCamera();

    return () => {
      cancelled = true;
    };
  }, [decodeFromVideo, scannerActive, scannerOpen, selectAnimalByCode]);

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (form.type !== "weight" && form.selectedAnimalIds.length < 1) throw new Error("Vui lòng chọn ít nhất một cá thể để ghi sự kiện.");

      if (form.type === "adjustment") {
        if (adjustmentType === "archive_group" && form.selectedAnimalIds.length !== animals.length) {
          throw new Error("Lưu trữ nhóm cần chọn toàn bộ cá thể trong nhóm.");
        }
        if (adjustmentOption.quantityRequired && Number(adjustmentNumericValue) <= 0) {
          throw new Error(`Vui lòng nhập ${adjustmentOption.quantityLabel?.toLowerCase() ?? "số lượng"}.`);
        }
        const missingField = ADJUSTMENT_FIELD_CONFIG[adjustmentType].find((field) => field.required && !form.metadata[field.key]?.trim());
        if (missingField) throw new Error(`Vui lòng nhập ${missingField.label.toLowerCase()}.`);
      }

      if (form.type === "health") {
        if (!healthType) throw new Error("Vui lòng chọn loại sự kiện sức khỏe.");
        const missingField = HEALTH_FIELD_CONFIG[healthType].find((field) => field.required && !form.metadata[field.key]?.trim());
        if (missingField) throw new Error(`Vui lòng nhập ${missingField.label.toLowerCase()}.`);
      }

      if (form.type === "weight") {
        if (!weightSource) throw new Error("Vui lòng chọn nguồn cân nặng.");
        if (weightRows.length < 1) throw new Error("Vui lòng quét hoặc chọn từng cá thể rồi nhập cân nặng cho ít nhất một cá thể.");
        if (weightRows.length !== form.selectedAnimalIds.length) throw new Error("Một số cá thể đã chọn chưa có cân nặng hợp lệ.");
        const missingField = WEIGHT_FIELD_CONFIG[weightSource].find((field) => field.required && !form.metadata[field.key]?.trim());
        if (missingField) throw new Error(`Vui lòng nhập ${missingField.label.toLowerCase()}.`);
      }

      const submittedAnimalIds = form.type === "weight" ? weightRows.map((entry) => entry.animal.id) : form.selectedAnimalIds;
      const submittedWeights = form.type === "weight"
        ? weightRows.reduce<Record<string, string>>((result, entry) => {
            result[entry.animal.id] = String(entry.value);
            return result;
          }, {})
        : undefined;

      if (form.type === "move") {
        if (moveNeedsDestination && !form.destinationZoneId) {
          throw new Error("Vui lòng chọn khu vực đích cho loại di chuyển này.");
        }
        const missingField = MOVE_FIELD_CONFIG[movementType].find((field) => field.required && !form.metadata[field.key]?.trim());
        if (missingField) throw new Error(`Vui lòng nhập ${missingField.label.toLowerCase()}.`);
      }

      const response = await fetch("/api/du-lieu/vat-nuoi/su-kien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          type: form.type,
          title: form.title,
          eventDate: form.eventDate,
          animalIds: submittedAnimalIds,
          animalWeights: submittedWeights,
          sourceZoneId: form.sourceZoneId,
          destinationZoneId: form.destinationZoneId,
          numericValue: form.type === "weight" && averageWeight != null ? String(averageWeight) : form.type === "adjustment" ? adjustmentNumericValue : form.numericValue,
          unit: form.type === "adjustment" ? "con" : form.unit,
          performedBy: currentUserName,
          followUpDate: form.followUpDate,
          note: form.note,
          metadata: eventMetadataPayload(form),
        }),
      });

      const data = await readApiResponse(response);
      setMessage(data.message ?? "Đã ghi nhận sự kiện.");
      setQrMessage(null);
      stopQrScanner();
      setActiveWeightAnimalId("");
      setWeightEntryValue("");
      setForm(initialForm(groupZoneId, currentUserName));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể ghi nhận sự kiện.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderMetadataField = (field: LivestockEventMetadataField) => {
    const value = form.metadata[field.key] ?? "";
    if (field.inputType === "select") {
      return (
        <label className={styles.eventField} key={field.key}>
          <span>{field.label}</span>
          <select value={value} onChange={(event) => setMetadata(field.key, event.target.value)}>
            <option value="">Chưa chọn</option>
            {(field.options ?? []).map((entry) => (
              <option value={entry} key={entry}>{entry}</option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label className={styles.eventField} key={field.key}>
        <span>{field.label}</span>
        <input
          type={field.inputType ?? "text"}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => setMetadata(field.key, event.target.value)}
        />
      </label>
    );
  };

  const renderMoveMetadataField = (field: MovementMetadataField) => {
    const value = form.metadata[field.key] ?? "";
    const label = field.required ? `${field.label} *` : field.label;

    if (field.inputType === "select") {
      return (
        <label className={styles.eventField} key={field.key}>
          <span>{label}</span>
          <select value={value} required={field.required} onChange={(event) => setMetadata(field.key, event.target.value)}>
            <option value="">Chưa chọn</option>
            {(field.options ?? []).map((entry) => (
              <option value={entry} key={entry}>{entry}</option>
            ))}
          </select>
        </label>
      );
    }

    if (field.inputType === "textarea") {
      return (
        <label className={`${styles.eventField} ${styles.eventFullField}`} key={field.key}>
          <span>{label}</span>
          <textarea
            rows={3}
            value={value}
            required={field.required}
            placeholder={field.placeholder}
            onChange={(event) => setMetadata(field.key, event.target.value)}
          />
        </label>
      );
    }

    return (
      <label className={styles.eventField} key={field.key}>
        <span>{label}</span>
        <input
          type={field.inputType ?? "text"}
          value={value}
          required={field.required}
          placeholder={field.placeholder}
          onChange={(event) => setMetadata(field.key, event.target.value)}
        />
      </label>
    );
  };

  const renderAdjustmentForm = () => (
    <div className={styles.movePanel}>
      <div className={styles.moveHeader}>
        <span className={styles.moveIcon}>DC</span>
        <div>
          <h3>Điều chỉnh</h3>
          <p>Ghi nhận các thay đổi số lượng như thêm vật nuôi, lưu trữ cá thể, lưu trữ nhóm hoặc loại bỏ cá thể. Mỗi cá thể được chọn vẫn được gắn riêng với sự kiện.</p>
        </div>
      </div>

      <div className={styles.moveTabs}>
        <span>Sự kiện điều chỉnh</span>
      </div>

      <label className={`${styles.eventField} ${styles.moveTypeField}`}>
        <span>Loại điều chỉnh *</span>
        <select
          className={styles.moveTypeSelect}
          value={adjustmentType}
          onChange={(event) => changeAdjustmentType(event.target.value as AdjustmentType)}
          required
        >
          <option value="">Chọn từ danh sách...</option>
          {ADJUSTMENT_TYPE_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>{entry.label}</option>
          ))}
        </select>
        <small className={styles.moveFieldHint}>{adjustmentOption.summary}</small>
      </label>

      <div className={styles.eventFormGrid}>
        <label className={styles.eventField}>
          <span>Tiêu đề</span>
          <input value={form.title} onChange={(event) => setField("title", event.target.value)} required />
        </label>

        <label className={styles.eventField}>
          <span>Ngày điều chỉnh</span>
          <input type="date" value={form.eventDate} onChange={(event) => setField("eventDate", event.target.value)} required />
        </label>

        <label className={styles.eventField}>
          <span>Người thực hiện</span>
          <input value={currentUserName} readOnly aria-readonly="true" />
        </label>

        <label className={styles.eventField}>
          <span>Khu vực hiện tại</span>
          <select value={groupZoneId} disabled aria-disabled="true">
            <option value={groupZoneId}>{sourceZoneName}</option>
            {zones.filter((zone) => zone.id !== groupZoneId).map((zone) => (
              <option key={zone.id} value={zone.id}>{zone.name}</option>
            ))}
          </select>
        </label>

        {adjustmentOption.quantityLabel && (
          <label className={styles.eventField}>
            <span>{adjustmentOption.quantityRequired ? `${adjustmentOption.quantityLabel} *` : adjustmentOption.quantityLabel}</span>
            <input
              type="number"
              min="1"
              value={form.numericValue}
              required={adjustmentOption.quantityRequired}
              onChange={(event) => setField("numericValue", event.target.value)}
              placeholder="Ví dụ: 5"
            />
          </label>
        )}

        {adjustmentType !== "add_animals" && (
          <label className={styles.eventField}>
            <span>Số cá thể áp dụng</span>
            <input value={`${selectedAnimals.length} con`} readOnly aria-readonly="true" />
          </label>
        )}

        {ADJUSTMENT_FIELD_CONFIG[adjustmentType].map(renderMoveMetadataField)}

        <label className={styles.eventField}>
          <span>Ngày nhắc lại</span>
          <input type="date" value={form.followUpDate} onChange={(event) => setField("followUpDate", event.target.value)} />
        </label>

        <label className={`${styles.eventField} ${styles.eventFullField}`}>
          <span>Ghi chú</span>
          <textarea rows={3} value={form.note} onChange={(event) => setField("note", event.target.value)} />
        </label>
      </div>
    </div>
  );

  const renderHealthForm = () => (
    <div className={styles.movePanel}>
      <div className={styles.moveHeader}>
        <span className={styles.moveIcon}>SK</span>
        <div>
          <h3>Sức khỏe</h3>
          <p>Ghi nhận bệnh, chấn thương, triệu chứng, chẩn đoán, việc đã xử lý, ghi chú thú y, thuốc đã dùng và lịch theo dõi.</p>
        </div>
      </div>

      <div className={styles.moveTabs}>
        <span>Sự kiện sức khỏe</span>
      </div>

      <div className={styles.eventFormGrid}>
        <label className={styles.eventField}>
          <span>Loại sự kiện *</span>
          <select
            className={styles.moveTypeSelect}
            value={healthType}
            onChange={(event) => changeHealthType(event.target.value as HealthType | "")}
            required
          >
            <option value="">Chọn từ danh sách...</option>
            {(Object.keys(HEALTH_CATEGORY_LABELS) as HealthCategory[]).map((category) => (
              <optgroup key={category} label={HEALTH_CATEGORY_LABELS[category]}>
                {HEALTH_TYPE_OPTIONS.filter((entry) => entry.category === category).map((entry) => (
                  <option key={entry.value} value={entry.value}>{entry.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <small className={styles.moveFieldHint}>{healthOption?.summary ?? "Chọn loại sự kiện sức khỏe để nhập thông tin chi tiết."}</small>
        </label>

        <label className={styles.eventField}>
          <span>Nhóm *</span>
          <input value={groupName} readOnly aria-readonly="true" />
        </label>

        <label className={styles.eventField}>
          <span>Vật nuôi *</span>
          <input value={`${selectedAnimals.length} / ${animals.length} cá thể`} readOnly aria-readonly="true" />
        </label>

        <label className={styles.eventField}>
          <span>Tiêu đề</span>
          <input value={form.title} onChange={(event) => setField("title", event.target.value)} required />
        </label>

        <label className={styles.eventField}>
          <span>Ngày ghi nhận</span>
          <input type="date" value={form.eventDate} onChange={(event) => setField("eventDate", event.target.value)} required />
        </label>

        <label className={styles.eventField}>
          <span>Người thực hiện</span>
          <input value={currentUserName} readOnly aria-readonly="true" />
        </label>

        {healthType && HEALTH_FIELD_CONFIG[healthType].map(renderMoveMetadataField)}

        <label className={styles.eventField}>
          <span>Ngày nhắc theo dõi</span>
          <input type="date" value={form.followUpDate} onChange={(event) => setField("followUpDate", event.target.value)} />
        </label>

        <label className={`${styles.eventField} ${styles.eventFullField}`}>
          <span>Ghi chú</span>
          <textarea rows={3} value={form.note} onChange={(event) => setField("note", event.target.value)} />
        </label>
      </div>
    </div>
  );

  const renderWeightEntryPanel = () => (
    <div className={`${styles.weightEntryPanel} ${styles.eventFullField}`}>
      <div className={styles.weightEntryHead}>
        <div>
          <span>Nhập cân từng cá thể</span>
          <strong>{weightRows.length} / {animals.length} cá thể đã có cân nặng</strong>
        </div>
      </div>

      <div className={styles.weightStepGrid}>
        <div className={styles.weightStepCard}>
          <div className={styles.weightStepHead}>
            <span>1</span>
            <div>
              <strong>Chọn cá thể</strong>
              <p>Quét mã QR hoặc nhập mã vật nuôi để đưa cá thể vào phiên cân.</p>
            </div>
          </div>

          <button type="button" className={styles.secondaryAction} onClick={scannerActive ? stopQrScanner : startQrScanner} disabled={animals.length === 0}>
            {scannerActive ? "Dừng quét QR" : "Quét QR bằng camera"}
          </button>

          {scannerOpen && (
            <div className={styles.qrScanner}>
              <span className={styles.qrScanFrame} aria-hidden="true" />
              <video ref={videoRef} muted playsInline />
              <canvas ref={canvasRef} aria-hidden="true" />
            </div>
          )}

          <div className={styles.weightScanRow}>
            <input
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  scanManualCode();
                }
              }}
              placeholder="Quét, nhập hoặc dán mã cá thể/mã QR"
            />
            <button type="button" className={styles.secondaryAction} onClick={scanManualCode}>
              Chọn cá thể
            </button>
          </div>
        </div>

        <div className={styles.weightStepCard}>
          <div className={styles.weightStepHead}>
            <span>2</span>
            <div>
              <strong>Nhập cân nặng</strong>
              <p>{activeWeightAnimal ? `Đang nhập cho ${activeWeightAnimal.code || activeWeightAnimal.qrCode || "cá thể đã chọn"}.` : "Chọn cá thể ở khung bên trái trước khi nhập cân nặng."}</p>
            </div>
          </div>

          <div className={styles.weightInputRow}>
            <label className={styles.eventField}>
              <span>Cá thể đang nhập</span>
              <select
                value={activeWeightAnimalId}
                onChange={(event) => {
                  const animal = animals.find((entry) => entry.id === event.target.value);
                  if (animal) focusWeightAnimal(animal);
                }}
              >
                <option value="">Chọn hoặc quét mã cá thể</option>
                {animals.map((animal) => (
                  <option key={animal.id} value={animal.id}>{animal.code || animal.qrCode || animal.identity || "Cá thể chưa có mã"}</option>
                ))}
              </select>
            </label>

            <label className={styles.eventField}>
              <span>{weightSourceOption?.weightLabel ?? "Cân nặng"} *</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={weightEntryValue}
                onChange={(event) => setWeightEntryValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    saveWeightEntry();
                  }
                }}
                placeholder="Ví dụ: 325"
                disabled={!activeWeightAnimal}
              />
            </label>

            <button type="button" className={styles.primaryAction} onClick={saveWeightEntry} disabled={!activeWeightAnimal || !weightEntryValue.trim()}>
              Lưu cân nặng
            </button>
          </div>
        </div>
      </div>

      {qrMessage && <p className={styles.qrMessage}>{qrMessage}</p>}

      <div className={styles.weightAnimalList}>
        {weightRows.length === 0 ? (
          <div className={styles.emptyState}>Chưa có cá thể nào được nhập cân nặng. Hãy quét mã, nhập cân nặng rồi lưu để chuyển sang cá thể tiếp theo.</div>
        ) : (
          weightRows.map(({ animal, value }) => (
            <article key={animal.id}>
              <button type="button" onClick={() => focusWeightAnimal(animal)}>
                <strong>{animal.code || animal.qrCode || "Cá thể chưa có mã"}</strong>
                <span>{formatNumber(value)} {form.unit || "kg"}</span>
              </button>
              <button type="button" className={styles.weightRemoveButton} onClick={() => removeWeightEntry(animal.id)}>
                Xóa
              </button>
            </article>
          ))
        )}
      </div>
    </div>
  );

  const renderWeightForm = () => (
    <div className={styles.movePanel}>
      <div className={styles.moveHeader}>
        <span className={styles.moveIcon}>CN</span>
        <div>
          <h3>Cân nặng</h3>
          <p>Ghi nhận cân nặng cho vật nuôi, theo dõi cân nặng trung bình, tăng trọng theo thời gian và ghi chú phân loại.</p>
        </div>
      </div>

      <div className={styles.moveTabs}>
        <span>Sự kiện cân nặng</span>
      </div>

      <div className={styles.eventFormGrid}>
        <label className={styles.eventField}>
          <span>Nguồn cân nặng *</span>
          <select
            className={styles.moveTypeSelect}
            value={weightSource}
            onChange={(event) => changeWeightSource(event.target.value as WeightSource | "")}
            required
          >
            <option value="">Chọn từ danh sách...</option>
            {WEIGHT_SOURCE_OPTIONS.map((entry) => (
              <option key={entry.value} value={entry.value}>{entry.label}</option>
            ))}
          </select>
          <small className={styles.moveFieldHint}>{weightSourceOption?.summary ?? "Chọn nguồn cân nặng để nhập thông tin chi tiết."}</small>
        </label>

        <label className={styles.eventField}>
          <span>Nhóm *</span>
          <input value={groupName} readOnly aria-readonly="true" />
        </label>

        <label className={styles.eventField}>
          <span>Đã cân</span>
          <input value={`${weightRows.length} / ${animals.length} cá thể`} readOnly aria-readonly="true" />
        </label>

        <label className={styles.eventField}>
          <span>Tiêu đề</span>
          <input value={form.title} onChange={(event) => setField("title", event.target.value)} required />
        </label>

        <label className={styles.eventField}>
          <span>Ngày cân</span>
          <input type="date" value={form.eventDate} onChange={(event) => setField("eventDate", event.target.value)} required />
        </label>

        <label className={styles.eventField}>
          <span>Người thực hiện</span>
          <input value={currentUserName} readOnly aria-readonly="true" />
        </label>

        <label className={styles.eventField}>
          <span>Đơn vị</span>
          <input value={form.unit || "kg"} onChange={(event) => setField("unit", event.target.value)} placeholder="kg" />
        </label>

        <label className={styles.eventField}>
          <span>Cân nặng trung bình</span>
          <input value={averageWeight == null ? "Chưa có dữ liệu" : `${formatNumber(averageWeight)} ${form.unit || "kg"}`} readOnly aria-readonly="true" />
        </label>

        {weightSource && WEIGHT_FIELD_CONFIG[weightSource].map(renderMoveMetadataField)}

        {renderWeightEntryPanel()}

        <label className={styles.eventField}>
          <span>Ngày cân lại</span>
          <input type="date" value={form.followUpDate} onChange={(event) => setField("followUpDate", event.target.value)} />
        </label>

        <label className={`${styles.eventField} ${styles.eventFullField}`}>
          <span>Ghi chú phân loại</span>
          <textarea rows={3} value={form.note} onChange={(event) => setField("note", event.target.value)} />
        </label>
      </div>
    </div>
  );

  const renderMoveForm = () => (
    <div className={styles.movePanel}>
      <div className={styles.moveHeader}>
        <span className={styles.moveIcon}>DV</span>
        <div>
          <h3>Di chuyển</h3>
          <p>Ghi nhận vật nuôi di chuyển giữa khu, chuồng, cơ sở hoặc chuyến vận chuyển. Mỗi cá thể được chọn sẽ có liên kết riêng với sự kiện này.</p>
        </div>
      </div>

      <div className={styles.moveTabs}>
        <span>Sự kiện di chuyển</span>
      </div>

      <label className={`${styles.eventField} ${styles.moveTypeField}`}>
        <span>Loại di chuyển *</span>
        <select
          className={styles.moveTypeSelect}
          value={movementType}
          onChange={(event) => changeMovementType(event.target.value as MovementType)}
          required
        >
          <optgroup label="Sự kiện trong trang trại">
            {MOVE_TYPE_OPTIONS.filter((entry) => entry.scope === "on_farm").map((entry) => (
              <option key={entry.value} value={entry.value}>{entry.label}</option>
            ))}
          </optgroup>
          <optgroup label="Sự kiện ngoài trang trại">
            {MOVE_TYPE_OPTIONS.filter((entry) => entry.scope === "off_farm").map((entry) => (
              <option key={entry.value} value={entry.value}>{entry.label}</option>
            ))}
          </optgroup>
        </select>
        <small className={styles.moveFieldHint}>{movementOption.summary}</small>
      </label>

      <div className={styles.eventFormGrid}>
        <label className={styles.eventField}>
          <span>Tiêu đề</span>
          <input value={form.title} onChange={(event) => setField("title", event.target.value)} required />
        </label>

        <label className={styles.eventField}>
          <span>Ngày di chuyển</span>
          <input type="date" value={form.eventDate} onChange={(event) => setField("eventDate", event.target.value)} required />
        </label>

        <label className={styles.eventField}>
          <span>Người thực hiện</span>
          <input value={currentUserName} readOnly aria-readonly="true" />
        </label>

        <label className={styles.eventField}>
          <span>{movementType === "entry_to_on_farm_location" ? "Vị trí ghi nhận trước đó" : "Khu vực nguồn"}</span>
          <select value={groupZoneId} disabled aria-disabled="true">
            <option value={groupZoneId}>{sourceZoneName}</option>
            {zones.filter((zone) => zone.id !== groupZoneId).map((zone) => (
              <option key={zone.id} value={zone.id}>{zone.name}</option>
            ))}
          </select>
        </label>

        {moveNeedsDestination && (
          <label className={styles.eventField}>
            <span>{movementOption.destinationLabel ?? "Khu vực đích"} *</span>
            <select value={form.destinationZoneId} onChange={(event) => setField("destinationZoneId", event.target.value)} required>
              <option value="">Chọn khu vực đích</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>{zone.name}</option>
              ))}
            </select>
          </label>
        )}

        {MOVE_FIELD_CONFIG[movementType].map(renderMoveMetadataField)}

        <label className={styles.eventField}>
          <span>Ngày nhắc lại</span>
          <input type="date" value={form.followUpDate} onChange={(event) => setField("followUpDate", event.target.value)} />
        </label>

        <label className={`${styles.eventField} ${styles.eventFullField}`}>
          <span>Ghi chú</span>
          <textarea rows={3} value={form.note} onChange={(event) => setField("note", event.target.value)} />
        </label>
      </div>
    </div>
  );

  const renderStandardForm = () => (
    <div className={styles.eventFormGrid}>
      <label className={styles.eventField}>
        <span>Loại sự kiện</span>
        <select value={form.type} onChange={(event) => changeType(event.target.value as LivestockEventType)}>
          {LIVESTOCK_EVENT_TYPE_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>{entry.label}</option>
          ))}
        </select>
      </label>

      <label className={styles.eventField}>
        <span>Tiêu đề</span>
        <input value={form.title} onChange={(event) => setField("title", event.target.value)} required />
      </label>

      <label className={styles.eventField}>
        <span>Ngày sự kiện</span>
        <input type="date" value={form.eventDate} onChange={(event) => setField("eventDate", event.target.value)} required />
      </label>

      <label className={styles.eventField}>
        <span>Giá trị</span>
        <input value={form.numericValue} onChange={(event) => setField("numericValue", event.target.value)} placeholder={form.type === "weight" ? "Ví dụ: 325" : ""} />
      </label>

      <label className={styles.eventField}>
        <span>Đơn vị</span>
        <input value={form.unit} onChange={(event) => setField("unit", event.target.value)} placeholder={option.defaultUnit ?? "con, kg, ngày..."} />
      </label>

      <label className={styles.eventField}>
        <span>Người thực hiện</span>
        <input value={currentUserName} readOnly aria-readonly="true" />
      </label>

      <label className={styles.eventField}>
        <span>Khu vực nguồn</span>
        <select value={groupZoneId} disabled aria-disabled="true">
          <option value={groupZoneId}>{sourceZoneName}</option>
          {zones.filter((zone) => zone.id !== groupZoneId).map((zone) => (
            <option key={zone.id} value={zone.id}>{zone.name}</option>
          ))}
        </select>
      </label>

      <label className={styles.eventField}>
        <span>Khu vực đích</span>
        <select value={form.destinationZoneId} onChange={(event) => setField("destinationZoneId", event.target.value)}>
          <option value="">Không áp dụng</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>{zone.name}</option>
          ))}
        </select>
      </label>

      <label className={styles.eventField}>
        <span>Ngày nhắc lại</span>
        <input type="date" value={form.followUpDate} onChange={(event) => setField("followUpDate", event.target.value)} />
      </label>

      {option.fields.map(renderMetadataField)}

      <label className={`${styles.eventField} ${styles.eventFullField}`}>
        <span>Ghi chú</span>
        <textarea rows={3} value={form.note} onChange={(event) => setField("note", event.target.value)} />
      </label>
    </div>
  );

  return (
    <section className={styles.eventPanel}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Sự kiện</p>
          <h2>Ghi sự kiện cho {groupName}</h2>
        </div>
        <span className={styles.panelBadge}>{form.type === "weight" ? weightRows.length : selectedAnimals.length}/{animals.length} cá thể</span>
      </div>

      <div className={styles.eventLayout}>
        <form className={styles.eventForm} onSubmit={submitForm}>
          <div className={styles.eventTypeGrid} role="group" aria-label="Loại sự kiện">
            {LIVESTOCK_EVENT_TYPE_OPTIONS.map((entry) => (
              <button
                type="button"
                key={entry.value}
                className={form.type === entry.value ? styles.eventTypeActive : ""}
                onClick={() => changeType(entry.value)}
              >
                <strong>{entry.shortLabel}</strong>
                <span>{entry.purpose}</span>
              </button>
            ))}
          </div>

          {form.type === "adjustment"
            ? renderAdjustmentForm()
            : form.type === "health"
              ? renderHealthForm()
              : form.type === "weight"
                ? renderWeightForm()
              : form.type === "move"
                ? renderMoveForm()
                : renderStandardForm()}

          {form.type !== "weight" && (
          <div className={styles.animalPickerPanel}>
            <div className={styles.animalPickerHead}>
              <div>
                <span>Cá thể trong nhóm cần ghi nhận</span>
                <strong>{selectedAnimals.length} / {animals.length} cá thể</strong>
              </div>
              <div className={styles.animalPickerActions}>
                <button type="button" className={styles.secondaryAction} onClick={selectAllAnimals} disabled={animals.length === 0}>
                  Chọn tất cả
                </button>
                <button type="button" className={styles.secondaryAction} onClick={clearSelectedAnimals} disabled={form.selectedAnimalIds.length === 0}>
                  Bỏ chọn
                </button>
                <button type="button" className={styles.secondaryAction} onClick={scannerActive ? stopQrScanner : startQrScanner} disabled={animals.length === 0}>
                  {scannerActive ? "Dừng quét QR" : "Quét QR bằng camera"}
                </button>
              </div>
            </div>

            {scannerOpen && (
              <div className={styles.qrScanner}>
                <span className={styles.qrScanFrame} aria-hidden="true" />
                <video ref={videoRef} muted playsInline />
                <canvas ref={canvasRef} aria-hidden="true" />
              </div>
            )}

            <div className={styles.qrManualRow}>
              <input
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    scanManualCode();
                  }
                }}
                placeholder="Nhập hoặc dán mã cá thể/mã QR"
              />
              <button type="button" className={styles.secondaryAction} onClick={scanManualCode}>
                Chọn theo mã
              </button>
            </div>

            {qrMessage && <p className={styles.qrMessage}>{qrMessage}</p>}

            <div className={styles.animalPicker}>
              {animals.length === 0 ? (
                <div className={styles.emptyState}>Nhóm chưa có hồ sơ cá thể để chọn.</div>
              ) : (
                animals.map((animal) => (
                  <label key={animal.id}>
                    <input type="checkbox" checked={form.selectedAnimalIds.includes(animal.id)} onChange={() => toggleAnimal(animal.id)} />
                    <span>{animal.code || animal.qrCode || "Cá thể chưa có mã"}</span>
                    {animal.qrCode && <small>{animal.qrCode}</small>}
                  </label>
                ))
              )}
            </div>
          </div>
          )}

          {message && <p className={styles.eventMessage}>{message}</p>}

          <div className={styles.eventActions}>
            <button type="submit" disabled={submitting || (form.type === "weight" ? weightRows.length === 0 : form.selectedAnimalIds.length === 0)} className={styles.primaryAction}>
              {submitting ? <CowLoading label="Đang tải..." /> : "Lưu sự kiện"}
            </button>
            <button type="button" disabled={submitting} className={styles.secondaryAction} onClick={() => router.push(closeHref)}>
              Đóng
            </button>
          </div>
        </form>

        <aside className={styles.eventHistory}>
          <div>
            <p className={styles.eyebrow}>Nhật ký gần đây</p>
            <h3>{recentEvents.length} sự kiện</h3>
          </div>
          {recentEvents.length === 0 ? (
            <div className={styles.emptyState}>Chưa có sự kiện nào cho nhóm này.</div>
          ) : (
            recentEvents.slice(0, 10).map((item) => {
              const entry = getLivestockEventTypeOption(item.type);
              return (
                <article key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{entry.label} · {formatDate(item.eventDate)} · {item.animalCount} cá thể</span>
                  {item.numericValue != null && <p>{formatNumber(item.numericValue)} {item.unit ?? ""}</p>}
                  {(item.sourceZoneName || item.destinationZoneName) && (
                    <p>{item.sourceZoneName || "Chưa rõ"} → {item.destinationZoneName || "Ngoài trang trại"}</p>
                  )}
                  {item.animalCodes.length > 0 && <small>{item.animalCodes.slice(0, 5).join(", ")}{item.animalCodes.length > 5 ? "..." : ""}</small>}
                </article>
              );
            })
          )}
        </aside>
      </div>
    </section>
  );
}
