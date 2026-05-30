"use client";

import { useCallback, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import DashboardTopActions from "@/components/dashboard-top-actions";
import {
  GRAZING_EVENT_TYPE_LABELS,
  GRAZING_EVENT_TYPE_VALUES,
  GRAZING_PLAN_TYPE_OPTIONS,
  GRAZING_STATUS_LABELS,
  getGrazingPlanTypeOption,
  type GrazingEventType,
  type GrazingLivestockGroup,
  type GrazingPaddock,
  type GrazingPlan,
  type GrazingPlanType,
  type GrazingStatus,
} from "@/lib/grazing-types";
import styles from "./page.module.css";

type ViewMode = "plans" | "table" | "chart";
type WizardStep = 0 | 1 | 2;
type FeatureFilter = "events" | "groups" | "paddocks";
type TimeScale = "day" | "week" | "month";

type EventForm = {
  id: string;
  type: GrazingEventType;
  title: string;
  startDate: string;
  endDate: string;
  prerequisite: string;
};

type PaddockConfig = {
  paddockId: string;
  priority: string;
  rating: string;
  supply: string;
  events: EventForm[];
};

type ChartRow = {
  id: string;
  name: string;
  type: "plan" | "paddock" | "event" | "group";
  priority?: number | string | null;
  rating?: number | string | null;
  area?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  eventType?: GrazingEventType;
  label?: string;
  prerequisite?: string | null;
  collapseKey?: string;
  collapsible?: boolean;
};

type FormState = {
  id: string | null;
  code: string;
  name: string;
  type: GrazingPlanType;
  status: GrazingStatus;
  startDate: string;
  endDate: string;
  manager: string;
  note: string;
  groupIds: string[];
  paddocks: PaddockConfig[];
};

const today = () => new Date().toISOString().slice(0, 10);
const FEATURE_OPTIONS: Array<{ value: FeatureFilter; label: string }> = [
  { value: "events", label: "Sự kiện" },
  { value: "groups", label: "Nhóm chăn nuôi" },
  { value: "paddocks", label: "Đám đồng" },
];
const TIME_SCALE_OPTIONS: Array<{ value: TimeScale; label: string; step: number; slotWidth: number }> = [
  { value: "day", label: "Ngày", step: 1, slotWidth: 84 },
  { value: "week", label: "Tuần", step: 7, slotWidth: 96 },
  { value: "month", label: "Tháng", step: 30, slotWidth: 110 },
];

const emptyForm: FormState = {
  id: null,
  code: "",
  name: "",
  type: "seasonal",
  status: "active",
  startDate: today(),
  endDate: "",
  manager: "",
  note: "",
  groupIds: [],
  paddocks: [],
};

function makeEvent(type: GrazingEventType, startDate: string, endDate: string): EventForm {
  return {
    id: crypto.randomUUID(),
    type,
    title: type === "other" ? "" : GRAZING_EVENT_TYPE_LABELS[type],
    startDate,
    endDate,
    prerequisite: "",
  };
}

function daysBetween(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

function dateOffset(startDate: string | null, value: string | null) {
  if (!startDate || !value) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.round((date.getTime() - start.getTime()) / 86400000));
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatShortDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function displayStatus(status: GrazingStatus, startDate: string | null, endDate: string | null): GrazingStatus {
  if (status === "da_huy" || status === "paused") return status;
  const current = today();
  if (endDate && endDate < current) return "completed";
  if (startDate && startDate > current) return "future";
  return status;
}

function eventTitle(event: { type: GrazingEventType; title: string }) {
  return event.type === "other" ? event.title || GRAZING_EVENT_TYPE_LABELS.other : GRAZING_EVENT_TYPE_LABELS[event.type];
}

function planStyle(plan: GrazingPlan): CSSProperties {
  return { "--accent": getGrazingPlanTypeOption(plan.type).accent } as CSSProperties;
}

function eventColor(type: GrazingEventType) {
  const colors: Partial<Record<GrazingEventType, string>> = {
    grazing: "#67a832",
    resting: "#c7c7c7",
    burning: "#ef4444",
    clipping: "#22c55e",
    compacting: "#64748b",
    cultivating: "#a16207",
    cutting: "#16a34a",
    deferred: "#f59e0b",
    feeding: "#9333ea",
    fertilising: "#0f766e",
    grooming: "#ec4899",
    harrowing: "#92400e",
    harvesting: "#ca8a04",
    hoeing: "#84cc16",
    maintenance: "#475569",
    mowing: "#15803d",
    sowing: "#3949ab",
    levelling: "#d7c914",
    scarifying: "#795548",
    move: "#3f3f46",
    other: "#1f7a4a",
    pest_management: "#dc2626",
    plowing: "#854d0e",
    repairing: "#2563eb",
    reseeding: "#0ea5e9",
    rolling: "#78716c",
    seeding: "#0284c7",
    smoothing: "#14b8a6",
    soil_testing: "#7c3aed",
    spell_grazing: "#65a30d",
    spraying: "#06b6d4",
    subsoiling: "#78350f",
    tilling: "#a16207",
    thinning: "#4d7c0f",
    top_cutting: "#65a30d",
    weeding: "#22c55e",
    watering: "#0ea5e9",
    withholding: "#334155",
  };
  return colors[type] ?? "#1f7a4a";
}

function normalizeZoneType(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function eventTypesForPaddock(paddock?: GrazingPaddock | null): GrazingEventType[] {
  const type = normalizeZoneType(paddock?.zoneType);
  if (["cropping", "trong_trot", "field"].includes(type)) {
    return [
      "sowing",
      "seeding",
      "reseeding",
      "fertilising",
      "spraying",
      "weeding",
      "watering",
      "soil_testing",
      "plowing",
      "cultivating",
      "harrowing",
      "rolling",
      "levelling",
      "scarifying",
      "mowing",
      "harvesting",
      "other",
    ];
  }
  if (["livestock", "chan_nuoi", "vat_nuoi"].includes(type)) {
    return ["move", "feeding", "watering", "grooming", "maintenance", "resting", "withholding", "other"];
  }
  if (["water", "nguon_nuoc"].includes(type)) {
    return ["watering", "maintenance", "repairing", "withholding", "other"];
  }
  return GRAZING_EVENT_TYPE_VALUES.filter((value) => value !== "move");
}

function defaultEventTypeForPaddock(paddock?: GrazingPaddock | null): GrazingEventType {
  return eventTypesForPaddock(paddock)[0] ?? "grazing";
}

function formFromPlan(plan: GrazingPlan): FormState {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    type: plan.type,
    status: plan.status,
    startDate: plan.startDate ?? "",
    endDate: plan.endDate ?? "",
    manager: plan.manager ?? "",
    note: plan.note ?? "",
    groupIds: plan.groups.map((item) => item.id),
    paddocks: plan.paddocks.map((paddock) => ({
      paddockId: paddock.id,
      priority: String(paddock.priority),
      rating: String(paddock.rating),
      supply: "",
      events: plan.events
        .filter((event) => event.paddockId === paddock.id)
        .map((event) => ({
          id: event.id,
          type: event.type,
          title: event.title,
          startDate: event.startDate ?? plan.startDate ?? "",
          endDate: event.endDate ?? plan.endDate ?? "",
          prerequisite: event.note ?? "",
        })),
    })),
  };
}

function payloadFromForm(form: FormState) {
  return {
    code: form.code || undefined,
    name: form.name,
    type: form.type,
    status: form.status,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    manager: form.manager,
    note: form.note,
    groupIds: form.groupIds,
    paddocks: form.paddocks.map((paddock) => ({
      paddockId: paddock.paddockId,
      priority: paddock.priority,
      rating: paddock.rating,
      supply: paddock.supply,
      events: paddock.events,
    })),
  };
}

function Icon({ name }: { name: string }) {
  switch (name) {
    case "add":
      return <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>;
    case "edit":
      return <svg viewBox="0 0 24 24"><path d="m5 16 10-10 3 3L8 19H5v-3Z" /></svg>;
    case "trash":
      return <svg viewBox="0 0 24 24"><path d="M6 7h12M9 7V5h6v2M9 10l.5 9h5l.5-9" /></svg>;
    case "table":
      return <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 10h16M10 5v14" /></svg>;
    case "chart":
      return <svg viewBox="0 0 24 24"><path d="M4 19h16M7 16l4-5 4 3 4-7" /></svg>;
    case "calendar":
      return <svg viewBox="0 0 24 24"><path d="M5 5h14v15H5zM8 3v4M16 3v4M5 10h14" /></svg>;
    case "pasture":
      return <svg viewBox="0 0 24 24"><path d="M4 20h16M7 20c0-5 2-9 5-13M12 20c0-5 1-9 5-15M17 20c0-4 1-7 3-10" /></svg>;
    case "back":
      return <svg viewBox="0 0 24 24"><path d="M10 7 5 12l5 5M5 12h14" /></svg>;
    default:
      return <svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg>;
  }
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default function GrazingClient({
  farmName,
  initialPlans,
  paddocks,
  groups,
}: {
  farmName: string;
  initialPlans: GrazingPlan[];
  paddocks: GrazingPaddock[];
  groups: GrazingLivestockGroup[];
}) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [view, setView] = useState<ViewMode>("plans");
  const [formOpen, setFormOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [planTypeFilter, setPlanTypeFilter] = useState<"all" | GrazingPlanType>("all");
  const [featureFilters, setFeatureFilters] = useState<FeatureFilter[]>(["events", "groups", "paddocks"]);
  const [timeScale, setTimeScale] = useState<TimeScale>("day");
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);

  const visiblePlans = useMemo(
    () => plans.filter((plan) => plan.status !== "da_huy" && (planTypeFilter === "all" || plan.type === planTypeFilter)),
    [planTypeFilter, plans]
  );
  const canceledPlans = useMemo(() => plans.filter((plan) => plan.status === "da_huy"), [plans]);
  const isFeatureVisible = useCallback((feature: FeatureFilter) => featureFilters.includes(feature), [featureFilters]);
  const isCollapsed = useCallback((id: string) => collapsedIds.includes(id), [collapsedIds]);
  const toggleCollapsed = (id: string) => {
    setCollapsedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };
  const toggleFeature = (feature: FeatureFilter) => {
    setFeatureFilters((current) => (current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]));
  };
  const chartDates = useMemo(() => {
    const dates = visiblePlans
      .flatMap((plan) => [plan.startDate, plan.endDate || plan.startDate, ...plan.events.flatMap((event) => [event.startDate, event.endDate || event.startDate])])
      .filter(Boolean) as string[];
    const sorted = dates.sort();
    const start = sorted[0] ?? today();
    const end = sorted.at(-1) ?? start;
    return { start, end, days: Math.max(1, daysBetween(start, end) ?? 1) };
  }, [visiblePlans]);
  const chartTicks = useMemo(() => {
    const maxTicks = 36;
    const scaleStep = TIME_SCALE_OPTIONS.find((item) => item.value === timeScale)?.step ?? 1;
    const step = Math.max(scaleStep, Math.ceil(chartDates.days / maxTicks));
    return Array.from({ length: Math.ceil(chartDates.days / step) + 1 }, (_, index) => addDays(chartDates.start, index * step)).filter((date) => date <= chartDates.end);
  }, [chartDates, timeScale]);
  const chartScale = TIME_SCALE_OPTIONS.find((item) => item.value === timeScale) ?? TIME_SCALE_OPTIONS[0];
  const chartUnits = Math.max(1, Math.ceil(chartDates.days / chartScale.step));
  const chartScaleDays = Math.max(chartScale.step, chartUnits * chartScale.step);
  const chartWidth = Math.max(timeScale === "day" ? 560 : timeScale === "week" ? 460 : 360, chartUnits * chartScale.slotWidth);
  const chartRows = useMemo<ChartRow[]>(() => {
    return visiblePlans.flatMap((plan) => {
      const planCollapsed = isCollapsed(`plan:${plan.id}`);
      const rows: ChartRow[] = [{
        id: `${plan.id}-plan`,
        name: plan.name,
        type: "plan",
        startDate: plan.startDate,
        endDate: plan.endDate || plan.startDate,
        label: `${plan.name} (${daysBetween(plan.startDate, plan.endDate || plan.startDate) ?? 1} ngày)`,
        collapseKey: `plan:${plan.id}`,
        collapsible: true,
      }];
      if (planCollapsed) return rows;

      if (isFeatureVisible("paddocks")) {
        for (const paddock of plan.paddocks) {
          const paddockKey = `paddock:${plan.id}:${paddock.id}`;
          const paddockCollapsed = isCollapsed(paddockKey);
          rows.push({
            id: `${plan.id}-${paddock.id}`,
            name: paddock.name,
            type: "paddock",
            priority: paddock.priority,
            rating: paddock.rating,
            area: paddock.areaHa,
            startDate: plan.startDate,
            endDate: plan.endDate || plan.startDate,
            label: paddock.name,
            collapseKey: paddockKey,
            collapsible: true,
          });
          if (!paddockCollapsed && isFeatureVisible("events")) {
            for (const event of plan.events.filter((item) => item.paddockId === paddock.id)) {
              const duration = daysBetween(event.startDate, event.endDate || event.startDate) ?? 1;
              rows.push({
                id: `${plan.id}-${paddock.id}-${event.id}`,
                name: eventTitle(event),
                type: "event",
                startDate: event.startDate,
                endDate: event.endDate || event.startDate,
                eventType: event.type,
                label: `${eventTitle(event)} (${duration} ngày)`,
                prerequisite: event.note,
              });
            }
          }
        }
      } else if (isFeatureVisible("events")) {
        for (const event of plan.events) {
          const duration = daysBetween(event.startDate, event.endDate || event.startDate) ?? 1;
          rows.push({
            id: `${plan.id}-event-${event.id}`,
            name: eventTitle(event),
            type: "event",
            startDate: event.startDate,
            endDate: event.endDate || event.startDate,
            eventType: event.type,
            label: `${eventTitle(event)} (${duration} ngày)`,
            prerequisite: event.note,
          });
        }
      }

      if (isFeatureVisible("groups")) {
        for (const group of plan.groups) {
          rows.push({
            id: `${plan.id}-group-${group.id}`,
            name: group.name,
            type: "group",
            startDate: plan.startDate,
            endDate: plan.startDate,
            label: group.name,
          });
        }
      }
      return rows;
    });
  }, [isCollapsed, isFeatureVisible, visiblePlans]);

  const selectedPaddocks = useMemo(
    () => form.paddocks.map((item) => paddocks.find((paddock) => paddock.id === item.paddockId)).filter((item): item is GrazingPaddock => Boolean(item)),
    [form.paddocks, paddocks]
  );

  const stats = [
    { label: "Kế hoạch", value: visiblePlans.length },
    { label: "Ô chăn thả", value: new Set(visiblePlans.flatMap((plan) => plan.paddocks.map((item) => item.id))).size },
    { label: "Nhóm đàn", value: new Set(visiblePlans.flatMap((plan) => plan.groups.map((item) => item.id))).size },
    { label: "Đã hủy", value: canceledPlans.length },
  ];

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setMessage("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updatePaddock = (paddockId: string, patch: Partial<PaddockConfig>) => {
    setForm((current) => ({
      ...current,
      paddocks: current.paddocks.map((item) => (item.paddockId === paddockId ? { ...item, ...patch } : item)),
    }));
  };

  const setPaddockSelected = (paddockId: string, selected: boolean) => {
    setForm((current) => {
      const paddock = paddocks.find((item) => item.id === paddockId);
      const defaultType = defaultEventTypeForPaddock(paddock);
      if (!selected) return { ...current, paddocks: current.paddocks.filter((item) => item.paddockId !== paddockId) };
      if (current.paddocks.some((item) => item.paddockId === paddockId)) return current;
      return {
        ...current,
        paddocks: [
          ...current.paddocks,
          {
            paddockId,
            priority: "5",
            rating: "5",
            supply: "",
            events: [makeEvent(defaultType, current.startDate, current.endDate || current.startDate)],
          },
        ],
      };
    });
  };

  const addPaddockEvent = (paddockId: string, type: GrazingEventType) => {
    const nextEvent = makeEvent(type, form.startDate, form.endDate || form.startDate);
    updatePaddock(paddockId, {
      events: [...(form.paddocks.find((item) => item.paddockId === paddockId)?.events ?? []), nextEvent],
    });
  };

  const updatePaddockEvent = (paddockId: string, eventId: string, patch: Partial<EventForm>) => {
    const config = form.paddocks.find((item) => item.paddockId === paddockId);
    if (!config) return;
    updatePaddock(paddockId, {
      events: config.events.map((event) => (event.id === eventId ? { ...event, ...patch } : event)),
    });
  };

  const removePaddockEvent = (paddockId: string, eventId: string) => {
    const config = form.paddocks.find((item) => item.paddockId === paddockId);
    if (!config) return;
    updatePaddock(paddockId, { events: config.events.filter((event) => event.id !== eventId) });
  };

  const openCreate = () => {
    setStep(0);
    setForm({
      ...emptyForm,
      name: `Kế hoạch chăn thả ${new Date().getFullYear()}`,
      groupIds: groups[0]?.id ? [groups[0].id] : [],
      paddocks: paddocks[0]?.id
        ? [{ paddockId: paddocks[0].id, priority: "5", rating: "5", supply: "", events: [makeEvent(defaultEventTypeForPaddock(paddocks[0]), today(), today())] }]
        : [],
    });
    setFormOpen(true);
  };

  const openEdit = (plan: GrazingPlan) => {
    setStep(1);
    setForm(formFromPlan(plan));
    setFormOpen(true);
  };

  const refreshFromResponse = (plan: GrazingPlan) => {
    setPlans((current) => {
      const exists = current.some((item) => item.id === plan.id);
      return exists ? current.map((item) => (item.id === plan.id ? plan : item)) : [plan, ...current];
    });
    router.refresh();
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const url = form.id ? `/api/du-lieu/chan-tha/${form.id}` : "/api/du-lieu/chan-tha";
      const response = await fetch(url, {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm(form)),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string; plan?: GrazingPlan };
      if (!response.ok || !result.plan) {
        setMessage(result.message ?? "Không thể lưu kế hoạch chăn thả.");
        return;
      }
      refreshFromResponse(result.plan);
      setFormOpen(false);
      setMessage(result.message ?? "Đã lưu kế hoạch chăn thả.");
    } catch {
      setMessage("Không thể kết nối máy chủ để lưu kế hoạch chăn thả.");
    } finally {
      setSaving(false);
    }
  };

  const cancelPlan = async (plan: GrazingPlan) => {
    if (!window.confirm(`Hủy kế hoạch "${plan.name}"? Bản ghi sẽ được chuyển trạng thái Đã hủy.`)) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/du-lieu/chan-tha/${plan.id}`, { method: "DELETE" });
      const result = (await response.json().catch(() => ({}))) as { message?: string; plan?: GrazingPlan };
      if (!response.ok || !result.plan) {
        setMessage(result.message ?? "Không thể hủy kế hoạch chăn thả.");
        return;
      }
      refreshFromResponse(result.plan);
      setMessage(result.message ?? "Đã hủy kế hoạch.");
    } catch {
      setMessage("Không thể kết nối máy chủ để hủy kế hoạch chăn thả.");
    } finally {
      setSaving(false);
    }
  };

  const stepItems = [
    { title: "Giới thiệu", sub: form.id ? "Đang sửa kế hoạch" : "Tạo kế hoạch mới" },
    {
      title: "Chi tiết",
      sub: form.name.trim()
        ? `${form.name.trim()} · ${getGrazingPlanTypeOption(form.type).shortLabel} · ${formatDate(form.startDate || null)}`
        : "Chưa nhập tên kế hoạch",
    },
    {
      title: "Sự kiện",
      sub: `${form.paddocks.length} ô · ${form.paddocks.reduce((total, item) => total + item.events.length, 0)} sự kiện`,
    },
  ];
  const canGoNext = step === 0 || (step === 1 && form.name.trim().length > 0) || step === 2;

  return (
    <div className={styles.page}>
      <section className={styles.topBar}>
        <div className={styles.titleBlock}>
          <span className={styles.titleIcon}><Icon name="pasture" /></span>
          <div>
            <p className={styles.eyebrow}>Chăn thả</p>
            <h1>Quản lý chăn thả</h1>
            <span>{farmName}</span>
          </div>
        </div>
        <div className={styles.headerTools}>
          <button type="button" className={styles.backButton} onClick={() => router.back()}><Icon name="back" /> Quay lại</button>
          <button type="button" className={styles.primaryButton} onClick={openCreate}><Icon name="add" /> Thêm kế hoạch</button>
          <DashboardTopActions />
        </div>
      </section>

      <section className={styles.filterBar} aria-label="Bộ lọc quản lý chăn thả">
        <details className={styles.filterMenu}>
          <summary><Icon name="table" /> Kế hoạch</summary>
          <div className={styles.filterDropdown}>
            <button type="button" className={planTypeFilter === "all" ? styles.filterChecked : ""} onClick={() => setPlanTypeFilter("all")}>Tất cả</button>
            {GRAZING_PLAN_TYPE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={planTypeFilter === item.value ? styles.filterChecked : ""}
                onClick={() => setPlanTypeFilter(item.value)}
              >
                {item.shortLabel}
              </button>
            ))}
          </div>
        </details>
        <details className={styles.filterMenu}>
          <summary><Icon name="table" /> Đặc trưng</summary>
          <div className={styles.filterDropdown}>
            {FEATURE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={featureFilters.includes(item.value) ? styles.filterChecked : ""}
                onClick={() => toggleFeature(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </details>
      </section>

      <section className={styles.viewTabs} aria-label="Kiểu xem chăn thả">
        {[
          { key: "plans", label: "Kế hoạch", icon: "calendar" },
          { key: "table", label: "Bảng", icon: "table" },
          { key: "chart", label: "Biểu đồ", icon: "chart" },
        ].map((item) => (
          <button key={item.key} type="button" className={view === item.key ? styles.viewTabActive : ""} onClick={() => setView(item.key as ViewMode)}>
            <Icon name={item.icon} /> {item.label}
          </button>
        ))}
      </section>

      <section className={styles.statsGrid}>
        {stats.map((item) => (
          <article key={item.label} className={styles.statCard}>
            <span>{item.label}</span>
            <strong>{item.value.toLocaleString("vi-VN")}</strong>
          </article>
        ))}
      </section>

      {message && !formOpen && <p className={styles.formMessage}>{message}</p>}

      {view === "plans" && (
        <section className={styles.planGrid}>
          {visiblePlans.length > 0 ? visiblePlans.map((plan) => {
            const duration = daysBetween(plan.startDate, plan.endDate);
            return (
              <article key={plan.id} className={styles.planCard} style={planStyle(plan)}>
                <span className={styles.demoBadge}>{getGrazingPlanTypeOption(plan.type).shortLabel}</span>
                <header>
                  <h2>{plan.name}</h2>
                  <div className={styles.cardActions}>
                    <button type="button" onClick={() => openEdit(plan)} aria-label="Sửa kế hoạch"><Icon name="edit" /></button>
                    <button type="button" onClick={() => cancelPlan(plan)} aria-label="Hủy kế hoạch" disabled={saving}><Icon name="trash" /></button>
                  </div>
                </header>
                <div className={styles.planMeta}>
                  <span>Trạng thái: <b data-status={plan.status}>{GRAZING_STATUS_LABELS[plan.status]}</b></span>
                  <span>Loại: <strong>{getGrazingPlanTypeOption(plan.type).label}</strong></span>
                  <span>Bắt đầu: <strong>{formatDate(plan.startDate)}</strong></span>
                  <span>Kết thúc: <strong>{formatDate(plan.endDate)}</strong></span>
                  <span>Thời lượng: <strong>{duration ? `${duration} ngày` : "-"}</strong></span>
                  {isFeatureVisible("events") && <span>Sự kiện: <strong>{plan.events.length}</strong></span>}
                  {isFeatureVisible("paddocks") && <span>Đám đồng: <strong>{plan.paddocks.length}</strong></span>}
                  {isFeatureVisible("groups") && <span>Nhóm chăn nuôi: <strong>{plan.groups.length}</strong></span>}
                </div>
              </article>
            );
          }) : <div className={styles.emptyState}>Chưa có kế hoạch chăn thả. Hãy thêm kế hoạch đầu tiên.</div>}
        </section>
      )}

      {view === "table" && (
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Bảng kế hoạch</p>
              <h2>Kế hoạch, ô chăn thả và sự kiện</h2>
            </div>
            <span className={styles.panelBadge}>{visiblePlans.length} kế hoạch hiệu lực</span>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Trạng thái</th>
                  <th>Loại</th>
                  <th>Bắt đầu</th>
                  <th>Kết thúc</th>
                  <th>Thời lượng (ngày)</th>
                </tr>
              </thead>
              <tbody>
                {visiblePlans.flatMap((plan) => {
                  const planStatus = displayStatus(plan.status, plan.startDate, plan.endDate);
                  const planKey = `plan:${plan.id}`;
                  const planCollapsed = isCollapsed(planKey);
                  const rows = [
                    <tr key={`${plan.id}-plan`} className={styles.planTableRow}>
                      <td>
                        <span className={styles.tableName}>
                          <button type="button" className={styles.collapseButton} onClick={() => toggleCollapsed(planKey)}>{planCollapsed ? "▸" : "▾"}</button>
                          <Icon name="pasture" /><strong>{plan.name}</strong>
                        </span>
                      </td>
                      <td><span className={styles.statusPill} data-status={planStatus}>{GRAZING_STATUS_LABELS[planStatus]}</span></td>
                      <td>Kế hoạch</td>
                      <td>{formatDate(plan.startDate)}</td>
                      <td>{formatDate(plan.endDate)}</td>
                      <td>{daysBetween(plan.startDate, plan.endDate) ?? "-"}</td>
                    </tr>,
                  ];
                  if (planCollapsed) return rows;

                  if (isFeatureVisible("paddocks")) {
                    for (const paddock of plan.paddocks) {
                      const paddockKey = `paddock:${plan.id}:${paddock.id}`;
                      const paddockCollapsed = isCollapsed(paddockKey);
                      rows.push(
                        <tr key={`${plan.id}-${paddock.id}`} className={styles.paddockTableRow}>
                          <td>
                            <span className={styles.tableName}>
                              <button type="button" className={styles.collapseButton} onClick={() => toggleCollapsed(paddockKey)}>{paddockCollapsed ? "▸" : "▾"}</button>
                              <Icon name="pasture" />{paddock.name}
                            </span>
                          </td>
                          <td>-</td>
                          <td>Đám đồng</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                        </tr>
                      );
                      if (!paddockCollapsed && isFeatureVisible("events")) {
                        for (const event of plan.events.filter((item) => item.paddockId === paddock.id)) {
                          const status = displayStatus(event.status, event.startDate, event.endDate);
                          rows.push(
                            <tr key={`${plan.id}-${paddock.id}-${event.id}`} className={styles.eventTableRow}>
                              <td><span className={styles.tableName}><Icon name="calendar" />{eventTitle(event)}</span></td>
                              <td><span className={styles.statusPill} data-status={status}>{GRAZING_STATUS_LABELS[status]}</span></td>
                              <td>Đám đồng (sự kiện)</td>
                              <td>{formatDate(event.startDate)}</td>
                              <td>{formatDate(event.endDate)}</td>
                              <td>{daysBetween(event.startDate, event.endDate || event.startDate) ?? "-"}</td>
                            </tr>
                          );
                        }
                      }
                    }
                  } else if (isFeatureVisible("events")) {
                    for (const event of plan.events) {
                      const status = displayStatus(event.status, event.startDate, event.endDate);
                      rows.push(
                        <tr key={`${plan.id}-event-${event.id}`} className={styles.eventTableRow}>
                          <td><span className={styles.tableName}><Icon name="calendar" />{eventTitle(event)}</span></td>
                          <td><span className={styles.statusPill} data-status={status}>{GRAZING_STATUS_LABELS[status]}</span></td>
                          <td>Sự kiện</td>
                          <td>{formatDate(event.startDate)}</td>
                          <td>{formatDate(event.endDate)}</td>
                          <td>{daysBetween(event.startDate, event.endDate || event.startDate) ?? "-"}</td>
                        </tr>
                      );
                    }
                  }

                  if (isFeatureVisible("groups")) {
                    for (const group of plan.groups) {
                      rows.push(
                        <tr key={`${plan.id}-group-${group.id}`} className={styles.groupTableRow}>
                          <td><span className={styles.tableName}><Icon name="table" />{group.name}</span></td>
                          <td>-</td>
                          <td>Nhóm chăn nuôi</td>
                          <td>-</td>
                          <td>-</td>
                          <td>{group.headCount.toLocaleString("vi-VN")} con</td>
                        </tr>
                      );
                    }
                  }
                  return rows;
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === "chart" && (
        <section className={styles.chartPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Biểu đồ</p>
              <h2>Sơ đồ dòng thời gian chăn thả</h2>
            </div>
            <span className={styles.panelBadge}>Theo {chartScale.label.toLowerCase()}</span>
          </div>
          <div className={styles.ganttShell}>
            <div className={styles.ganttToolbar}>
              <details className={styles.filterMenu}>
                <summary><Icon name="table" /> Kế hoạch</summary>
                <div className={styles.filterDropdown}>
                  <button type="button" className={planTypeFilter === "all" ? styles.filterChecked : ""} onClick={() => setPlanTypeFilter("all")}>Tất cả</button>
                  {GRAZING_PLAN_TYPE_OPTIONS.map((item) => (
                    <button key={item.value} type="button" className={planTypeFilter === item.value ? styles.filterChecked : ""} onClick={() => setPlanTypeFilter(item.value)}>
                      {item.shortLabel}
                    </button>
                  ))}
                </div>
              </details>
              <details className={styles.filterMenu}>
                <summary><Icon name="table" /> Đặc trưng</summary>
                <div className={styles.filterDropdown}>
                  {FEATURE_OPTIONS.map((item) => (
                    <button key={item.value} type="button" className={featureFilters.includes(item.value) ? styles.filterChecked : ""} onClick={() => toggleFeature(item.value)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </details>
              <details className={styles.filterMenu}>
                <summary><Icon name="calendar" /> {TIME_SCALE_OPTIONS.find((item) => item.value === timeScale)?.label ?? "Ngày"}</summary>
                <div className={styles.filterDropdown}>
                  {TIME_SCALE_OPTIONS.map((item) => (
                    <button key={item.value} type="button" className={timeScale === item.value ? styles.filterChecked : ""} onClick={() => setTimeScale(item.value)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </details>
            </div>
            <div
              className={styles.ganttGrid}
              style={{
                "--chart-days": chartDates.days,
                "--time-units": chartUnits,
                "--slot-width": `${chartScale.slotWidth}px`,
                "--timeline-width": `${chartWidth}px`,
              } as CSSProperties}
            >
              <div className={styles.ganttLeftHead}>
                <strong>Tên</strong>
                <strong>Ưu tiên</strong>
                <strong>Xếp hạng</strong>
                <strong>Diện tích</strong>
              </div>
              <div className={styles.ganttScale}>
                {chartTicks.map((tick) => (
                  <span key={tick} style={{ left: `${(dateOffset(chartDates.start, tick) / chartDates.days) * 100}%` } as CSSProperties}>
                    {formatShortDate(tick)}
                  </span>
                ))}
              </div>
              {chartRows.map((row) => {
                const left = `${Math.min(98, (dateOffset(chartDates.start, row.startDate || chartDates.start) / chartScaleDays) * 100)}%`;
                const width = `${Math.max(2, Math.min(100, ((daysBetween(row.startDate || chartDates.start, row.endDate || row.startDate || chartDates.start) ?? 1) / chartScaleDays) * 100))}%`;
                const color = row.eventType ? eventColor(row.eventType) : row.type === "plan" ? "#d99a00" : row.type === "group" ? "#3f3f46" : "#67a832";
                return (
                  <div key={row.id} className={styles.ganttRow}>
                    <div className={`${styles.ganttLabel} ${styles[`ganttLabel${row.type[0].toUpperCase()}${row.type.slice(1)}`]}`}>
                      <span>
                        {row.collapsible && row.collapseKey && (
                          <button type="button" className={styles.collapseButton} onClick={() => toggleCollapsed(row.collapseKey!)}>
                            {isCollapsed(row.collapseKey) ? "▸" : "▾"}
                          </button>
                        )}
                        {row.name}
                      </span>
                      <small>{row.prerequisite ? `Trước: ${row.prerequisite}` : ""}</small>
                    </div>
                    <div className={styles.ganttMetric}>{row.priority ?? "-"}</div>
                    <div className={styles.ganttMetric}>{row.rating ?? "-"}</div>
                    <div className={styles.ganttMetric}>{row.area ? `${row.area.toLocaleString("vi-VN")} ha` : "-"}</div>
                    <div className={styles.ganttCanvas}>
                      {row.startDate && (
                        <span
                          className={`${styles.ganttBar} ${styles[`ganttBar${row.type[0].toUpperCase()}${row.type.slice(1)}`]}`}
                          style={{ left, width, "--bar-color": color } as CSSProperties}
                        >
                          {row.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {formOpen && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="grazing-form-title">
          <form className={styles.modal} onSubmit={save}>
            <header className={styles.modalHead}>
              <h2 id="grazing-form-title">{form.id ? "Sửa kế hoạch chăn thả" : "Thêm kế hoạch chăn thả"}</h2>
              <button type="button" className={styles.closeButton} onClick={() => setFormOpen(false)}>×</button>
            </header>
            {message && <p className={styles.formMessage}>{message}</p>}

            <div className={styles.wizardShell}>
              <aside className={styles.stepRail}>
                {stepItems.map((item, index) => (
                  <button key={item.title} type="button" className={step === index ? styles.stepActive : ""} onClick={() => setStep(index as WizardStep)}>
                    <span>{index + 1} / 3</span>
                    <strong>{item.title}</strong>
                    <small>{item.sub}</small>
                  </button>
                ))}
              </aside>

              <section className={styles.stepContent}>
                <div className={styles.formSummary}>
                  <span><strong>Kế hoạch:</strong> {form.name.trim() || "Chưa nhập"}</span>
                  <span><strong>Kiểu:</strong> {getGrazingPlanTypeOption(form.type).shortLabel}</span>
                  <span><strong>Thời gian:</strong> {formatDate(form.startDate || null)} - {formatDate(form.endDate || null)}</span>
                  <span><strong>Dữ liệu:</strong> {form.paddocks.length} ô, {form.paddocks.reduce((total, item) => total + item.events.length, 0)} sự kiện</span>
                </div>
                {step === 0 && (
                  <div className={styles.introStep}>
                    <h3>Giới thiệu</h3>
                    <p>
                      Kế hoạch chăn thả giúp xác định lịch luân chuyển đàn, thời gian nghỉ cỏ và các hoạt động trên từng ô chăn thả.
                      Bạn có thể thêm nhiều ô chăn thả và nhiều sự kiện cho mỗi ô trong cùng một kế hoạch.
                    </p>
                    <div className={styles.resourceList}>
                      <strong>Dữ liệu được dùng trong hệ thống</strong>
                      <span>Ô chăn thả lấy từ Quản lý khu vực có loại grazing/pasture.</span>
                      <span>Nhóm đàn lấy từ module Vật nuôi.</span>
                      <span>Sự kiện sẽ hiển thị trên biểu đồ dòng thời gian của module chăn thả.</span>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className={styles.formGrid}>
                    <label><span>Tên kế hoạch *</span><input value={form.name} onChange={(e) => update("name", e.target.value)} required /></label>
                    <label><span>Mã kế hoạch</span><input value={form.code} onChange={(e) => update("code", e.target.value)} placeholder="Tự sinh nếu bỏ trống" /></label>
                    <label><span>Kiểu kế hoạch *</span><select value={form.type} onChange={(e) => update("type", e.target.value as GrazingPlanType)}>{GRAZING_PLAN_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                    <label><span>Trạng thái</span><select value={form.status} onChange={(e) => update("status", e.target.value as GrazingStatus)}>{Object.entries(GRAZING_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label><span>Ngày bắt đầu *</span><input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} required /></label>
                    <label><span>Ngày kết thúc</span><input type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} /></label>
                    <label><span>Người phụ trách</span><input value={form.manager} onChange={(e) => update("manager", e.target.value)} /></label>
                    <label className={styles.fullField}><span>Mục tiêu dài hạn / ghi chú</span><textarea value={form.note} onChange={(e) => update("note", e.target.value)} rows={4} /></label>
                    <div className={styles.selectorPanel}>
                      <span>Nhóm vật nuôi</span>
                      <div className={styles.checkList}>
                        {groups.length > 0 ? groups.map((group) => (
                          <label key={group.id}>
                            <input type="checkbox" checked={form.groupIds.includes(group.id)} onChange={() => update("groupIds", toggleValue(form.groupIds, group.id))} />
                            <strong>{group.name}</strong>
                            <small>{group.headCount.toLocaleString("vi-VN")} con · {group.species}</small>
                          </label>
                        )) : <p>Chưa có nhóm vật nuôi. Có thể tạo trong module Vật nuôi.</p>}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className={styles.eventStep}>
                    <label className={styles.fullField}>
                      <span>Ô chăn thả *</span>
                      <select value="" onChange={(event) => event.target.value && setPaddockSelected(event.target.value, true)}>
                        <option value="">Chọn ô chăn thả để thêm vào kế hoạch</option>
                        {paddocks.filter((paddock) => !form.paddocks.some((item) => item.paddockId === paddock.id)).map((paddock) => (
                          <option key={paddock.id} value={paddock.id}>{paddock.name} · {paddock.zoneTypeLabel}</option>
                        ))}
                      </select>
                    </label>

                    {selectedPaddocks.length === 0 && (
                      <div className={styles.emptyState}>Chưa chọn ô chăn thả. Nếu danh sách trống, hãy tạo khu vực loại grazing/pasture trong Quản lý khu vực trước.</div>
                    )}

                    {form.paddocks.map((config) => {
                      const paddock = paddocks.find((item) => item.id === config.paddockId);
                      if (!paddock) return null;
                      return (
                        <article key={config.paddockId} className={styles.paddockEventCard}>
                          <header>
                            <strong>{paddock.name}<small>{paddock.zoneTypeLabel}</small></strong>
                            <button type="button" onClick={() => setPaddockSelected(config.paddockId, false)}>Xóa ô</button>
                          </header>
                          <div className={styles.paddockSettings}>
                            <span>Thiết lập:</span>
                            <select value={config.priority} onChange={(e) => updatePaddock(config.paddockId, { priority: e.target.value })}>
                              {Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>Ưu tiên {index + 1}</option>)}
                            </select>
                            <select value={config.rating} onChange={(e) => updatePaddock(config.paddockId, { rating: e.target.value })}>
                              {Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>Xếp hạng {index + 1}</option>)}
                            </select>
                            <input value={config.supply} onChange={(e) => updatePaddock(config.paddockId, { supply: e.target.value })} placeholder="Nguồn cung / DSE/D" />
                          </div>
                          <div className={styles.addEventRow}>
                            <span>Sự kiện:</span>
                            <select id={`event-type-${config.paddockId}`}>
                              {eventTypesForPaddock(paddock).map((value) => <option key={value} value={value}>{GRAZING_EVENT_TYPE_LABELS[value]}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const select = document.getElementById(`event-type-${config.paddockId}`) as HTMLSelectElement | null;
                                addPaddockEvent(config.paddockId, (select?.value as GrazingEventType) || "grazing");
                              }}
                            >
                              + Thêm sự kiện
                            </button>
                          </div>
                          <div className={styles.eventList}>
                            {config.events.map((event) => (
                              <div key={event.id} className={`${styles.eventLine} ${event.type === "other" ? "" : styles.eventLineCompact}`}>
                                <span className={styles.eventDot} style={{ "--event-color": eventColor(event.type) } as CSSProperties} />
                                <select
                                  value={event.type}
                                  onChange={(e) => {
                                    const type = e.target.value as GrazingEventType;
                                    updatePaddockEvent(config.paddockId, event.id, {
                                      type,
                                      title: type === "other" ? "" : GRAZING_EVENT_TYPE_LABELS[type],
                                    });
                                  }}
                                >
                                  {eventTypesForPaddock(paddock).map((value) => <option key={value} value={value}>{GRAZING_EVENT_TYPE_LABELS[value]}</option>)}
                                </select>
                                {event.type === "other" && (
                                  <input
                                    value={event.title}
                                    onChange={(e) => updatePaddockEvent(config.paddockId, event.id, { title: e.target.value })}
                                    placeholder="Nhập tên sự kiện khác"
                                    required
                                  />
                                )}
                                <input type="date" value={event.startDate} onChange={(e) => updatePaddockEvent(config.paddockId, event.id, { startDate: e.target.value })} />
                                <input type="date" value={event.endDate} onChange={(e) => updatePaddockEvent(config.paddockId, event.id, { endDate: e.target.value })} />
                                <input
                                  value={event.prerequisite}
                                  onChange={(e) => updatePaddockEvent(config.paddockId, event.id, { prerequisite: e.target.value })}
                                  placeholder="Việc cần làm trước"
                                />
                                <button type="button" onClick={() => removePaddockEvent(config.paddockId, event.id)}>Xóa</button>
                              </div>
                            ))}
                          </div>
                        </article>
                      );
                    })}

                    <div className={styles.notesBox}>
                      <strong>Ghi chú</strong>
                      <span>Nguồn cung: đơn vị đo dùng để tính sức chứa và lượng thức ăn sẵn có.</span>
                      <span>Nhu cầu: đơn vị đo dùng để tính mật độ chăn thả.</span>
                      <span>Có thể thêm nhiều sự kiện cho mỗi ô chăn thả để theo dõi lịch luân chuyển đầy đủ.</span>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <footer className={styles.modalFoot}>
              {step > 0 && <button type="button" className={styles.secondaryButton} onClick={() => setStep((step - 1) as WizardStep)} disabled={saving}>Quay lại</button>}
              {step < 2 && <button type="button" className={styles.primaryButton} onClick={() => setStep((step + 1) as WizardStep)} disabled={!canGoNext || saving}>Tiếp theo</button>}
              {step === 2 && <button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? "Đang lưu..." : "Hoàn tất"}</button>}
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
