export const WORK_STATUS_VALUES = ["dang_mo", "sap_toi", "qua_han", "tam_dung", "hoan_thanh", "da_huy"] as const;
export type WorkStatus = (typeof WORK_STATUS_VALUES)[number];

export const WORK_TYPE_VALUES = ["tong_quat", "bao_tri", "canh_tac", "chan_nuoi", "kiem_tra"] as const;
export type WorkType = (typeof WORK_TYPE_VALUES)[number];

export const WORK_ITEM_STATUS_VALUES = ["chua_lam", "dang_lam", "hoan_thanh", "da_huy"] as const;
export type WorkItemStatus = (typeof WORK_ITEM_STATUS_VALUES)[number];

export const WORK_PRIORITY_VALUES = ["thap", "trung_binh", "cao", "khan_cap"] as const;
export type WorkPriority = (typeof WORK_PRIORITY_VALUES)[number];

export type WorkItem = {
  id: string;
  title: string;
  status: WorkItemStatus;
  priority: WorkPriority;
  dueDate: string | null;
  assignee: string | null;
  reporter: string | null;
  zoneId: string | null;
  zoneName: string | null;
  estimate: string | null;
  attachments: WorkAttachment[];
  note: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type WorkAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  uploadedBy: string | null;
};

export type WorkTask = {
  id: string;
  code: string;
  title: string;
  type: WorkType;
  status: WorkStatus;
  startDate: string | null;
  dueDate: string | null;
  owner: string | null;
  description: string | null;
  items: WorkItem[];
  createdAt: string | null;
  updatedAt: string | null;
};

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  dang_mo: "Đang mở",
  sap_toi: "Sắp tới",
  qua_han: "Quá hạn",
  tam_dung: "Tạm dừng",
  hoan_thanh: "Hoàn thành",
  da_huy: "Đã hủy",
};

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  tong_quat: "Tổng quát",
  bao_tri: "Bảo trì",
  canh_tac: "Canh tác",
  chan_nuoi: "Chăn nuôi",
  kiem_tra: "Kiểm tra",
};

export const WORK_ITEM_STATUS_LABELS: Record<WorkItemStatus, string> = {
  chua_lam: "Cần làm",
  dang_lam: "Đang làm",
  hoan_thanh: "Hoàn thành",
  da_huy: "Đã hủy",
};

export const WORK_PRIORITY_LABELS: Record<WorkPriority, string> = {
  thap: "Thấp",
  trung_binh: "Trung bình",
  cao: "Cao",
  khan_cap: "Khẩn cấp",
};

export function isWorkStatus(value: unknown): value is WorkStatus {
  return WORK_STATUS_VALUES.includes(value as WorkStatus);
}

export function isWorkType(value: unknown): value is WorkType {
  return WORK_TYPE_VALUES.includes(value as WorkType);
}

export function isWorkItemStatus(value: unknown): value is WorkItemStatus {
  return WORK_ITEM_STATUS_VALUES.includes(value as WorkItemStatus);
}

export function isWorkPriority(value: unknown): value is WorkPriority {
  return WORK_PRIORITY_VALUES.includes(value as WorkPriority);
}
