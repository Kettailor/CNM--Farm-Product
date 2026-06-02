"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import styles from "./page.module.css";

export type WorkCardStatus = "overdue" | "active" | "upcoming" | "paused" | "completed" | "cancelled";
type DbWorkStatus = "dang_mo" | "sap_toi" | "qua_han" | "tam_dung" | "hoan_thanh";
type DbWorkType = "tong_quat" | "bao_tri" | "canh_tac" | "chan_nuoi" | "kiem_tra";
type DbWorkItemStatus = "chua_lam" | "dang_lam" | "hoan_thanh" | "da_huy";
type DbWorkPriority = "thap" | "trung_binh" | "cao" | "khan_cap";

type WorkAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  uploadedBy: string | null;
};

export type WorkTaskItem = {
  id: string;
  title: string;
  status: DbWorkItemStatus;
  priority: DbWorkPriority;
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

export type WorkOverviewItem = {
  id: string;
  title: string;
  status: WorkCardStatus;
  completedItems: number;
  totalItems: number;
  owner: string | null;
  createdAt: string;
  dueDate: string | null;
  workType: string;
  description: string;
  items: WorkTaskItem[];
};

export type WorkUserOption = {
  id: string;
  name: string;
  email: string | null;
};

export type WorkZoneOption = {
  id: string;
  name: string;
  color: string;
  polygon: Array<{ lat: number; lng: number }>;
};

type Props = {
  initialTasks: WorkOverviewItem[];
  initialSelectedTaskId?: string | null;
  users: WorkUserOption[];
  zones: WorkZoneOption[];
  lat: number;
  lng: number;
  canWrite: boolean;
};

type TabKey = "open" | "closed";
type DetailView = "list" | "calendar" | "status" | "map";
type WorkFormMode = "create" | "edit";
type CalendarMode = "month" | "week" | "day";
type DetailColumnKey =
  | "name"
  | "description"
  | "paddock"
  | "reporter"
  | "estimate"
  | "status"
  | "priority"
  | "dueDate"
  | "assignees"
  | "created"
  | "updated";

type DetailFilters = {
  query: string;
  zoneId: string;
  status: string;
  priority: string;
  assignee: string;
  onlyMine: boolean;
  recentlyUpdated: boolean;
};

type DraftWork = {
  title: string;
  description: string;
};

type DraftWorkTask = {
  title: string;
  description: string;
  estimate: string;
  assignee: string;
  reporter: string;
  priority: DbWorkPriority;
  dueDate: string;
  zoneId: string;
};

type ConfirmDialog =
  | { kind: "work"; workId: string; title: string }
  | { kind: "item"; item: WorkTaskItem };

type ApiWorkItem = {
  id: string;
  title: string;
  status: DbWorkItemStatus;
  priority: DbWorkPriority;
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

type ApiWorkTask = {
  id: string;
  title: string;
  type: DbWorkType;
  status: DbWorkStatus | "da_huy";
  startDate: string | null;
  dueDate: string | null;
  owner: string | null;
  description: string | null;
  createdAt: string | null;
  items: ApiWorkItem[];
};

const STATUS_LABELS: Record<WorkCardStatus, string> = {
  overdue: "Quá hạn",
  active: "Đang mở",
  upcoming: "Sắp tới",
  paused: "Tạm dừng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const WORK_TYPE_LABELS: Record<DbWorkType, string> = {
  tong_quat: "Tổng quát",
  bao_tri: "Bảo trì",
  canh_tac: "Canh tác",
  chan_nuoi: "Chăn nuôi",
  kiem_tra: "Kiểm tra",
};

const ITEM_STATUS_LABELS: Record<DbWorkItemStatus, string> = {
  chua_lam: "Cần làm",
  dang_lam: "Đang làm",
  hoan_thanh: "Hoàn thành",
  da_huy: "Đã hủy",
};

const PRIORITY_LABELS: Record<DbWorkPriority, string> = {
  thap: "Thấp",
  trung_binh: "Trung bình",
  cao: "Cao",
  khan_cap: "Khẩn cấp",
};

const emptyDraft: DraftWork = {
  title: "",
  description: "",
};

const emptyTaskDraft: DraftWorkTask = {
  title: "",
  description: "",
  estimate: "",
  assignee: "",
  reporter: "",
  priority: "trung_binh",
  dueDate: "",
  zoneId: "",
};

const DETAIL_COLUMN_LABELS: Record<DetailColumnKey, string> = {
  name: "Tên",
  description: "Mô tả",
  paddock: "Khu vực",
  reporter: "Người báo cáo",
  estimate: "Dự toán ban đầu (giờ)",
  status: "Trạng thái",
  priority: "Ưu tiên",
  dueDate: "Hạn hoàn thành",
  assignees: "Người phụ trách",
  created: "Ngày tạo",
  updated: "Ngày cập nhật",
};

const DETAIL_COLUMN_ORDER: DetailColumnKey[] = [
  "name",
  "description",
  "paddock",
  "reporter",
  "estimate",
  "status",
  "priority",
  "dueDate",
  "assignees",
  "created",
  "updated",
];

const DEFAULT_DETAIL_COLUMNS: Record<DetailColumnKey, boolean> = {
  name: true,
  description: false,
  paddock: false,
  reporter: false,
  estimate: false,
  status: true,
  priority: true,
  dueDate: true,
  assignees: true,
  created: false,
  updated: false,
};

const DEFAULT_DETAIL_FILTERS: DetailFilters = {
  query: "",
  zoneId: "all",
  status: "all",
  priority: "all",
  assignee: "all",
  onlyMine: false,
  recentlyUpdated: false,
};

const DETAIL_PAGE_SIZE = 100;

function Icon({ name }: { name: string }) {
  switch (name) {
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3v4M17 3v4" />
          <path d="M4 7h16v13H4z" />
          <path d="M7 11h3M14 11h3M7 15h3M14 15h3" />
        </svg>
      );
    case "back":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      );
    case "forward":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case "edit":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
          <path d="m14 8 2 2" />
        </svg>
      );
    case "folder":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
      );
    case "plus":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8.5Z" />
        </svg>
      );
    case "trash":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M10 11v6M14 11v6" />
          <path d="M6 7l1 14h10l1-14" />
          <path d="M9 7V4h6v3" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
      );
    case "close":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
    case "download":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v10" />
          <path d="m8 10 4 4 4-4" />
          <path d="M5 18h14" />
        </svg>
      );
    case "print":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 8V4h10v4" />
          <path d="M7 17H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" />
          <path d="M7 14h10v6H7z" />
        </svg>
      );
    case "columns":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5v14" />
          <path d="M12 5v14" />
          <path d="M19 5v14" />
        </svg>
      );
    case "filter":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M7 12h10" />
          <path d="M10 17h4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12h16" />
        </svg>
      );
  }
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function progressOf(task: WorkOverviewItem) {
  if (task.totalItems <= 0) return 0;
  return clamp(Math.round((task.completedItems / task.totalItems) * 100), 0, 100);
}

function mapApiStatus(task: ApiWorkTask): WorkCardStatus {
  const current = new Date().toISOString().slice(0, 10);
  if (task.status === "da_huy") return "cancelled";
  if (task.status === "hoan_thanh") return "completed";
  if (task.status === "tam_dung") return "paused";
  if (task.status === "qua_han") return "overdue";
  if (task.dueDate && task.dueDate < current) return "overdue";
  if (task.status === "sap_toi" || (task.startDate && task.startDate > current)) return "upcoming";
  return "active";
}

function mapApiTask(task: ApiWorkTask): WorkOverviewItem {
  const totalItems = task.items.filter((item) => item.status !== "da_huy").length;
  const completedItems = task.status === "hoan_thanh"
    ? totalItems
    : task.items.filter((item) => item.status === "hoan_thanh").length;
  const items = task.items.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    priority: item.priority,
    dueDate: item.dueDate,
    assignee: item.assignee,
    reporter: item.reporter,
    zoneId: item.zoneId,
    zoneName: item.zoneName,
    estimate: item.estimate,
    attachments: item.attachments ?? [],
    note: item.note,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return {
    id: task.id,
    title: task.title,
    status: mapApiStatus(task),
    completedItems,
    totalItems,
    owner: task.owner,
    createdAt: task.createdAt?.slice(0, 10) ?? task.startDate ?? new Date().toISOString().slice(0, 10),
    dueDate: task.dueDate,
    workType: WORK_TYPE_LABELS[task.type] ?? "Công việc",
    description: task.description || `${WORK_TYPE_LABELS[task.type] ?? "Công việc"} - ${totalItems} hạng mục công việc.`,
    items,
  };
}

function WorkCard({ task, onOpen }: { task: WorkOverviewItem; onOpen: () => void }) {
  const progress = progressOf(task);
  const progressStyle = { "--progress": `${progress}%` } as CSSProperties;

  return (
    <button type="button" className={styles.workCard} onClick={onOpen}>
      <h2>{task.title}</h2>
      <div className={styles.cardDivider} />

      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span>
            Trạng thái: <b data-status={task.status}>{STATUS_LABELS[task.status]}</b>
          </span>
          <span>
            Hạng mục: <strong>{task.completedItems}/{task.totalItems}</strong>
          </span>
          <span>
            Phụ trách: <strong>{task.owner || "-"}</strong>
          </span>
          <span>
            Loại: <strong>{task.workType}</strong>
          </span>
          <span>
            Ngày tạo: <strong>{formatDate(task.createdAt)}</strong>
          </span>
          <span>
            Hạn hoàn thành: <strong>{formatDate(task.dueDate)}</strong>
          </span>
        </div>

        {task.status === "completed" ? (
          <div className={styles.completedMark} aria-label="Hoàn thành">
            <Icon name="check" />
          </div>
        ) : (
          <div className={styles.progressWrap}>
            <div className={styles.progressRing} style={progressStyle}>
              <span>{progress}%</span>
            </div>
            <small>Hoàn thành</small>
          </div>
        )}
      </div>

      <div className={styles.descriptionBlock}>
        <span>Mô tả:</span>
        <p>{task.description}</p>
      </div>
    </button>
  );
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function DetailListView({ task, onNewTask }: { task: WorkOverviewItem; onNewTask: () => void }) {
  const visibleItems = task.items.filter((item) => item.status !== "da_huy");

  return (
    <section className={styles.detailPanel}>
      <div className={styles.panelTitle}>CÔNG VIỆC: DANH SÁCH</div>
      <div className={styles.tableToolbar}>
        <button type="button" aria-label="Tìm kiếm">⌕</button>
        <button type="button" aria-label="Tải xuống">⇩</button>
        <button type="button" aria-label="In">▣</button>
        <button type="button" aria-label="Cột">▥</button>
        <button type="button" aria-label="Lọc">≡</button>
        <button type="button" aria-label="Thêm nhiệm vụ" onClick={onNewTask}>＋</button>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.detailTable}>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Trạng thái</th>
              <th>Ưu tiên</th>
              <th>Hạn hoàn thành</th>
              <th>Phụ trách</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length > 0 ? (
              visibleItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>
                    <span className={styles.statusPill} data-status={item.status}>
                      {ITEM_STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td>
                    <span className={styles.priorityPill} data-priority={item.priority}>
                      {PRIORITY_LABELS[item.priority]}
                    </span>
                  </td>
                  <td>{formatDate(item.dueDate)}</td>
                  <td>{item.assignee || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className={styles.emptyCell}>
                  Không tìm thấy bản ghi phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.tableFooter}>
        <span>Số dòng mỗi trang:</span>
        <strong>100</strong>
        <span>{visibleItems.length > 0 ? `1-${visibleItems.length} của ${visibleItems.length}` : "0-0 của 0"}</span>
      </div>
    </section>
  );
}

export function DetailCalendarView({ task }: { task: WorkOverviewItem }) {
  const base = task.dueDate ? new Date(`${task.dueDate}T00:00:00`) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const totalDays = daysInMonth(year, month);
  const previousDays = daysInMonth(year, month - 1);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - startOffset + 1;
    if (day < 1) return { day: previousDays + day, muted: true };
    if (day > totalDays) return { day: day - totalDays, muted: true };
    return { day, muted: false };
  });
  const monthLabel = base.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const itemsByDay = new Map<number, WorkTaskItem[]>();
  for (const item of task.items) {
    if (!item.dueDate || item.status === "da_huy") continue;
    const due = new Date(`${item.dueDate}T00:00:00`);
    if (due.getFullYear() !== year || due.getMonth() !== month) continue;
    const dayItems = itemsByDay.get(due.getDate()) ?? [];
    itemsByDay.set(due.getDate(), [...dayItems, item]);
  }

  return (
    <section className={styles.detailPanel}>
      <div className={styles.panelTitle}>CÔNG VIỆC: LỊCH</div>
      <div className={styles.calendarControls}>
        <div>
          <button type="button">Hôm nay</button>
          <button type="button">Trước</button>
          <button type="button">Sau</button>
        </div>
        <strong>{monthLabel}</strong>
        <div>
          <button type="button" className={styles.controlActive}>Tháng</button>
          <button type="button">Tuần</button>
          <button type="button">Ngày</button>
        </div>
      </div>
      <div className={styles.calendarGrid}>
        {["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"].map((label) => (
          <div key={label} className={styles.calendarHead}>{label}</div>
        ))}
        {cells.map((cell, index) => (
          <div key={`${cell.day}-${index}`} className={`${styles.calendarCell} ${cell.muted ? styles.calendarMuted : ""}`}>
            <span>{String(cell.day).padStart(2, "0")}</span>
            {!cell.muted && (itemsByDay.get(cell.day) ?? []).slice(0, 3).map((item) => (
              <small key={item.id}>{item.title}</small>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function DetailStatusView({ task, onNewTask }: { task: WorkOverviewItem; onNewTask: () => void }) {
  const columns: Array<{ status: DbWorkItemStatus; title: string }> = [
    { status: "chua_lam", title: "Cần làm" },
    { status: "dang_lam", title: "Đang làm" },
    { status: "hoan_thanh", title: "Hoàn thành" },
  ];
  const itemsByStatus = new Map<DbWorkItemStatus, WorkTaskItem[]>();
  for (const item of task.items) {
    if (item.status === "da_huy") continue;
    const current = itemsByStatus.get(item.status) ?? [];
    itemsByStatus.set(item.status, [...current, item]);
  }

  return (
    <section className={styles.detailPanel}>
      <div className={styles.panelTitle}>CÔNG VIỆC: TRẠNG THÁI</div>
      <div className={styles.statusTools}>
        <button type="button" className={styles.newTaskButton} onClick={onNewTask}>Nhiệm vụ mới</button>
        <div className={styles.statusFilters}>
          <input aria-label="Tìm kiếm" />
          <span className={styles.avatar}>K</span>
          <span className={styles.avatarBlue}>T</span>
          <button type="button">Của tôi</button>
          <button type="button">Cập nhật gần đây</button>
        </div>
      </div>
      <div className={styles.kanbanGrid}>
        {columns.map((column) => {
          const items = itemsByStatus.get(column.status) ?? [];
          return (
            <section key={column.status}>
              <h3>{column.title} ({items.length})</h3>
              <div className={styles.kanbanItems}>
                {items.map((item) => (
                  <article key={item.id} className={styles.taskCard}>
                    <div>
                      <strong>{item.title}</strong>
                      {item.note && <p>{item.note}</p>}
                    </div>
                    <div className={styles.taskCardMeta}>
                      <span className={styles.priorityPill} data-priority={item.priority}>
                        {PRIORITY_LABELS[item.priority]}
                      </span>
                      <span>{formatDate(item.dueDate)}</span>
                      <span>{item.assignee || "Chưa phân công"}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function DetailMapView({ task, zones, lat, lng }: { task: WorkOverviewItem; zones: WorkZoneOption[]; lat: number; lng: number }) {
  const taskZones = new Set(task.items.map((item) => item.zoneId).filter(Boolean));
  const mapZones = taskZones.size > 0 ? zones.filter((zone) => taskZones.has(zone.id)) : zones;

  return (
    <section className={styles.detailPanel}>
      <div className={styles.panelTitle}>CÔNG VIỆC: BẢN ĐỒ</div>
      <div className={styles.mapSwitches}>
        <span>Khu vực ({mapZones.length})</span>
        <span>Nhiệm vụ ({task.items.filter((item) => item.status !== "da_huy").length})</span>
      </div>
      <MapViewSwitcher
        lat={lat}
        lng={lng}
        zoom={17}
        title={`Bản đồ công việc ${task.title}`}
        zones={mapZones}
        fitToPolygon={mapZones.length > 0}
        frameClassName={styles.mapFrame}
        hideModeTabs
        hideEcoNote
      />
    </section>
  );
}

function dateFromYmd(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const offset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - offset);
  next.setHours(0, 0, 0, 0);
  return next;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function displayStatus(value: DbWorkItemStatus) {
  if (value === "dang_lam") return "Đang làm";
  if (value === "hoan_thanh") return "Hoàn thành";
  if (value === "da_huy") return "Đã hủy";
  return "Cần làm";
}

function displayPriority(value: DbWorkPriority) {
  if (value === "cao" || value === "khan_cap") return "Cao";
  if (value === "trung_binh") return "Trung bình";
  return "Thấp";
}

function itemSearchText(item: WorkTaskItem) {
  return [item.title, item.note, item.assignee, item.reporter, item.zoneName, displayStatus(item.status), displayPriority(item.priority)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterWorkItems(items: WorkTaskItem[], filters: DetailFilters, currentUserName: string) {
  const query = filters.query.trim().toLowerCase();
  const currentUser = currentUserName.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (item.status === "da_huy") return false;
    if (query && !itemSearchText(item).includes(query)) return false;
    if (filters.zoneId !== "all" && (item.zoneId || "__none__") !== filters.zoneId) return false;
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.priority !== "all" && item.priority !== filters.priority) return false;
    if (filters.assignee !== "all" && (item.assignee || "__none__") !== filters.assignee) return false;
    if (filters.onlyMine && currentUser && (item.assignee || "").trim().toLowerCase() !== currentUser) return false;
    return true;
  });
  if (!filters.recentlyUpdated) return filtered;
  return [...filtered].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}

function initials(value: string | null) {
  const text = String(value ?? "").trim();
  if (!text) return "?";
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function avatarTone(value: string | null) {
  const tones = ["blue", "lime", "purple", "violet", "orange"];
  const total = String(value ?? "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[total % tones.length];
}

function assigneesFromItems(items: WorkTaskItem[]) {
  return Array.from(new Set(items.map((item) => item.assignee).filter((value): value is string => Boolean(value))));
}

function samePersonName(a: string | null, b: string | null) {
  return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
}

function canUploadWorkItemFiles(currentUserName: string, item: WorkTaskItem) {
  return samePersonName(currentUserName, item.assignee) || samePersonName(currentUserName, item.reporter);
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function fileSafeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "cong-viec";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function workItemRows(items: WorkTaskItem[]) {
  return items.map((item, index) => ({
    index: index + 1,
    title: item.title,
    note: item.note || "",
    zoneName: item.zoneName || "",
    reporter: item.reporter || "",
    assignee: item.assignee || "",
    status: displayStatus(item.status),
    priority: displayPriority(item.priority),
    dueDate: formatDate(item.dueDate),
    estimate: item.estimate || "",
    attachments: item.attachments.length,
    createdAt: formatDate(item.createdAt?.slice(0, 10) ?? null),
    updatedAt: formatDate(item.updatedAt?.slice(0, 10) ?? null),
  }));
}

function exportWorkItemsToExcel(task: WorkOverviewItem, items: WorkTaskItem[]) {
  const rows = workItemRows(items);
  const headers = ["STT", "Tên nhiệm vụ", "Mô tả", "Khu vực", "Người báo cáo", "Người phụ trách", "Trạng thái", "Ưu tiên", "Hạn hoàn thành", "Dự toán", "Tệp đính kèm", "Ngày tạo", "Cập nhật"];
  const bodyRows = rows.map((row) => [
    row.index,
    row.title,
    row.note,
    row.zoneName,
    row.reporter,
    row.assignee,
    row.status,
    row.priority,
    row.dueDate,
    row.estimate,
    row.attachments,
    row.createdAt,
    row.updatedAt,
  ]);
  const table = [
    `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`,
    ...bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`),
  ].join("");
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><h2>${escapeHtml(task.title)}</h2><table border="1">${table}</table></body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileSafeName(task.title)}-nhiem-vu.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printWorkItemsAsPdf(task: WorkOverviewItem, items: WorkTaskItem[]) {
  const rows = workItemRows(items);
  const printedAt = new Date().toLocaleString("vi-VN");
  const tableRows = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.index)}</td>
      <td><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.note)}</small></td>
      <td>${escapeHtml(row.zoneName || "-")}</td>
      <td>${escapeHtml(row.reporter || "-")}</td>
      <td>${escapeHtml(row.assignee || "-")}</td>
      <td>${escapeHtml(row.status)}</td>
      <td>${escapeHtml(row.priority)}</td>
      <td>${escapeHtml(row.dueDate)}</td>
      <td>${escapeHtml(row.estimate || "-")}</td>
      <td>${escapeHtml(row.attachments)}</td>
    </tr>
  `).join("");
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(task.title)} - Nhiệm vụ</title>
        <style>
          @page { size: A4 landscape; margin: 14mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111827; font-family: Arial, sans-serif; font-size: 12px; }
          header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #1f7a4a; padding-bottom: 10px; margin-bottom: 14px; }
          h1 { margin: 0 0 6px; font-size: 22px; color: #14532d; }
          p { margin: 0; color: #475467; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #ecfdf3; color: #14532d; font-size: 11px; text-transform: uppercase; }
          th, td { border: 1px solid #d0d5dd; padding: 7px 8px; vertical-align: top; text-align: left; }
          td:first-child { text-align: center; width: 36px; }
          small { display: block; margin-top: 4px; color: #667085; line-height: 1.35; }
          footer { margin-top: 12px; color: #667085; font-size: 11px; text-align: right; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>${escapeHtml(task.title)}</h1>
            <p>Danh sách nhiệm vụ: ${escapeHtml(rows.length)} mục</p>
          </div>
          <p>Ngày in: ${escapeHtml(printedAt)}</p>
        </header>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Nhiệm vụ</th>
              <th>Khu vực</th>
              <th>Báo cáo</th>
              <th>Phụ trách</th>
              <th>Trạng thái</th>
              <th>Ưu tiên</th>
              <th>Hạn</th>
              <th>Dự toán</th>
              <th>Tệp</th>
            </tr>
          </thead>
          <tbody>${tableRows || `<tr><td colspan="10">Không có nhiệm vụ để in.</td></tr>`}</tbody>
        </table>
        <footer>Farmdeck</footer>
      </body>
    </html>
  `);
  doc.close();
  window.setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 1000);
  }, 100);
}

function readAttachmentFile(file: File): Promise<Omit<WorkAttachment, "uploadedAt" | "uploadedBy">> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      dataUrl: String(reader.result ?? ""),
    });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

type DetailToolbarProps = {
  task: WorkOverviewItem;
  taskItems: WorkTaskItem[];
  visibleItems: WorkTaskItem[];
  zones: WorkZoneOption[];
  filters: DetailFilters;
  columns: Record<DetailColumnKey, boolean>;
  onFilterChange: <K extends keyof DetailFilters>(key: K, value: DetailFilters[K]) => void;
  onColumnChange: (key: DetailColumnKey) => void;
  onResetFilters: () => void;
  onNewTask: () => void;
  showColumns?: boolean;
  canWrite: boolean;
};

function FarmdeckToolbar({
  task,
  taskItems,
  visibleItems,
  zones,
  filters,
  columns,
  onFilterChange,
  onColumnChange,
  onResetFilters,
  onNewTask,
  showColumns = true,
  canWrite,
}: DetailToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const assignees = assigneesFromItems(taskItems);
  const zoneOptions = zones.filter((zone) => taskItems.some((item) => item.zoneId === zone.id));
  const hasUnknownZone = taskItems.some((item) => !item.zoneId && item.zoneName);

  return (
    <div className={styles.detailToolbar}>
      <div className={`${styles.searchBar} ${searchOpen ? styles.searchBarOpen : ""}`}>
        {searchOpen && (
          <input autoFocus value={filters.query} onChange={(event) => onFilterChange("query", event.target.value)} aria-label="Tìm kiếm nhiệm vụ" />
        )}
        <button type="button" className={filters.query || searchOpen ? styles.toolActive : ""} onClick={() => setSearchOpen((value) => !value)} aria-label="Tìm kiếm">
          <Icon name="search" />
        </button>
        {searchOpen && (
          <button type="button" aria-label="Xóa tìm kiếm" onClick={() => onFilterChange("query", "")}>
            <Icon name="close" />
          </button>
        )}
      </div>

      <div className={styles.toolbarIcons}>
        <button type="button" aria-label="Tải Excel" title="Tải Excel" onClick={() => exportWorkItemsToExcel(task, visibleItems)}>
          <Icon name="download" />
        </button>
        <button type="button" aria-label="In PDF" title="In hoặc lưu PDF" onClick={() => printWorkItemsAsPdf(task, visibleItems)}>
          <Icon name="print" />
        </button>
        {showColumns && (
          <span className={styles.toolbarPopoverWrap}>
            <button type="button" className={columnsOpen ? styles.toolActive : ""} aria-label="Cột hiển thị" onClick={() => {
              setColumnsOpen((value) => !value);
              setFiltersOpen(false);
            }}>
              <Icon name="columns" />
            </button>
            {columnsOpen && (
              <div className={styles.columnsMenu}>
                <button type="button" className={styles.popoverClose} onClick={() => setColumnsOpen(false)} aria-label="Đóng cấu hình cột">
                  <Icon name="close" />
                </button>
                <strong>Cột</strong>
                {DETAIL_COLUMN_ORDER.map((key) => (
                  <label key={key}>
                    <input type="checkbox" checked={columns[key]} onChange={() => onColumnChange(key)} />
                    <span>{DETAIL_COLUMN_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            )}
          </span>
        )}
        <span className={styles.toolbarPopoverWrap}>
          <button type="button" className={filtersOpen ? styles.toolActive : ""} aria-label="Bộ lọc" onClick={() => {
            setFiltersOpen((value) => !value);
            setColumnsOpen(false);
          }}>
            <Icon name="filter" />
          </button>
          {filtersOpen && (
            <div className={styles.filtersMenu}>
              <button type="button" className={styles.popoverClose} onClick={() => setFiltersOpen(false)} aria-label="Đóng bộ lọc">
                <Icon name="close" />
              </button>
              <header>
                <strong>BỘ LỌC</strong>
                <button type="button" onClick={onResetFilters}>ĐẶT LẠI</button>
              </header>
              <label>
                <span>Khu vực</span>
                <select value={filters.zoneId} onChange={(event) => onFilterChange("zoneId", event.target.value)}>
                  <option value="all">Tất cả</option>
                  {zoneOptions.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                  {hasUnknownZone && <option value="__none__">Chưa có khu vực</option>}
                </select>
              </label>
              <label>
                <span>Trạng thái</span>
                <select value={filters.status} onChange={(event) => onFilterChange("status", event.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="chua_lam">Cần làm</option>
                  <option value="dang_lam">Đang làm</option>
                  <option value="hoan_thanh">Hoàn thành</option>
                </select>
              </label>
              <label>
                <span>Ưu tiên</span>
                <select value={filters.priority} onChange={(event) => onFilterChange("priority", event.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="khan_cap">Khẩn cấp</option>
                  <option value="cao">Cao</option>
                  <option value="trung_binh">Trung bình</option>
                  <option value="thap">Thấp</option>
                </select>
              </label>
              <label>
                <span>Người phụ trách</span>
                <select value={filters.assignee} onChange={(event) => onFilterChange("assignee", event.target.value)}>
                  <option value="all">Tất cả</option>
                  {assignees.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
            </div>
          )}
        </span>
        {canWrite && <button type="button" aria-label="Thêm nhiệm vụ" onClick={onNewTask}><Icon name="plus" /></button>}
      </div>
    </div>
  );
}

type DetailViewProps = {
  task: WorkOverviewItem;
  visibleItems: WorkTaskItem[];
  zones: WorkZoneOption[];
  filters: DetailFilters;
  columns: Record<DetailColumnKey, boolean>;
  onFilterChange: <K extends keyof DetailFilters>(key: K, value: DetailFilters[K]) => void;
  onColumnChange: (key: DetailColumnKey) => void;
  onResetFilters: () => void;
  onNewTask: () => void;
  onEditItem: (item: WorkTaskItem) => void;
  onDeleteItem: (item: WorkTaskItem) => void;
  onToggleComplete: (item: WorkTaskItem) => void;
  onChangeStatus: (item: WorkTaskItem, status: DbWorkItemStatus) => void;
  onUploadFiles: (item: WorkTaskItem, files: FileList | null) => void;
  deletingItemId: string | null;
  updatingItemId: string | null;
  currentUserName: string;
  canWrite: boolean;
};

function FarmdeckListView(props: DetailViewProps) {
  const { task, visibleItems, filters, columns, onEditItem, onDeleteItem, onToggleComplete, onChangeStatus, onUploadFiles, deletingItemId, updatingItemId, currentUserName, canWrite } = props;
  const [pageIndex, setPageIndex] = useState(0);
  const activeColumns = DETAIL_COLUMN_ORDER.filter((key) => columns[key]);
  const colSpan = activeColumns.length + (canWrite ? 3 : 0);
  const totalItems = visibleItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / DETAIL_PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pageStart = safePageIndex * DETAIL_PAGE_SIZE;
  const pagedItems = visibleItems.slice(pageStart, pageStart + DETAIL_PAGE_SIZE);
  const rangeStart = totalItems === 0 ? 0 : pageStart + 1;
  const rangeEnd = totalItems === 0 ? 0 : pageStart + pagedItems.length;
  const canGoPrevious = safePageIndex > 0;
  const canGoNext = safePageIndex < totalPages - 1;

  useEffect(() => {
    setPageIndex(0);
  }, [task.id, filters.query, filters.zoneId, filters.status, filters.priority, filters.assignee, filters.onlyMine, filters.recentlyUpdated]);

  useEffect(() => {
    setPageIndex((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  return (
    <section className={styles.detailPanel}>
      <div className={styles.panelTop}>
        <div className={styles.panelTitle}>NHIỆM VỤ: DANH SÁCH</div>
      </div>
      <FarmdeckToolbar {...props} taskItems={task.items} visibleItems={visibleItems} />
      <div className={styles.tableScroll}>
        <table className={styles.detailTable}>
          <thead>
            <tr>
              {canWrite && <th className={styles.checkColumn} aria-label="Chọn" />}
              {canWrite && <th className={styles.editColumn} aria-label="Sửa" />}
              {canWrite && <th className={styles.deleteColumn} aria-label="Xóa" />}
              {activeColumns.map((key) => <th key={key}>{DETAIL_COLUMN_LABELS[key]}</th>)}
            </tr>
          </thead>
          <tbody>
            {pagedItems.length > 0 ? pagedItems.map((item) => (
              <tr key={item.id}>
                {canWrite && <td className={styles.checkColumn}>
                  <input
                    type="checkbox"
                    checked={item.status === "hoan_thanh"}
                    onChange={() => onToggleComplete(item)}
                    disabled={!samePersonName(currentUserName, item.assignee) || updatingItemId === item.id}
                    aria-label={`Cập nhật hoàn thành ${item.title}`}
                  />
                </td>}
                {canWrite && <td className={styles.editColumn}>
                  <button
                    type="button"
                    aria-label={`Sửa ${item.title}`}
                    onClick={() => onEditItem(item)}
                    disabled={!samePersonName(currentUserName, item.reporter)}
                    title={samePersonName(currentUserName, item.reporter) ? "Sửa nhiệm vụ" : "Chỉ người báo cáo được sửa nhiệm vụ"}
                  >
                    <Icon name="edit" />
                  </button>
                </td>}
                {canWrite && <td className={styles.deleteColumn}>
                  <button
                    type="button"
                    aria-label={`Xóa ${item.title}`}
                    onClick={() => onDeleteItem(item)}
                    disabled={deletingItemId === item.id}
                  >
                    <Icon name="trash" />
                  </button>
                </td>}
                {activeColumns.map((key) => (
                  <td key={key} className={key === "name" ? styles.nameCell : undefined}>
                    {key === "name" && (
                      <>
                        {item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10) && item.status !== "hoan_thanh" && <span className={styles.overdueBadge}>Quá hạn</span>}
                        {item.title}
                        <span className={styles.itemMetaLine}>
                          {item.attachments.length > 0 ? `${item.attachments.length} tệp đính kèm` : "Chưa có tệp"}
                          {canWrite && canUploadWorkItemFiles(currentUserName, item) && item.status !== "hoan_thanh" && (
                            <label className={styles.inlineUpload}>
                              <input
                                type="file"
                                multiple
                                accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                disabled={updatingItemId === item.id}
                                onChange={(event) => {
                                  onUploadFiles(item, event.currentTarget.files);
                                  event.currentTarget.value = "";
                                }}
                              />
                              Tải tệp
                            </label>
                          )}
                        </span>
                      </>
                    )}
                    {key === "description" && (item.note || "-")}
                    {key === "paddock" && (item.zoneName || "-")}
                    {key === "reporter" && (item.reporter || "-")}
                    {key === "estimate" && (item.estimate || "-")}
                    {key === "status" && (
                      canWrite && samePersonName(currentUserName, item.assignee) ? (
                        <select
                          className={styles.statusSelect}
                          value={item.status}
                          onChange={(event) => onChangeStatus(item, event.target.value as DbWorkItemStatus)}
                          disabled={updatingItemId === item.id}
                          aria-label={`Cập nhật trạng thái ${item.title}`}
                        >
                          <option value="chua_lam">Cần làm</option>
                          <option value="dang_lam">Đang làm</option>
                          <option value="hoan_thanh">Hoàn thành</option>
                        </select>
                      ) : (
                        <span className={styles.statusDot} data-status={item.status}>{displayStatus(item.status)}</span>
                      )
                    )}
                    {key === "priority" && <span className={styles.priorityText} data-priority={item.priority}>{displayPriority(item.priority)}</span>}
                    {key === "dueDate" && formatDate(item.dueDate)}
                    {key === "assignees" && (item.assignee ? <span className={styles.avatarStack}><span className={styles.assigneeAvatar} data-tone={avatarTone(item.assignee)}>{initials(item.assignee)}</span></span> : "-")}
                    {key === "created" && formatDate(item.createdAt?.slice(0, 10) ?? null)}
                    {key === "updated" && formatDate(item.createdAt?.slice(0, 10) ?? null)}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={colSpan} className={styles.emptyCell}>Không có nhiệm vụ phù hợp với bộ lọc hiện tại.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.tableFooter}>
        <span>Số dòng mỗi trang:</span>
        <strong>{DETAIL_PAGE_SIZE}</strong>
        <span>{`${rangeStart}-${rangeEnd} / ${totalItems}`}</span>
        <button type="button" disabled={!canGoPrevious} onClick={() => setPageIndex((current) => Math.max(0, current - 1))} aria-label="Trang trước">
          <Icon name="back" />
        </button>
        <button type="button" disabled={!canGoNext} onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))} aria-label="Trang sau">
          <Icon name="forward" />
        </button>
      </div>
    </section>
  );
}

type CalendarProps = DetailViewProps & {
  calendarMode: CalendarMode;
  calendarDate: Date;
  onCalendarModeChange: (mode: CalendarMode) => void;
  onCalendarDateChange: (date: Date) => void;
};

function FarmdeckCalendarView({ visibleItems, calendarMode, calendarDate, onCalendarModeChange, onCalendarDateChange }: CalendarProps) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const totalDays = daysInMonth(year, month);
  const previousDays = daysInMonth(year, month - 1);
  const monthCells = Array.from({ length: 42 }, (_, index) => {
    const day = index - startOffset + 1;
    if (day < 1) return { date: new Date(year, month - 1, previousDays + day), muted: true };
    if (day > totalDays) return { date: new Date(year, month + 1, day - totalDays), muted: true };
    return { date: new Date(year, month, day), muted: false };
  });
  const weekStart = startOfWeek(calendarDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const dayHours = Array.from({ length: 15 }, (_, index) => index + 6);
  const title = calendarMode === "month"
    ? calendarDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
    : calendarMode === "week"
      ? `${weekStart.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} - ${addDays(weekStart, 6).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`
      : calendarDate.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });

  const itemsOnDate = (date: Date) => visibleItems.filter((item) => {
    const due = dateFromYmd(item.dueDate);
    return due ? sameDay(due, date) : false;
  });
  const moveCalendar = (direction: number) => {
    if (calendarMode === "month") onCalendarDateChange(addMonths(calendarDate, direction));
    if (calendarMode === "week") onCalendarDateChange(addDays(calendarDate, direction * 7));
    if (calendarMode === "day") onCalendarDateChange(addDays(calendarDate, direction));
  };

  return (
    <section className={styles.detailPanel}>
      <div className={styles.panelTop}>
        <div className={styles.panelTitle}>NHIỆM VỤ: LỊCH</div>
      </div>
      <div className={styles.calendarControls}>
        <div>
          <button type="button" onClick={() => onCalendarDateChange(new Date())}>Hôm nay</button>
          <button type="button" onClick={() => moveCalendar(-1)}>Trước</button>
          <button type="button" onClick={() => moveCalendar(1)}>Sau</button>
        </div>
        <strong>{title}</strong>
        <div>
          {(["month", "week", "day"] as CalendarMode[]).map((mode) => (
            <button key={mode} type="button" className={calendarMode === mode ? styles.controlActive : ""} onClick={() => onCalendarModeChange(mode)}>
              {mode === "month" ? "Tháng" : mode === "week" ? "Tuần" : "Ngày"}
            </button>
          ))}
        </div>
      </div>
      {calendarMode === "month" && (
        <div className={styles.calendarGrid}>
          {["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"].map((label) => <div key={label} className={styles.calendarHead}>{label}</div>)}
          {monthCells.map((cell) => (
            <div key={cell.date.toISOString()} className={`${styles.calendarCell} ${cell.muted ? styles.calendarMuted : ""}`}>
              <span>{String(cell.date.getDate()).padStart(2, "0")}</span>
              {itemsOnDate(cell.date).slice(0, 3).map((item) => <small key={item.id}>{item.title}</small>)}
            </div>
          ))}
        </div>
      )}
      {calendarMode === "week" && (
        <div className={styles.weekGrid}>
          <div />
          {weekDays.map((day) => <div key={day.toISOString()} className={styles.calendarHead}>{day.toLocaleDateString("vi-VN", { day: "2-digit", weekday: "short" })}</div>)}
          {dayHours.map((hour) => (
            <div key={hour} className={styles.weekRow}>
              <div className={styles.timeCell}>{`${String(hour).padStart(2, "0")}:00`}</div>
              {weekDays.map((day) => <div key={day.toISOString()} className={styles.weekCell}>{hour === 6 && itemsOnDate(day).map((item) => <small key={item.id}>{item.title}</small>)}</div>)}
            </div>
          ))}
        </div>
      )}
      {calendarMode === "day" && (
        <div className={styles.dayGrid}>
          <div className={styles.dayAllDay}>{itemsOnDate(calendarDate).map((item) => <small key={item.id}>{item.title}</small>)}</div>
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className={styles.dayHour}>
              <span>{`${String(hour).padStart(2, "0")}:00`}</span>
              <i />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FarmdeckStatusView(props: DetailViewProps & { users: WorkUserOption[]; currentUserName: string }) {
  const { visibleItems, filters, onFilterChange, onNewTask, users, currentUserName, canWrite } = props;
  const columns: Array<{ status: DbWorkItemStatus; title: string }> = [
    { status: "chua_lam", title: "Cần làm" },
    { status: "dang_lam", title: "Đang làm" },
    { status: "hoan_thanh", title: "Hoàn thành" },
  ];

  return (
    <section className={styles.detailPanel}>
      <div className={styles.panelTop}>
        <div className={styles.panelTitle}>NHIỆM VỤ: TRẠNG THÁI</div>
      </div>
      <div className={styles.statusTools}>
        {canWrite && <button type="button" className={styles.newTaskButton} onClick={onNewTask}>Nhiệm vụ mới</button>}
        <div className={styles.statusFilters}>
          <input aria-label="Tìm kiếm nhiệm vụ theo trạng thái" value={filters.query} onChange={(event) => onFilterChange("query", event.target.value)} />
          <div className={styles.avatarStack}>
            {users.slice(0, 4).map((user) => (
              <button key={user.id} type="button" className={filters.assignee === user.name ? styles.avatarButtonActive : ""} onClick={() => onFilterChange("assignee", filters.assignee === user.name ? "all" : user.name)} aria-label={`Lọc theo ${user.name}`}>
                <span className={styles.assigneeAvatar} data-tone={avatarTone(user.name)}>{initials(user.name)}</span>
              </button>
            ))}
          </div>
          <button type="button" className={filters.onlyMine ? styles.softActive : ""} onClick={() => onFilterChange("onlyMine", !filters.onlyMine)}>Chỉ nhiệm vụ của tôi</button>
          <button type="button" className={filters.recentlyUpdated ? styles.softActive : ""} onClick={() => onFilterChange("recentlyUpdated", !filters.recentlyUpdated)}>Mới cập nhật</button>
        </div>
      </div>
      <div className={styles.kanbanGrid}>
        {columns.map((column) => {
          const items = visibleItems.filter((item) => item.status === column.status);
          return (
            <section key={column.status}>
              <h3>{column.title} ({items.length})</h3>
              <div className={styles.kanbanItems}>
                {items.map((item) => (
                  <article key={item.id} className={styles.taskCard}>
                    <div>
                      <strong>{item.title}</strong>
                      {item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10) && item.status !== "hoan_thanh" && <span className={styles.overdueBadge}>Quá hạn</span>}
                    </div>
                    <div className={styles.taskCardMeta}>
                      <span className={styles.priorityText} data-priority={item.priority}>{displayPriority(item.priority)}</span>
                      <span>Hạn: {formatDate(item.dueDate)}</span>
                      {item.assignee && <span className={styles.assigneeAvatar} data-tone={avatarTone(item.assignee)}>{initials(item.assignee)}</span>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {currentUserName && <span className={styles.srOnly}>Bộ lọc người dùng hiện tại: {currentUserName}</span>}
    </section>
  );
}

function FarmdeckMapView({ task, visibleItems, zones, lat, lng }: { task: WorkOverviewItem; visibleItems: WorkTaskItem[]; zones: WorkZoneOption[]; lat: number; lng: number }) {
  const taskZones = new Set(visibleItems.map((item) => item.zoneId).filter(Boolean));
  const mapZones = taskZones.size > 0 ? zones.filter((zone) => taskZones.has(zone.id)) : zones;

  return (
    <section className={styles.detailPanel}>
      <div className={styles.panelTop}>
        <div className={styles.panelTitle}>NHIỆM VỤ: BẢN ĐỒ</div>
      </div>
      <div className={styles.mapSwitches}>
        <span>Khu vực ({mapZones.length})</span>
        <span>Nhiệm vụ ({visibleItems.length})</span>
      </div>
      <MapViewSwitcher
        lat={lat}
        lng={lng}
        zoom={17}
        title={`Bản đồ nhiệm vụ ${task.title}`}
        zones={mapZones}
        fitToPolygon={mapZones.length > 0}
        frameClassName={styles.mapFrame}
        hideModeTabs
        hideEcoNote
      />
    </section>
  );
}

export default function WorkClient({ initialTasks, initialSelectedTaskId = null, users, zones, lat, lng, canWrite }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState<TabKey>("open");
  const [detailView, setDetailView] = useState<DetailView>("list");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() =>
    initialSelectedTaskId && initialTasks.some((task) => task.id === initialSelectedTaskId)
      ? initialSelectedTaskId
      : null
  );
  const [actionsOpen, setActionsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<WorkFormMode>("create");
  const [draft, setDraft] = useState<DraftWork>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<DraftWorkTask>(emptyTaskDraft);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskMessage, setTaskMessage] = useState("");
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<DraftWorkTask>(emptyTaskDraft);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const [detailFilters, setDetailFilters] = useState<DetailFilters>(DEFAULT_DETAIL_FILTERS);
  const [detailColumns, setDetailColumns] = useState<Record<DetailColumnKey, boolean>>(DEFAULT_DETAIL_COLUMNS);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  useEffect(() => {
    if (!actionsOpen) return;
    const closeOnPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setActionsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActionsOpen(false);
    };
    window.addEventListener("pointerdown", closeOnPointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [actionsOpen]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const groupedTasks = useMemo(() => {
    const open = tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled");
    const closed = tasks.filter((task) => task.status === "completed" || task.status === "cancelled");
    return { open, closed };
  }, [tasks]);

  const visibleTasks = activeTab === "open" ? groupedTasks.open : groupedTasks.closed;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const defaultReporter = users[0]?.name ?? "";
  const workIdFromUrl = searchParams.get("workId");
  const filteredDetailItems = useMemo(
    () => selectedTask ? filterWorkItems(selectedTask.items, detailFilters, defaultReporter) : [],
    [defaultReporter, detailFilters, selectedTask]
  );
  const editingItem = selectedTask?.items.find((item) => item.id === editingItemId) ?? null;

  useEffect(() => {
    if (!workIdFromUrl) {
      setSelectedTaskId(null);
      return;
    }

    setSelectedTaskId(tasks.some((task) => task.id === workIdFromUrl) ? workIdFromUrl : null);
  }, [tasks, workIdFromUrl]);

  const makeWorkUrl = (workId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (workId) {
      params.set("workId", workId);
    } else {
      params.delete("workId");
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const openWorkDetail = (workId: string) => {
    setSelectedTaskId(workId);
    router.push(makeWorkUrl(workId), { scroll: false });
  };

  const closeWorkDetail = () => {
    setSelectedTaskId(null);
    router.push(makeWorkUrl(null), { scroll: false });
  };

  const keepWorkDetail = (workId: string) => {
    if (workIdFromUrl !== workId) {
      router.replace(makeWorkUrl(workId), { scroll: false });
    }
  };

  const updateDraft = <K extends keyof DraftWork>(key: K, value: DraftWork[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateTaskDraft = <K extends keyof DraftWorkTask>(key: K, value: DraftWorkTask[K]) => {
    setTaskDraft((current) => ({ ...current, [key]: value }));
  };

  const updateItemDraft = <K extends keyof DraftWorkTask>(key: K, value: DraftWorkTask[K]) => {
    setItemDraft((current) => ({ ...current, [key]: value }));
  };

  const updateDetailFilter = <K extends keyof DetailFilters>(key: K, value: DetailFilters[K]) => {
    setDetailFilters((current) => ({ ...current, [key]: value }));
  };

  const resetDetailFilters = () => {
    setDetailFilters(DEFAULT_DETAIL_FILTERS);
  };

  const toggleDetailColumn = (key: DetailColumnKey) => {
    setDetailColumns((current) => ({ ...current, [key]: !current[key] }));
  };

  const openTaskForm = () => {
    if (!canWrite) return;
    setTaskMessage("");
    setTaskDraft({ ...emptyTaskDraft, reporter: defaultReporter });
    setTaskFormOpen(true);
  };

  const openItemEditForm = (item: WorkTaskItem) => {
    if (!canWrite) return;
    if (!samePersonName(defaultReporter, item.reporter)) {
      setNotice({ type: "error", message: "Chỉ người báo cáo được chỉnh sửa thông tin nhiệm vụ." });
      return;
    }

    setTaskMessage("");
    setEditingItemId(item.id);
    setItemDraft({
      title: item.title,
      description: item.note ?? "",
      estimate: item.estimate ?? "",
      assignee: item.assignee ?? "",
      reporter: item.reporter ?? defaultReporter,
      priority: item.priority,
      dueDate: item.dueDate ?? "",
      zoneId: item.zoneId ?? "",
    });
    setItemFormOpen(true);
  };

  const openCreateWorkForm = () => {
    if (!canWrite) return;
    setMessage("");
    setDraft(emptyDraft);
    setFormMode("create");
    setFormOpen(true);
  };

  const openEditWorkForm = () => {
    if (!canWrite) return;
    if (!selectedTask) return;
    setMessage("");
    setDraft({ title: selectedTask.title, description: selectedTask.description });
    setFormMode("edit");
    setFormOpen(true);
  };

  const saveWork = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite) return;
    const title = draft.title.trim();
    if (!title) return;

    setSaving(true);
    setMessage("");
    try {
      const isEdit = formMode === "edit" && selectedTask;
      const response = await fetch(isEdit ? `/api/du-lieu/cong-viec/${selectedTask.id}` : "/api/du-lieu/cong-viec", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit
          ? {
              title,
              description: draft.description.trim() || null,
            }
          : {
              title,
              type: "tong_quat",
              status: "dang_mo",
              startDate: new Date().toISOString().slice(0, 10),
              dueDate: null,
              owner: null,
              description: draft.description.trim() || null,
              items: [],
            }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string; task?: ApiWorkTask };

      if (!response.ok || !result.task) {
        setMessage(result.message ?? "Không thể lưu công việc vào cơ sở dữ liệu.");
        return;
      }

      const task = mapApiTask(result.task);
      setTasks((current) => isEdit
        ? current.map((item) => item.id === task.id ? task : item)
        : [task, ...current.filter((item) => item.id !== task.id)]);
      setActiveTab(task.status === "completed" || task.status === "cancelled" ? "closed" : "open");
      setSelectedTaskId(isEdit ? task.id : null);
      if (isEdit) keepWorkDetail(task.id);
      setDraft(emptyDraft);
      setFormOpen(false);
      router.refresh();
    } catch {
      setMessage("Không thể kết nối máy chủ để lưu công việc.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSelectedWork = async (workId: string) => {
    if (!canWrite || deleting) return;
    setDeleting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/du-lieu/cong-viec/${workId}`, { method: "DELETE" });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setNotice({ type: "error", message: result.message ?? "Không thể xóa công việc." });
        return;
      }
      setTasks((current) => current.filter((task) => task.id !== workId));
      setSelectedTaskId(null);
      router.replace(makeWorkUrl(null), { scroll: false });
      setActionsOpen(false);
      setConfirmDialog(null);
      setNotice({ type: "success", message: result.message ?? "Đã xóa công việc." });
      router.refresh();
    } catch {
      setNotice({ type: "error", message: "Không thể kết nối máy chủ để xóa công việc." });
    } finally {
      setDeleting(false);
    }
  };

  const deleteWorkItem = async (item: WorkTaskItem) => {
    if (!canWrite || !selectedTask || deletingItemId) return;
    setDeletingItemId(item.id);
    setTaskMessage("");
    try {
      const response = await fetch(`/api/du-lieu/cong-viec/${selectedTask.id}/hang-muc?itemId=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string; task?: ApiWorkTask };
      if (!response.ok || !result.task) {
        setNotice({ type: "error", message: result.message ?? "Không thể xóa nhiệm vụ." });
        return;
      }

      const updatedTask = mapApiTask(result.task);
      setTasks((current) => current.map((task) => task.id === updatedTask.id ? updatedTask : task));
      setSelectedTaskId(updatedTask.id);
      keepWorkDetail(updatedTask.id);
      setConfirmDialog(null);
      setNotice({ type: "success", message: result.message ?? "Đã xóa nhiệm vụ." });
      router.refresh();
    } catch {
      setNotice({ type: "error", message: "Không thể kết nối máy chủ để xóa nhiệm vụ." });
    } finally {
      setDeletingItemId(null);
    }
  };

  const confirmDelete = () => {
    if (!confirmDialog) return;
    if (confirmDialog.kind === "work") {
      void deleteSelectedWork(confirmDialog.workId);
    } else {
      void deleteWorkItem(confirmDialog.item);
    }
  };

  const saveWorkItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite || !selectedTask || !editingItemId) return;
    const title = itemDraft.title.trim();
    if (!title) return;

    setUpdatingItemId(editingItemId);
    setTaskMessage("");
    try {
      const response = await fetch(`/api/du-lieu/cong-viec/${selectedTask.id}/hang-muc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          itemId: editingItemId,
          title,
          description: itemDraft.description.trim() || null,
          estimate: itemDraft.estimate.trim() || null,
          assignee: itemDraft.assignee || null,
          priority: itemDraft.priority,
          dueDate: itemDraft.dueDate || null,
          zoneId: itemDraft.zoneId || null,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string; task?: ApiWorkTask };
      if (!response.ok || !result.task) {
        setNotice({ type: "error", message: result.message ?? "Không thể cập nhật nhiệm vụ." });
        return;
      }

      const updatedTask = mapApiTask(result.task);
      setTasks((current) => current.map((task) => task.id === updatedTask.id ? updatedTask : task));
      setSelectedTaskId(updatedTask.id);
      keepWorkDetail(updatedTask.id);
      setItemFormOpen(false);
      setEditingItemId(null);
      setNotice({ type: "success", message: result.message ?? "Đã cập nhật nhiệm vụ." });
      router.refresh();
    } catch {
      setNotice({ type: "error", message: "Không thể kết nối máy chủ để cập nhật nhiệm vụ." });
    } finally {
      setUpdatingItemId(null);
    }
  };

  const uploadWorkItemFiles = async (item: WorkTaskItem, files: FileList | null) => {
    if (!canWrite || !selectedTask || !files || files.length === 0) return;
    if (!canUploadWorkItemFiles(defaultReporter, item)) {
      setNotice({ type: "error", message: "Chỉ người phụ trách hoặc người báo cáo được tải tệp cho nhiệm vụ." });
      return;
    }

    const allowedFiles = Array.from(files).filter((file) => {
      const isWord = /\.(doc|docx)$/i.test(file.name);
      const isAllowedType = file.type.startsWith("image/") || file.type === "application/pdf" || file.type === "application/msword" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      return (isAllowedType || isWord) && file.size <= 5 * 1024 * 1024;
    });
    if (allowedFiles.length === 0) {
      setNotice({ type: "error", message: "Chỉ hỗ trợ ảnh, PDF hoặc Word dưới 5MB mỗi tệp." });
      return;
    }

    setUpdatingItemId(item.id);
    try {
      const attachments = await Promise.all(allowedFiles.map(readAttachmentFile));
      const response = await fetch(`/api/du-lieu/cong-viec/${selectedTask.id}/hang-muc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "attachments", itemId: item.id, attachments }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string; task?: ApiWorkTask };
      if (!response.ok || !result.task) {
        setNotice({ type: "error", message: result.message ?? "Không thể tải tệp đính kèm." });
        return;
      }

      const updatedTask = mapApiTask(result.task);
      setTasks((current) => current.map((task) => task.id === updatedTask.id ? updatedTask : task));
      setSelectedTaskId(updatedTask.id);
      keepWorkDetail(updatedTask.id);
      setNotice({ type: "success", message: `Đã tải ${attachments.length} tệp đính kèm.` });
      router.refresh();
    } catch {
      setNotice({ type: "error", message: "Không thể tải tệp đính kèm." });
    } finally {
      setUpdatingItemId(null);
    }
  };

  const changeWorkItemStatus = async (item: WorkTaskItem, nextStatus: DbWorkItemStatus) => {
    if (!canWrite || !selectedTask) return;
    if (!samePersonName(defaultReporter, item.assignee)) {
      setNotice({ type: "error", message: "Chỉ người phụ trách được cập nhật trạng thái nhiệm vụ." });
      return;
    }

    setUpdatingItemId(item.id);
    try {
      const response = await fetch(`/api/du-lieu/cong-viec/${selectedTask.id}/hang-muc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", itemId: item.id, status: nextStatus }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string; task?: ApiWorkTask };
      if (!response.ok || !result.task) {
        setNotice({ type: "error", message: result.message ?? "Không thể cập nhật trạng thái nhiệm vụ." });
        return;
      }

      const updatedTask = mapApiTask(result.task);
      setTasks((current) => current.map((task) => task.id === updatedTask.id ? updatedTask : task));
      setSelectedTaskId(updatedTask.id);
      keepWorkDetail(updatedTask.id);
      const statusMessage = nextStatus === "hoan_thanh"
        ? "Đã đánh dấu hoàn thành nhiệm vụ."
        : nextStatus === "dang_lam"
          ? "Đã chuyển nhiệm vụ sang đang làm."
          : "Đã chuyển nhiệm vụ về cần làm.";
      setNotice({ type: "success", message: statusMessage });
      router.refresh();
    } catch {
      setNotice({ type: "error", message: "Không thể kết nối máy chủ để cập nhật trạng thái." });
    } finally {
      setUpdatingItemId(null);
    }
  };

  const toggleWorkItemComplete = (item: WorkTaskItem) => {
    const nextStatus: DbWorkItemStatus = item.status === "hoan_thanh" ? "chua_lam" : "hoan_thanh";
    void changeWorkItemStatus(item, nextStatus);
  };

  const addWorkItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite || !selectedTask) return;
    const title = taskDraft.title.trim();
    if (!title) return;

    setTaskSaving(true);
    setTaskMessage("");
    try {
      const response = await fetch(`/api/du-lieu/cong-viec/${selectedTask.id}/hang-muc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: taskDraft.description.trim() || null,
          estimate: taskDraft.estimate.trim() || null,
          assignee: taskDraft.assignee || null,
          reporter: taskDraft.reporter || defaultReporter || null,
          priority: taskDraft.priority,
          dueDate: taskDraft.dueDate || null,
          zoneId: taskDraft.zoneId || null,
          status: "chua_lam",
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string; task?: ApiWorkTask };

      if (!response.ok || !result.task) {
        setTaskMessage(result.message ?? "Không thể lưu nhiệm vụ vào cơ sở dữ liệu.");
        return;
      }

      const updatedTask = mapApiTask(result.task);
      setTasks((current) => current.map((task) => task.id === updatedTask.id ? updatedTask : task));
      setSelectedTaskId(updatedTask.id);
      keepWorkDetail(updatedTask.id);
      setTaskDraft({ ...emptyTaskDraft, reporter: defaultReporter });
      setTaskFormOpen(false);
      router.refresh();
    } catch {
      setTaskMessage("Không thể kết nối máy chủ để lưu nhiệm vụ.");
    } finally {
      setTaskSaving(false);
    }
  };

  return (
    <div className={styles.workPage}>
      {notice && (
        <div className={styles.noticeBox} data-type={notice.type} role="status">
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo">
            <Icon name="close" />
          </button>
        </div>
      )}
      {confirmDialog && (
        <div className={styles.confirmLayer} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <button type="button" className={styles.confirmBackdrop} onClick={() => setConfirmDialog(null)} aria-label="Đóng xác nhận" />
          <div className={styles.confirmBox}>
            <button type="button" className={styles.confirmClose} onClick={() => setConfirmDialog(null)} aria-label="Đóng">
              <Icon name="close" />
            </button>
            <div className={styles.confirmIcon}>
              <Icon name="trash" />
            </div>
            <div>
              <h2 id="confirm-title">{confirmDialog.kind === "work" ? "Xóa công việc" : "Xóa nhiệm vụ"}</h2>
              <p>
                {confirmDialog.kind === "work"
                  ? `Xóa công việc "${confirmDialog.title}" và toàn bộ nhiệm vụ bên trong?`
                  : `Xóa nhiệm vụ "${confirmDialog.item.title}" khỏi công việc này?`}
              </p>
              <span>Thao tác này sẽ ẩn dữ liệu khỏi giao diện hiện tại.</span>
            </div>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmDialog(null)} disabled={deleting || Boolean(deletingItemId)}>
                Hủy
              </button>
              <button type="button" className={styles.dangerButton} onClick={confirmDelete} disabled={deleting || Boolean(deletingItemId)}>
                {deleting || deletingItemId ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
      <header className={styles.pageHeader}>
        <div className={styles.titleWrap}>
          <span className={styles.titleIcon}>
            <Icon name="calendar" />
          </span>
          <div>
            <p className={styles.eyebrow}>Quản lý công việc</p>
            <h1>{selectedTask ? selectedTask.title : "Công việc"}</h1>
          </div>
        </div>

        <div className={styles.tools} ref={menuRef}>
          <button type="button" className={styles.backButton} onClick={() => selectedTask ? closeWorkDetail() : router.back()}>
            <span className={styles.buttonIcon}>
              <Icon name="back" />
            </span>
            <span>Quay lại</span>
          </button>

          <div className={styles.actionMenu}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => setActionsOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={actionsOpen}
            >
              <span className={styles.buttonIcon}>
                <Icon name="edit" />
              </span>
              <span>Tác vụ</span>
              <span className={styles.chevron} aria-hidden="true">▾</span>
            </button>

            {actionsOpen && (
              <div className={styles.dropdown} role="menu">
                {selectedTask ? (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.dropdownItem}
                      onClick={() => {
                        closeWorkDetail();
                        setActionsOpen(false);
                      }}
                    >
                      <span className={styles.menuIcon}>
                        <Icon name="back" />
                      </span>
                      <span>Quản lý công việc</span>
                    </button>
                    {canWrite && (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          className={styles.dropdownItem}
                          data-tone="green"
                          onClick={() => {
                            openTaskForm();
                            setActionsOpen(false);
                          }}
                        >
                          <span className={styles.menuIcon}>
                            <Icon name="plus" />
                          </span>
                          <span>Nhiệm vụ mới</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={styles.dropdownItem}
                          data-tone="green"
                          onClick={() => {
                            openEditWorkForm();
                            setActionsOpen(false);
                          }}
                        >
                          <span className={styles.menuIcon}>
                            <Icon name="edit" />
                          </span>
                          <span>Sửa công việc</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={styles.dropdownItem}
                          data-tone="red"
                          onClick={() => {
                            setActionsOpen(false);
                            if (selectedTask) {
                              setConfirmDialog({ kind: "work", workId: selectedTask.id, title: selectedTask.title });
                            }
                          }}
                          disabled={deleting}
                        >
                          <span className={styles.menuIcon}>
                            <Icon name="trash" />
                          </span>
                          <span>{deleting ? "Đang xóa..." : "Xóa công việc"}</span>
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.dropdownItem}
                      onClick={() => {
                        setActionsOpen(false);
                        router.push("/dashboard");
                      }}
                    >
                      <span className={styles.menuIcon}>
                        <Icon name="dashboard" />
                      </span>
                      <span>Tổng quan</span>
                    </button>
                    {canWrite && (
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.dropdownItem}
                        data-tone="green"
                        onClick={() => {
                          openCreateWorkForm();
                          setActionsOpen(false);
                        }}
                      >
                        <span className={styles.menuIcon}>
                          <Icon name="plus" />
                        </span>
                        <span>Thêm công việc</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {selectedTask ? (
        <>
          <nav className={styles.tabs} aria-label="Chế độ xem chi tiết công việc">
            <button type="button" className={detailView === "list" ? styles.tabActive : ""} onClick={() => setDetailView("list")}>▦ <span>Danh sách</span></button>
            <button type="button" className={detailView === "calendar" ? styles.tabActive : ""} onClick={() => setDetailView("calendar")}>▣ <span>Lịch</span></button>
            <button type="button" className={detailView === "status" ? styles.tabActive : ""} onClick={() => setDetailView("status")}>☷ <span>Trạng thái</span></button>
            <button type="button" className={detailView === "map" ? styles.tabActive : ""} onClick={() => setDetailView("map")}>⌖ <span>Bản đồ</span></button>
          </nav>
          {detailView === "list" && (
            <FarmdeckListView
              task={selectedTask}
              visibleItems={filteredDetailItems}
              zones={zones}
              filters={detailFilters}
              columns={detailColumns}
              onFilterChange={updateDetailFilter}
              onColumnChange={toggleDetailColumn}
              onResetFilters={resetDetailFilters}
              onNewTask={openTaskForm}
              onEditItem={openItemEditForm}
              onDeleteItem={(item) => setConfirmDialog({ kind: "item", item })}
              onToggleComplete={toggleWorkItemComplete}
              onChangeStatus={changeWorkItemStatus}
              onUploadFiles={uploadWorkItemFiles}
              deletingItemId={deletingItemId}
              updatingItemId={updatingItemId}
              currentUserName={defaultReporter}
              canWrite={canWrite}
            />
          )}
          {detailView === "calendar" && (
            <FarmdeckCalendarView
              task={selectedTask}
              visibleItems={filteredDetailItems}
              zones={zones}
              filters={detailFilters}
              columns={detailColumns}
              onFilterChange={updateDetailFilter}
              onColumnChange={toggleDetailColumn}
              onResetFilters={resetDetailFilters}
              onNewTask={openTaskForm}
              onEditItem={openItemEditForm}
              onDeleteItem={(item) => setConfirmDialog({ kind: "item", item })}
              onToggleComplete={toggleWorkItemComplete}
              onChangeStatus={changeWorkItemStatus}
              onUploadFiles={uploadWorkItemFiles}
              deletingItemId={deletingItemId}
              updatingItemId={updatingItemId}
              currentUserName={defaultReporter}
              calendarMode={calendarMode}
              calendarDate={calendarDate}
              onCalendarModeChange={setCalendarMode}
              onCalendarDateChange={setCalendarDate}
              canWrite={canWrite}
            />
          )}
          {detailView === "status" && (
            <FarmdeckStatusView
              task={selectedTask}
              visibleItems={filteredDetailItems}
              zones={zones}
              filters={detailFilters}
              columns={detailColumns}
              onFilterChange={updateDetailFilter}
              onColumnChange={toggleDetailColumn}
              onResetFilters={resetDetailFilters}
              onNewTask={openTaskForm}
              onEditItem={openItemEditForm}
              onDeleteItem={(item) => setConfirmDialog({ kind: "item", item })}
              onToggleComplete={toggleWorkItemComplete}
              onChangeStatus={changeWorkItemStatus}
              onUploadFiles={uploadWorkItemFiles}
              deletingItemId={deletingItemId}
              updatingItemId={updatingItemId}
              currentUserName={defaultReporter}
              users={users}
              canWrite={canWrite}
            />
          )}
          {detailView === "map" && <FarmdeckMapView task={selectedTask} visibleItems={filteredDetailItems} zones={zones} lat={lat} lng={lng} />}
        </>
      ) : (
        <>
          <nav className={styles.tabs} aria-label="Trạng thái công việc">
            <button type="button" className={activeTab === "open" ? styles.tabActive : ""} onClick={() => setActiveTab("open")}>
              <Icon name="folder" />
              <span>Đang mở</span>
              <strong>{groupedTasks.open.length}</strong>
            </button>
            <button type="button" className={activeTab === "closed" ? styles.tabActive : ""} onClick={() => setActiveTab("closed")}>
              <Icon name="folder" />
              <span>Đã đóng</span>
              <strong>{groupedTasks.closed.length}</strong>
            </button>
          </nav>

          <section className={styles.workGrid} aria-live="polite">
            {visibleTasks.length > 0 ? (
              visibleTasks.map((task) => <WorkCard key={task.id} task={task} onOpen={() => openWorkDetail(task.id)} />)
            ) : (
              <div className={styles.emptyState}>Chưa có công việc trong cơ sở dữ liệu cho nhóm này.</div>
            )}
          </section>
        </>
      )}

      {canWrite && formOpen && (
        <div className={styles.formLayer}>
          <button type="button" className={styles.formBackdrop} onClick={() => setFormOpen(false)} aria-label="Đóng form" />
          <form className={styles.workForm} onSubmit={saveWork}>
            <div className={styles.formHeader}>
              <div>
                <p className={styles.eyebrow}>{formMode === "edit" ? "Cập nhật công việc" : "Công việc mới"}</p>
                <h2>{formMode === "edit" ? "Sửa công việc" : "Thêm công việc"}</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setFormOpen(false)} aria-label="Đóng">
                ×
              </button>
            </div>

            <label className={styles.field}>
              <span>Tên công việc *</span>
              <input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} required />
            </label>

            <label className={styles.field}>
              <span>Mô tả</span>
              <textarea rows={3} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
            </label>

            {message && <p className={styles.formMessage}>{message}</p>}

            <div className={styles.formActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setFormOpen(false)} disabled={saving}>
                Hủy
              </button>
              <button type="submit" className={styles.primaryButton} disabled={saving}>
                {saving ? "Đang lưu..." : formMode === "edit" ? "Lưu thay đổi" : "Thêm công việc"}
              </button>
            </div>
          </form>
        </div>
      )}

      {canWrite && itemFormOpen && editingItem && (
        <div className={styles.formLayer}>
          <button type="button" className={styles.formBackdrop} onClick={() => setItemFormOpen(false)} aria-label="Đóng form" />
          <form className={`${styles.workForm} ${styles.taskForm}`} onSubmit={saveWorkItem}>
            <div className={styles.formHeader}>
              <div>
                <p className={styles.eyebrow}>Người báo cáo chỉnh sửa</p>
                <h2>Sửa nhiệm vụ</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setItemFormOpen(false)} aria-label="Đóng">
                ×
              </button>
            </div>

            <label className={styles.field}>
              <span>Tóm tắt ngắn *</span>
              <input value={itemDraft.title} onChange={(event) => updateItemDraft("title", event.target.value)} required />
            </label>

            <label className={styles.field}>
              <span>Mô tả</span>
              <textarea rows={4} value={itemDraft.description} onChange={(event) => updateItemDraft("description", event.target.value)} />
            </label>

            <div className={styles.taskFormGrid}>
              <label className={styles.field}>
                <span>Người phụ trách</span>
                <select value={itemDraft.assignee} onChange={(event) => updateItemDraft("assignee", event.target.value)}>
                  <option value="">Chọn</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.name}>{user.name}</option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Dự toán</span>
                <input value={itemDraft.estimate} onChange={(event) => updateItemDraft("estimate", event.target.value)} placeholder="VD: 2.000.000 VND" />
              </label>

              <label className={styles.field}>
                <span>Ưu tiên</span>
                <select value={itemDraft.priority} onChange={(event) => updateItemDraft("priority", event.target.value as DbWorkPriority)}>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Khu vực</span>
                <select value={itemDraft.zoneId} onChange={(event) => updateItemDraft("zoneId", event.target.value)}>
                  <option value="">Chọn khu vực</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Hạn hoàn thành</span>
                <input type="date" value={itemDraft.dueDate} onChange={(event) => updateItemDraft("dueDate", event.target.value)} />
              </label>
            </div>

            <div className={styles.attachmentBox}>
              <strong>Tệp đính kèm</strong>
              {editingItem.attachments.length > 0 ? (
                editingItem.attachments.map((file) => (
                  <a key={file.id} href={file.dataUrl} download={file.name}>
                    {file.name} <span>{formatFileSize(file.size)}</span>
                  </a>
                ))
              ) : (
                <span>Chưa có tệp đính kèm.</span>
              )}
            </div>

            {taskMessage && <p className={styles.formMessage}>{taskMessage}</p>}

            <div className={styles.formActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setItemFormOpen(false)} disabled={updatingItemId === editingItem.id}>
                Hủy
              </button>
              <button type="submit" className={styles.primaryButton} disabled={updatingItemId === editingItem.id}>
                {updatingItemId === editingItem.id ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}

      {canWrite && taskFormOpen && selectedTask && (
        <div className={styles.formLayer}>
          <button type="button" className={styles.formBackdrop} onClick={() => setTaskFormOpen(false)} aria-label="Đóng form" />
          <form className={`${styles.workForm} ${styles.taskForm}`} onSubmit={addWorkItem}>
            <div className={styles.formHeader}>
              <h2>Nhiệm vụ mới</h2>
              <button type="button" className={styles.closeButton} onClick={() => setTaskFormOpen(false)} aria-label="Đóng">
                ×
              </button>
            </div>

            <label className={styles.field}>
              <span>Tóm tắt ngắn *</span>
              <input
                value={taskDraft.title}
                onChange={(event) => updateTaskDraft("title", event.target.value)}
                required
              />
              <small>Tóm tắt nhiệm vụ trong một câu ngắn gọn.</small>
            </label>

            <label className={styles.field}>
              <span>Mô tả <em>(không bắt buộc)</em></span>
              <div className={styles.editorShell}>
                <div className={styles.editorToolbar} aria-hidden="true">
                  <button type="button">B</button>
                  <button type="button"><i>I</i></button>
                  <button type="button"><u>U</u></button>
                  <button type="button">S</button>
                  <button type="button">“</button>
                  <button type="button">{"</>"}</button>
                  <button type="button">☷</button>
                  <button type="button">☰</button>
                  <button type="button">≡</button>
                  <button type="button">⌁</button>
                  <button type="button">▧</button>
                  <button type="button" className={styles.toolbarSelect}>Bình thường</button>
                  <button type="button">A</button>
                  <button type="button">Tx</button>
                </div>
                <textarea
                  rows={5}
                  value={taskDraft.description}
                  onChange={(event) => updateTaskDraft("description", event.target.value)}
                />
              </div>
              <small>Mô tả nhiệm vụ với đầy đủ thông tin cần xử lý.</small>
            </label>

            <div className={styles.taskFormGrid}>
              <label className={styles.field}>
                <span>Người phụ trách <em>(không bắt buộc)</em></span>
                <select value={taskDraft.assignee} onChange={(event) => updateTaskDraft("assignee", event.target.value)}>
                  <option value="">Chọn</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.name}>{user.name}</option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Người báo cáo *</span>
                {users.length > 0 ? (
                  <select value={taskDraft.reporter} onChange={(event) => updateTaskDraft("reporter", event.target.value)} required>
                    {users.map((user) => (
                      <option key={user.id} value={user.name}>{user.name}</option>
                    ))}
                  </select>
                ) : (
                  <input value={taskDraft.reporter} onChange={(event) => updateTaskDraft("reporter", event.target.value)} required />
                )}
              </label>

              <label className={styles.field}>
                <span>Ưu tiên</span>
                <select
                  value={taskDraft.priority}
                  onChange={(event) => updateTaskDraft("priority", event.target.value as DbWorkPriority)}
                >
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Khu vực <em>(không bắt buộc)</em></span>
                <select value={taskDraft.zoneId} onChange={(event) => updateTaskDraft("zoneId", event.target.value)}>
                  <option value="">Chọn khu vực</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                  ))}
                </select>
                <small>Khu vực liên quan đến nhiệm vụ này.</small>
              </label>

              <label className={styles.field}>
                <span>Hạn hoàn thành <em>(không bắt buộc)</em></span>
                <input type="date" value={taskDraft.dueDate} onChange={(event) => updateTaskDraft("dueDate", event.target.value)} />
                <button type="button" className={styles.clearDateButton} onClick={() => updateTaskDraft("dueDate", "")}>
                  Xóa
                </button>
              </label>
            </div>

            <p className={styles.taskNote}>Ghi chú: Tệp đính kèm và dự toán có thể bổ sung sau khi nhiệm vụ được tạo.</p>
            {taskMessage && <p className={styles.formMessage}>{taskMessage}</p>}

            <div className={styles.formActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setTaskFormOpen(false)} disabled={taskSaving}>
                Hủy
              </button>
              <button type="submit" className={styles.primaryButton} disabled={taskSaving}>
                {taskSaving ? "Đang lưu..." : "Tạo nhiệm vụ"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
