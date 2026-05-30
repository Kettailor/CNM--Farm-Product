"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export type PlanStatus = "overdue" | "active" | "upcoming" | "paused" | "completed" | "cancelled";

export type PlanOverviewItem = {
  id: string;
  title: string;
  status: PlanStatus;
  completedTasks: number;
  totalTasks: number;
  members: number;
  comments: number;
  attachments: number;
  createdAt: string;
  description: string;
  source: "demo" | "grazing" | "manual";
};

type Props = {
  initialPlans: PlanOverviewItem[];
};

type TabKey = "open" | "closed";

type DraftPlan = {
  title: string;
  description: string;
  status: PlanStatus;
  totalTasks: number;
  completedTasks: number;
  members: number;
};

const STATUS_LABELS: Record<PlanStatus, string> = {
  overdue: "Quá hạn",
  active: "Đang thực hiện",
  upcoming: "Sắp tới",
  paused: "Tạm dừng",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const emptyDraft: DraftPlan = {
  title: "",
  description: "",
  status: "active",
  totalTasks: 1,
  completedTasks: 0,
  members: 1,
};

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
    case "check":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12 4 4L19 6" />
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

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function progressOf(plan: PlanOverviewItem) {
  if (plan.totalTasks <= 0) return 0;
  return clamp(Math.round((plan.completedTasks / plan.totalTasks) * 100), 0, 100);
}

function PlanCard({ plan }: { plan: PlanOverviewItem }) {
  const progress = progressOf(plan);
  const progressStyle = { "--progress": `${progress}%` } as CSSProperties;

  return (
    <article className={styles.planCard}>
      {plan.source === "demo" && <span className={styles.demoBadge}>Mẫu</span>}
      {plan.source === "grazing" && <span className={styles.sourceBadge}>Chăn thả</span>}

      <h2>{plan.title}</h2>
      <div className={styles.cardDivider} />

      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span>
            Trạng thái: <b data-status={plan.status}>{STATUS_LABELS[plan.status]}</b>
          </span>
          <span>
            Công việc: <strong>{plan.completedTasks}/{plan.totalTasks}</strong>
          </span>
          <span>
            Thành viên: <strong>{plan.members}</strong>
          </span>
          <span>
            Bình luận: <strong>{plan.comments}</strong>
          </span>
          <span>
            Đính kèm: <strong>{plan.attachments}</strong>
          </span>
          <span>
            Ngày tạo: <strong>{formatDate(plan.createdAt)}</strong>
          </span>
        </div>

        {plan.status === "completed" ? (
          <div className={styles.completedMark} aria-label="Hoàn tất">
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
        <p>{plan.description}</p>
      </div>
    </article>
  );
}

export default function PlanningClient({ initialPlans }: Props) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [plans, setPlans] = useState(initialPlans);
  const [activeTab, setActiveTab] = useState<TabKey>("open");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<DraftPlan>(emptyDraft);

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

  const groupedPlans = useMemo(() => {
    const open = plans.filter((plan) => plan.status !== "completed" && plan.status !== "cancelled");
    const closed = plans.filter((plan) => plan.status === "completed" || plan.status === "cancelled");
    return { open, closed };
  }, [plans]);

  const visiblePlans = activeTab === "open" ? groupedPlans.open : groupedPlans.closed;

  const updateDraft = <K extends keyof DraftPlan>(key: K, value: DraftPlan[K]) => {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "totalTasks") {
        next.completedTasks = clamp(next.completedTasks, 0, next.totalTasks);
      }
      if (key === "status" && value === "completed") {
        next.completedTasks = Math.max(1, next.totalTasks);
      }
      return next;
    });
  };

  const addPlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const totalTasks = Math.max(1, Number(draft.totalTasks));
    const completedTasks = draft.status === "completed" ? totalTasks : clamp(Number(draft.completedTasks), 0, totalTasks);
    const plan: PlanOverviewItem = {
      id: `manual-${Date.now()}`,
      title: draft.title.trim(),
      status: draft.status,
      completedTasks,
      totalTasks,
      members: Math.max(1, Number(draft.members)),
      comments: 0,
      attachments: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      description: draft.description.trim() || "Kế hoạch mới được thêm từ màn hình tổng quan.",
      source: "manual",
    };

    if (!plan.title) return;
    setPlans((current) => [plan, ...current]);
    setActiveTab(plan.status === "completed" ? "closed" : "open");
    setDraft(emptyDraft);
    setFormOpen(false);
  };

  return (
    <div className={styles.planningPage}>
      <header className={styles.pageHeader}>
        <div className={styles.titleWrap}>
          <span className={styles.titleIcon}>
            <Icon name="calendar" />
          </span>
          <div>
            <p className={styles.eyebrow}>Quản lý kế hoạch</p>
            <h1>Kế hoạch</h1>
          </div>
        </div>

        <div className={styles.tools} ref={menuRef}>
          <button type="button" className={styles.backButton} onClick={() => router.back()}>
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
                <button
                  type="button"
                  role="menuitem"
                  className={styles.dropdownItem}
                  data-tone="green"
                  onClick={() => {
                    setFormOpen(true);
                    setActionsOpen(false);
                  }}
                >
                  <span className={styles.menuIcon}>
                    <Icon name="plus" />
                  </span>
                  <span>Thêm kế hoạch</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Trạng thái kế hoạch">
        <button type="button" className={activeTab === "open" ? styles.tabActive : ""} onClick={() => setActiveTab("open")}>
          <Icon name="folder" />
          <span>Đang mở</span>
          <strong>{groupedPlans.open.length}</strong>
        </button>
        <button type="button" className={activeTab === "closed" ? styles.tabActive : ""} onClick={() => setActiveTab("closed")}>
          <Icon name="folder" />
          <span>Đã đóng</span>
          <strong>{groupedPlans.closed.length}</strong>
        </button>
      </nav>

      <section className={styles.planGrid} aria-live="polite">
        {visiblePlans.length > 0 ? (
          visiblePlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)
        ) : (
          <div className={styles.emptyState}>Chưa có kế hoạch trong nhóm này.</div>
        )}
      </section>

      {formOpen && (
        <div className={styles.formLayer}>
          <button type="button" className={styles.formBackdrop} onClick={() => setFormOpen(false)} aria-label="Đóng form" />
          <form className={styles.planForm} onSubmit={addPlan}>
            <div className={styles.formHeader}>
              <div>
                <p className={styles.eyebrow}>Kế hoạch mới</p>
                <h2>Thêm kế hoạch</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setFormOpen(false)} aria-label="Đóng">
                ×
              </button>
            </div>

            <label className={styles.field}>
              <span>Tên kế hoạch *</span>
              <input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} required />
            </label>

            <label className={styles.field}>
              <span>Mô tả</span>
              <textarea rows={4} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
            </label>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Trạng thái</span>
                <select value={draft.status} onChange={(event) => updateDraft("status", event.target.value as PlanStatus)}>
                  <option value="active">Đang thực hiện</option>
                  <option value="upcoming">Sắp tới</option>
                  <option value="overdue">Quá hạn</option>
                  <option value="paused">Tạm dừng</option>
                  <option value="completed">Hoàn tất</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Thành viên</span>
                <input type="number" min={1} value={draft.members} onChange={(event) => updateDraft("members", Number(event.target.value))} />
              </label>
              <label className={styles.field}>
                <span>Tổng công việc</span>
                <input type="number" min={1} value={draft.totalTasks} onChange={(event) => updateDraft("totalTasks", Number(event.target.value))} />
              </label>
              <label className={styles.field}>
                <span>Đã hoàn thành</span>
                <input type="number" min={0} max={draft.totalTasks} value={draft.completedTasks} onChange={(event) => updateDraft("completedTasks", Number(event.target.value))} />
              </label>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setFormOpen(false)}>
                Hủy
              </button>
              <button type="submit" className={styles.primaryButton}>
                Thêm kế hoạch
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
