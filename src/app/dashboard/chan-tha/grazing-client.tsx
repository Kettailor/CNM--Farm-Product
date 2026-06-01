"use client";

import { useCallback, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import GrazingGanttChart from "./grazing-gantt-chart";
import {
  GRAZING_EVENT_TYPE_LABELS,
  GRAZING_EVENT_TYPE_VALUES,
  GRAZING_PLAN_TYPE_OPTIONS,
  GRAZING_STATUS_LABELS,
  getGrazingPlanTypeOption,
  type GrazingEvent,
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

type GrazingUserOption = {
  id: string;
  name: string;
  email: string | null;
};

type EventForm = {
  id: string;
  type: GrazingEventType;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  prerequisite: string;
  prerequisiteId: string;
  repeat: boolean;
};

type PaddockConfig = {
  paddockId: string;
  priority: string;
  rating: string;
  supply: string;
  events: EventForm[];
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
const MAX_TABLE_EVENTS_PER_PLAN = 240;
const PERPETUAL_PLAN_DAYS = 7;
const MAX_RENDERED_PLANS = 40;
const MINUTE_MS = 60_000;

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
    startTime: "08:00",
    endTime: "17:00",
    prerequisite: "",
    prerequisiteId: "",
    repeat: false,
  };
}

function cleanTime(value: unknown) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{2}):(\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) return "";
  return `${match[1]}:${match[2]}`;
}

function metadataText(event: GrazingEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function dateTimeLocalValue(date: string, time: string) {
  return date ? `${date}T${cleanTime(time) || "00:00"}` : "";
}

function splitDateTimeLocal(value: string) {
  const [date = "", time = ""] = value.split("T");
  return { date, time: cleanTime(time) };
}

function dateTimeToUtcMs(dateValue: string, timeValue: string, endOfDay = false) {
  if (!dateValue) return null;
  const date = dateToUtcTime(dateValue);
  if (date == null) return null;
  const time = cleanTime(timeValue);
  if (!time) return date + (endOfDay ? 24 * 60 * MINUTE_MS - MINUTE_MS : 0);
  const [hour, minute] = time.split(":").map(Number);
  return date + (hour * 60 + minute) * MINUTE_MS;
}

function dateTimeFromUtcMs(value: number) {
  const date = new Date(value);
  return {
    date: date.toISOString().slice(0, 10),
    time: date.toISOString().slice(11, 16),
  };
}

function daysBetween(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null;
  const start = dateToUtcTime(startDate);
  const end = dateToUtcTime(endDate);
  if (start == null || end == null) return null;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function dateOffset(startDate: string | null, value: string | null) {
  if (!startDate || !value) return 0;
  const start = dateToUtcTime(startDate);
  const date = dateToUtcTime(value);
  if (start == null || date == null) return 0;
  return Math.max(0, Math.round((date - start) / 86400000));
}

function addDays(value: string, days: number) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return value;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function dateToUtcTime(value: string) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const [year, month, day] = parts;
  return Date.UTC(year, month - 1, day);
}

function isTruthy(value: unknown) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function repeatWindow(form: FormState) {
  return form.endDate;
}

function eventDuration(event: { startDate: string; endDate: string }) {
  return daysBetween(event.startDate, event.endDate || event.startDate) ?? 1;
}

function eventDurationLabel(event: Pick<EventForm, "startDate" | "endDate" | "startTime" | "endTime">) {
  if (event.startDate && (event.endDate || event.startDate) === event.startDate) {
    const [startHour, startMinute] = (cleanTime(event.startTime) || "00:00").split(":").map(Number);
    const [endHour, endMinute] = (cleanTime(event.endTime) || "23:59").split(":").map(Number);
    const minutes = Math.max(1, endHour * 60 + endMinute - (startHour * 60 + startMinute));
    if (minutes < 24 * 60) {
      const hours = Math.floor(minutes / 60);
      const remain = minutes % 60;
      return [hours ? `${hours} giờ` : "", remain ? `${remain} phút` : ""].filter(Boolean).join(" ") || "1 phút";
    }
  }
  return `${eventDuration(event)} ngày`;
}

function eventDurationMinutes(event: Pick<EventForm, "startDate" | "endDate" | "startTime" | "endTime">) {
  const start = dateTimeToUtcMs(event.startDate, event.startTime);
  const end = dateTimeToUtcMs(event.endDate || event.startDate, event.endTime, !event.endTime);
  if (start == null || end == null || end <= start) return 24 * 60;
  return Math.max(1, Math.round((end - start) / MINUTE_MS));
}

function alignEventAfterPrerequisite(event: EventForm, prerequisite: Pick<EventForm, "endDate" | "startDate" | "endTime">) {
  const previousEnd = dateTimeToUtcMs(prerequisite.endDate || prerequisite.startDate, prerequisite.endTime, !prerequisite.endTime);
  if (previousEnd == null) return event;
  const durationMinutes = eventDurationMinutes(event);
  const nextStart = dateTimeFromUtcMs(previousEnd);
  const nextEnd = dateTimeFromUtcMs(previousEnd + durationMinutes * MINUTE_MS);
  return {
    ...event,
    startDate: nextStart.date,
    startTime: nextStart.time,
    endDate: nextEnd.date,
    endTime: nextEnd.time,
  };
}

function currentPerpetualCycleStart(eventStartDate: string) {
  const current = today();
  return eventStartDate && eventStartDate > current ? eventStartDate : current;
}

function currentPerpetualCycleEnd(startDate: string) {
  return addDays(startDate, PERPETUAL_PLAN_DAYS - 1);
}

function recurrenceIndex(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(value: string | null, time?: string | null) {
  if (!value) return "-";
  const formattedDate = formatDate(value);
  const formattedTime = cleanTime(time);
  return formattedTime ? `${formattedTime} ${formattedDate}` : formattedDate;
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

function eventSequence(index: number) {
  return `CV${String(index + 1).padStart(2, "0")}`;
}

function dependencyText(value: string | null | undefined) {
  return value?.trim() || "";
}

function actionHint(value: string | null | undefined) {
  return dependencyText(value) ? "Làm sau công việc trước" : "Có thể làm ngay";
}

function prerequisiteLabel(events: GrazingEvent[], event: GrazingEvent) {
  const prerequisiteId = String(event.metadata?.prerequisiteId ?? "");
  if (!prerequisiteId) return dependencyText(event.note);
  const index = events.findIndex((item) => item.id === prerequisiteId || item.metadata?.sourceId === prerequisiteId);
  const source = index >= 0 ? events[index] : null;
  return source ? `F-S: ${eventSequence(index)} - ${eventTitle(source)}` : dependencyText(event.note);
}

function limitedEventsForTable(events: GrazingEvent[], limit = MAX_TABLE_EVENTS_PER_PLAN, predicate?: (event: GrazingEvent) => boolean) {
  const result: GrazingEvent[] = [];
  for (const event of events) {
    if (predicate && !predicate(event)) continue;
    result.push(event);
    if (result.length >= limit) break;
  }
  return result;
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
        .filter((event) => {
          if (event.paddockId !== paddock.id) return false;
          if (plan.type !== "perpetual" || !isTruthy(event.metadata?.repeat)) return true;
          const index = recurrenceIndex(event.metadata?.recurrenceIndex);
          return index == null || index <= 1;
        })
        .map((event) => ({
          id: event.id,
          type: event.type,
          title: event.title,
          startDate: event.startDate ?? plan.startDate ?? "",
          endDate: event.endDate ?? plan.endDate ?? "",
          startTime: cleanTime(metadataText(event, "startTime")) || "08:00",
          endTime: cleanTime(metadataText(event, "endTime")) || "17:00",
          prerequisite: event.note ?? "",
          prerequisiteId: String(event.metadata?.prerequisiteId ?? ""),
          repeat: isTruthy(event.metadata?.repeat),
        })),
    })),
  };
}

function formatPlanEnd(plan: { type: GrazingPlanType; endDate: string | null }) {
  return plan.type === "perpetual" ? `Vĩnh viễn (${PERPETUAL_PLAN_DAYS} ngày/lần)` : formatDate(plan.endDate);
}

function planDuration(plan: { type: GrazingPlanType; startDate: string | null; endDate: string | null }) {
  return plan.type === "perpetual" ? PERPETUAL_PLAN_DAYS : daysBetween(plan.startDate, plan.endDate);
}

function payloadFromForm(form: FormState) {
  const planEnd = repeatWindow(form);
  const perpetualCycleStart = currentPerpetualCycleStart(form.startDate || today());
  const perpetualCycleEnd = currentPerpetualCycleEnd(perpetualCycleStart);
  const expandEvents = (events: EventForm[]) => events.flatMap((event) => {
    const durationDays = eventDuration(event);
    if (form.type === "perpetual") {
      const offset = form.startDate && event.startDate ? Math.min(PERPETUAL_PLAN_DAYS - 1, dateOffset(form.startDate, event.startDate)) : 0;
      const startDate = addDays(perpetualCycleStart, Math.max(0, offset));
      const remainingDays = daysBetween(startDate, perpetualCycleEnd) ?? 1;
      const cappedDurationDays = Math.max(1, Math.min(durationDays, remainingDays));
      return [{
        ...event,
        repeat: true,
        startDate,
        endDate: addDays(startDate, cappedDurationDays - 1),
        durationDays: cappedDurationDays,
        recurrenceIndex: 1,
      }];
    }
    const shouldRepeat = event.repeat && event.startDate && planEnd && durationDays > 0;
    if (!shouldRepeat) return [{ ...event, durationDays }];
    const expanded: Array<EventForm & { durationDays: number; recurrenceIndex: number }> = [];
    let start = event.startDate;
    let index = 1;
    while (start && start <= planEnd && index <= 370) {
      const endDate = addDays(start, durationDays - 1);
      if (endDate > planEnd) break;
      expanded.push({ ...event, repeat: true, startDate: start, endDate, durationDays, recurrenceIndex: index });
      start = addDays(endDate, 1);
      index += 1;
    }
    return expanded.length ? expanded : [{ ...event, durationDays }];
  });

  return {
    code: form.code || undefined,
    name: form.name,
    type: form.type,
    status: form.status,
    startDate: form.startDate || null,
    endDate: form.type === "perpetual" ? null : form.endDate || null,
    manager: form.manager,
    note: form.note,
    groupIds: form.groupIds,
    paddocks: form.paddocks.map((paddock) => ({
      paddockId: paddock.paddockId,
      priority: paddock.priority,
      rating: paddock.rating,
      supply: paddock.supply,
      events: expandEvents(paddock.events),
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
  users,
  canWrite,
}: {
  farmName: string;
  initialPlans: GrazingPlan[];
  paddocks: GrazingPaddock[];
  groups: GrazingLivestockGroup[];
  users: GrazingUserOption[];
  canWrite: boolean;
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
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);

  const filteredPlans = useMemo(
    () => plans.filter((plan) => plan.status !== "da_huy" && (planTypeFilter === "all" || plan.type === planTypeFilter)),
    [planTypeFilter, plans]
  );
  const visiblePlans = useMemo(() => filteredPlans.slice(0, MAX_RENDERED_PLANS), [filteredPlans]);
  const canceledPlans = useMemo(() => plans.filter((plan) => plan.status === "da_huy"), [plans]);
  const isFeatureVisible = useCallback((feature: FeatureFilter) => featureFilters.includes(feature), [featureFilters]);
  const isCollapsed = useCallback((id: string) => collapsedIds.includes(id), [collapsedIds]);
  const toggleCollapsed = (id: string) => {
    setCollapsedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };
  const toggleFeature = (feature: FeatureFilter) => {
    setFeatureFilters((current) => (current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]));
  };

  const selectedPaddocks = useMemo(
    () => form.paddocks.map((item) => paddocks.find((paddock) => paddock.id === item.paddockId)).filter((item): item is GrazingPaddock => Boolean(item)),
    [form.paddocks, paddocks]
  );
  const eventOptions = useMemo(() => {
    return form.paddocks.flatMap((config) => {
      const paddock = paddocks.find((item) => item.id === config.paddockId);
      return config.events.map((event) => ({
        id: event.id,
        paddockId: config.paddockId,
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime,
        endTime: event.endTime,
        label: `${eventTitle(event)} - ${paddock?.name ?? "Khu vực khác"} - ${formatDateTime(event.startDate || null, event.startTime)}`,
      }));
    });
  }, [form.paddocks, paddocks]);

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

  const updatePlanType = (type: GrazingPlanType) => {
    setMessage("");
    setForm((current) => ({
      ...current,
      type,
      endDate: type === "perpetual" ? "" : current.endDate,
      paddocks: current.paddocks.map((paddock) => ({
        ...paddock,
        events: paddock.events.map((event) => ({
          ...event,
          repeat: type === "perpetual" ? true : type === "seasonal" ? false : event.repeat,
        })),
      })),
    }));
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
            events: [{ ...makeEvent(defaultType, current.startDate, current.endDate || current.startDate), repeat: current.type === "perpetual" }],
          },
        ],
      };
    });
  };

  const addPaddockEvent = (paddockId: string, type: GrazingEventType) => {
    const nextEvent = { ...makeEvent(type, form.startDate, form.endDate || form.startDate), repeat: form.type === "perpetual" };
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
    if (!canWrite) return;
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
    if (!canWrite) return;
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
    if (!canWrite) return;
    if (form.type !== "perpetual" && !form.endDate) {
      setMessage("Vui lòng nhập ngày kết thúc cho kế hoạch theo mùa hoặc trái mùa.");
      setStep(1);
      return;
    }
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
    if (!canWrite) return;
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
  const hasRequiredEndDate = form.type === "perpetual" || Boolean(form.endDate);
  const canGoNext = step === 0 || (step === 1 && form.name.trim().length > 0 && hasRequiredEndDate) || step === 2;

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
          {canWrite && <button type="button" className={styles.primaryButton} onClick={openCreate}><Icon name="add" /> Thêm kế hoạch</button>}
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
            const duration = planDuration(plan);
            return (
              <article key={plan.id} className={styles.planCard} style={planStyle(plan)}>
                <span className={styles.demoBadge}>{getGrazingPlanTypeOption(plan.type).shortLabel}</span>
                <header>
                  <h2>{plan.name}</h2>
                  {canWrite && (
                    <div className={styles.cardActions}>
                      <button type="button" onClick={() => openEdit(plan)} aria-label="Sửa kế hoạch"><Icon name="edit" /></button>
                      <button type="button" onClick={() => cancelPlan(plan)} aria-label="Hủy kế hoạch" disabled={saving}><Icon name="trash" /></button>
                    </div>
                  )}
                </header>
                <div className={styles.planMeta}>
                  <span>Trạng thái: <b data-status={plan.status}>{GRAZING_STATUS_LABELS[plan.status]}</b></span>
                  <span>Loại: <strong>{getGrazingPlanTypeOption(plan.type).label}</strong></span>
                  <span>Bắt đầu: <strong>{formatDate(plan.startDate)}</strong></span>
                  <span>Kết thúc: <strong>{formatPlanEnd(plan)}</strong></span>
                  <span>Thời lượng: <strong>{duration ? `${duration} ngày` : "-"}</strong></span>
                  {isFeatureVisible("events") && <span>Sự kiện: <strong>{plan.events.length}</strong></span>}
                  {isFeatureVisible("paddocks") && <span>Đám đồng: <strong>{plan.paddocks.length}</strong></span>}
                  {isFeatureVisible("groups") && <span>Nhóm chăn nuôi: <strong>{plan.groups.length}</strong></span>}
                </div>
                <div className={styles.rowActions}>
                  <a className={styles.secondaryButton} href={`/dashboard/chan-tha/${plan.id}`}>Chi tiết</a>
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
                  <th>Công việc trước</th>
                  <th>Cách xử lý</th>
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
                      <td>{formatPlanEnd(plan)}</td>
                      <td>{planDuration(plan) ?? "-"}</td>
                      <td>-</td>
                      <td>-</td>
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
                          <td>-</td>
                          <td>-</td>
                        </tr>
                      );
                      if (!paddockCollapsed && isFeatureVisible("events")) {
                        for (const [eventIndex, event] of limitedEventsForTable(plan.events, MAX_TABLE_EVENTS_PER_PLAN, (item) => item.paddockId === paddock.id).entries()) {
                          const status = displayStatus(event.status, event.startDate, event.endDate);
                          const sequence = eventSequence(eventIndex);
                          const dependency = prerequisiteLabel(plan.events, event);
                          rows.push(
                            <tr key={`${plan.id}-${paddock.id}-${event.id}`} className={styles.eventTableRow}>
                              <td><span className={styles.tableName}><Icon name="calendar" /><span className={styles.sequenceBadge}>{sequence}</span>{eventTitle(event)}</span></td>
                              <td><span className={styles.statusPill} data-status={status}>{GRAZING_STATUS_LABELS[status]}</span></td>
                              <td>Đám đồng (sự kiện)</td>
                              <td>{formatDateTime(event.startDate, metadataText(event, "startTime"))}</td>
                              <td>{formatDateTime(event.endDate || event.startDate, metadataText(event, "endTime"))}</td>
                              <td>{daysBetween(event.startDate, event.endDate || event.startDate) ?? "-"}</td>
                              <td>{dependency ? <span className={styles.dependencyPill}>{dependency}</span> : <span className={styles.readyPill}>Không có</span>}</td>
                              <td><span className={dependency ? styles.waitingPill : styles.readyPill}>{dependency ? "F-S" : actionHint(event.note)}</span></td>
                            </tr>
                          );
                        }
                      }
                    }
                  } else if (isFeatureVisible("events")) {
                    for (const [eventIndex, event] of limitedEventsForTable(plan.events).entries()) {
                      const status = displayStatus(event.status, event.startDate, event.endDate);
                      const sequence = eventSequence(eventIndex);
                      const dependency = prerequisiteLabel(plan.events, event);
                      rows.push(
                        <tr key={`${plan.id}-event-${event.id}`} className={styles.eventTableRow}>
                          <td><span className={styles.tableName}><Icon name="calendar" /><span className={styles.sequenceBadge}>{sequence}</span>{eventTitle(event)}</span></td>
                          <td><span className={styles.statusPill} data-status={status}>{GRAZING_STATUS_LABELS[status]}</span></td>
                          <td>Sự kiện</td>
                          <td>{formatDateTime(event.startDate, metadataText(event, "startTime"))}</td>
                          <td>{formatDateTime(event.endDate || event.startDate, metadataText(event, "endTime"))}</td>
                          <td>{daysBetween(event.startDate, event.endDate || event.startDate) ?? "-"}</td>
                          <td>{dependency ? <span className={styles.dependencyPill}>{dependency}</span> : <span className={styles.readyPill}>Không có</span>}</td>
                          <td><span className={dependency ? styles.waitingPill : styles.readyPill}>{dependency ? "F-S" : actionHint(event.note)}</span></td>
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
                          <td>-</td>
                          <td>-</td>
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

      {view === "chart" && <GrazingGanttChart plans={visiblePlans} title="Sơ đồ dòng thời gian chăn thả" />}

      {canWrite && formOpen && (
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
                  <span><strong>Thời gian:</strong> {formatDate(form.startDate || null)} - {form.type === "perpetual" ? `Vĩnh viễn (${PERPETUAL_PLAN_DAYS} ngày/lần)` : formatDate(form.endDate || null)}</span>
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
                    {form.id && <label><span>Mã kế hoạch</span><input value={form.code} onChange={(e) => update("code", e.target.value)} placeholder="Tự sinh nếu bỏ trống" /></label>}
                    <label><span>Kiểu kế hoạch *</span><select value={form.type} onChange={(e) => updatePlanType(e.target.value as GrazingPlanType)}>{GRAZING_PLAN_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                    <label><span>Trạng thái</span><select value={form.status} onChange={(e) => update("status", e.target.value as GrazingStatus)}>{Object.entries(GRAZING_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label><span>Ngày bắt đầu *</span><input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} required /></label>
                    {form.type !== "perpetual" && <label><span>Ngày kết thúc *</span><input type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} required /></label>}
                    <label>
                      <span>Người phụ trách</span>
                      <select value={form.manager} onChange={(e) => update("manager", e.target.value)}>
                        <option value="">Chưa chọn</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.name}>{user.name}{user.email ? ` - ${user.email}` : ""}</option>
                        ))}
                      </select>
                    </label>
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
                            {config.events.map((event) => {
                              const prerequisiteOptions = eventOptions.filter((item) => item.id !== event.id);
                              const repeatEnabled = form.type === "perpetual" || form.type === "off_season";
                              return (
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
                                <input
                                  type="datetime-local"
                                  value={dateTimeLocalValue(event.startDate, event.startTime)}
                                  onChange={(e) => {
                                    const value = splitDateTimeLocal(e.target.value);
                                    updatePaddockEvent(config.paddockId, event.id, { startDate: value.date, startTime: value.time });
                                  }}
                                />
                                <input
                                  type="datetime-local"
                                  value={dateTimeLocalValue(event.endDate, event.endTime)}
                                  onChange={(e) => {
                                    const value = splitDateTimeLocal(e.target.value);
                                    updatePaddockEvent(config.paddockId, event.id, { endDate: value.date, endTime: value.time });
                                  }}
                                />
                                <span className={styles.durationChip}>Thời lượng: {eventDurationLabel(event)}</span>
                                {repeatEnabled && (
                                  <label className={styles.repeatToggle}>
                                    <input
                                      type="checkbox"
                                      checked={form.type === "perpetual" || event.repeat}
                                      disabled={form.type === "perpetual"}
                                      onChange={(e) => updatePaddockEvent(config.paddockId, event.id, { repeat: e.target.checked })}
                                    />
                                    <span>Lặp lại</span>
                                  </label>
                                )}
                                <select
                                  value={event.prerequisiteId}
                                  onChange={(e) => {
                                    const selected = prerequisiteOptions.find((item) => item.id === e.target.value);
                                    const alignedEvent = selected ? alignEventAfterPrerequisite(event, selected) : event;
                                    updatePaddockEvent(config.paddockId, event.id, {
                                      startDate: alignedEvent.startDate,
                                      startTime: alignedEvent.startTime,
                                      endDate: alignedEvent.endDate,
                                      endTime: alignedEvent.endTime,
                                      prerequisiteId: e.target.value,
                                      prerequisite: selected?.label ?? "",
                                    });
                                  }}
                                >
                                  <option value="">Không có công việc trước</option>
                                  {prerequisiteOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                                </select>
                                <input type="hidden"
                                  value={event.prerequisite}
                                  onChange={(e) => updatePaddockEvent(config.paddockId, event.id, { prerequisite: e.target.value })}
                                  placeholder="Việc cần làm trước"
                                />
                                <button type="button" onClick={() => removePaddockEvent(config.paddockId, event.id)}>Xóa</button>
                              </div>
                            );})}
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
