"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import {
  GRAZING_EVENT_TYPE_LABELS,
  GRAZING_PLAN_TYPE_OPTIONS,
  type GrazingEvent,
  type GrazingEventType,
  type GrazingPlan,
  type GrazingPlanType,
} from "@/lib/grazing-types";
import styles from "./page.module.css";

type FeatureFilter = "events" | "groups" | "paddocks";
type TimeScale = "hour" | "day" | "week" | "month";

type ChartRow = {
  id: string;
  name: string;
  type: "plan" | "paddock" | "event" | "group";
  sequence?: string;
  priority?: number | string | null;
  rating?: number | string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  eventType?: GrazingEventType;
  label?: string;
  prerequisite?: string | null;
  actionHint?: string | null;
  dependencyStartDate?: string | null;
  dependencyStartTime?: string | null;
  dependencyEndDate?: string | null;
  dependencyEndTime?: string | null;
  dependencySourceRowId?: string | null;
  segments?: ChartSegment[];
  collapseKey?: string;
  collapsible?: boolean;
  suppressBar?: boolean;
};

type ChartSegment = {
  id: string;
  label: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  color: string;
};

type ScheduledEvent = {
  event: GrazingEvent;
  sequence: string;
  durationLabel: string;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  dependencySource: ScheduledEvent | null;
  dependencyLabel: string;
};

const FEATURE_OPTIONS: Array<{ value: FeatureFilter; label: string }> = [
  { value: "events", label: "Sự kiện" },
  { value: "groups", label: "Nhóm chăn nuôi" },
  { value: "paddocks", label: "Đám đồng" },
];
const TIME_SCALE_OPTIONS: Array<{ value: TimeScale; label: string; stepDays: number; slotWidth: number; maxTickCount: number }> = [
  { value: "hour", label: "Giờ", stepDays: 1 / 24, slotWidth: 42, maxTickCount: 96 },
  { value: "day", label: "Ngày", stepDays: 1, slotWidth: 84, maxTickCount: 36 },
  { value: "week", label: "Tuần", stepDays: 7, slotWidth: 96, maxTickCount: 28 },
  { value: "month", label: "Tháng", stepDays: 30, slotWidth: 110, maxTickCount: 18 },
];
const MAX_CHART_EVENTS_PER_PLAN = 180;
const MAX_CHART_DAYS = 180;
const CHART_CONTEXT_DAYS = 2;
const CHART_FOCUS_PAST_DAYS = 14;
const MAX_RENDERED_PLANS = 40;
const PERPETUAL_PLAN_DAYS = 7;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const GANTT_ROW_HEIGHT = 72;
const GANTT_ROW_MIDPOINT = 36;

const today = () => new Date().toISOString().slice(0, 10);

function cleanTime(value: unknown) {
  const text = String(value ?? "").trim();
  const direct = text.match(/^(\d{2}):(\d{2})/);
  if (!direct) return null;
  const hour = Number(direct[1]);
  const minute = Number(direct[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) return null;
  return `${direct[1]}:${direct[2]}`;
}

function timeFromDateTime(value: string | null | undefined) {
  const text = String(value ?? "");
  const match = text.match(/T(\d{2}:\d{2})/);
  return match ? cleanTime(match[1]) : null;
}

function metadataString(event: GrazingEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "string" ? value : null;
}

function eventStartTime(event: GrazingEvent) {
  return cleanTime(metadataString(event, "startTime")) ?? timeFromDateTime(event.startDate);
}

function eventEndTime(event: GrazingEvent) {
  return cleanTime(metadataString(event, "endTime")) ?? timeFromDateTime(event.endDate);
}

function dateOnly(value: string | null | undefined) {
  const text = String(value ?? "");
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function dateToUtcMs(value: string) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const [year, month, day] = parts;
  return Date.UTC(year, month - 1, day);
}

function dateTimeToUtcMs(dateValue: string | null | undefined, timeValue: string | null | undefined, endOfDay = false) {
  const date = dateOnly(dateValue);
  if (!date) return null;
  const base = dateToUtcMs(date);
  if (base == null) return null;
  const time = cleanTime(timeValue);
  if (!time) return base + (endOfDay ? DAY_MS - 60_000 : 0);
  const [hour, minute] = time.split(":").map(Number);
  return base + hour * HOUR_MS + minute * 60_000;
}

function dateFromMs(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const base = dateToUtcMs(value);
  if (base == null) return value;
  return dateFromMs(base + days * DAY_MS);
}

function maxMs(a: number, b: number) {
  return a > b ? a : b;
}

function minMs(a: number, b: number) {
  return a < b ? a : b;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${dateOnly(value) ?? value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(dateValue: string | null, timeValue?: string | null) {
  if (!dateValue) return "-";
  const dateText = formatDate(dateValue);
  const time = cleanTime(timeValue);
  return time ? `${time} ${dateText}` : dateText;
}

function durationText(startDate: string | null, endDate: string | null, startTime?: string | null, endTime?: string | null) {
  if (!cleanTime(startTime) && !cleanTime(endTime)) {
    const startDay = dateToUtcMs(dateOnly(startDate) ?? "");
    const endDay = dateToUtcMs(dateOnly(endDate || startDate) ?? "");
    if (startDay != null && endDay != null) return `${Math.max(1, Math.round((endDay - startDay) / DAY_MS) + 1)} ngày`;
  }
  const start = dateTimeToUtcMs(startDate, startTime);
  const end = dateTimeToUtcMs(endDate || startDate, endTime, !endTime);
  if (start == null || end == null) return "1 ngày";
  const totalMinutes = Math.max(1, Math.round((end - start) / 60_000));
  if (totalMinutes < 24 * 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return [hours ? `${hours} giờ` : "", minutes ? `${minutes} phút` : ""].filter(Boolean).join(" ") || "1 phút";
  }
  const days = Math.max(1, Math.ceil(totalMinutes / (24 * 60)));
  return `${days} ngày`;
}

function isTruthy(value: unknown) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function recurrenceIndex(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function currentPerpetualCycleStart(eventStartDate: string) {
  const current = today();
  return eventStartDate && eventStartDate > current ? eventStartDate : current;
}

function currentPerpetualCycleEnd(startDate: string) {
  return addDays(startDate, PERPETUAL_PLAN_DAYS - 1);
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

function sortEventsBySchedule<T extends { startDate: string | null; endDate: string | null; metadata?: GrazingEvent["metadata"] }>(events: T[]) {
  return [...events].sort((a, b) => {
    const aStart = dateTimeToUtcMs(a.startDate, cleanTime(a.metadata?.startTime), false) ?? Number.MAX_SAFE_INTEGER;
    const bStart = dateTimeToUtcMs(b.startDate, cleanTime(b.metadata?.startTime), false) ?? Number.MAX_SAFE_INTEGER;
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = dateTimeToUtcMs(a.endDate || a.startDate, cleanTime(a.metadata?.endTime), true) ?? Number.MAX_SAFE_INTEGER;
    const bEnd = dateTimeToUtcMs(b.endDate || b.startDate, cleanTime(b.metadata?.endTime), true) ?? Number.MAX_SAFE_INTEGER;
    return aEnd - bEnd;
  });
}

function eventsForChart(plan: GrazingPlan) {
  const compactedEvents = plan.type === "perpetual"
    ? plan.events.filter((event) => {
        if (!isTruthy(event.metadata?.repeat)) return true;
        const index = recurrenceIndex(event.metadata?.recurrenceIndex);
        return index == null || index <= 1;
      })
    : plan.events;

  if (plan.type === "perpetual") {
    const cycleStart = currentPerpetualCycleStart(plan.startDate || today());
    return sortEventsBySchedule(compactedEvents).slice(0, MAX_CHART_EVENTS_PER_PLAN).map((event) => {
      if (typeof event.metadata?.occurrenceDate === "string") return event;
      const eventDate = dateOnly(event.startDate) ?? plan.startDate ?? cycleStart;
      const planStart = plan.startDate ?? eventDate;
      const planStartMs = dateToUtcMs(planStart) ?? 0;
      const eventMs = dateToUtcMs(eventDate) ?? planStartMs;
      const offset = Math.max(0, Math.min(PERPETUAL_PLAN_DAYS - 1, Math.round((eventMs - planStartMs) / DAY_MS)));
      const startDate = addDays(cycleStart, offset);
      const durationDays = Math.max(1, Math.min(PERPETUAL_PLAN_DAYS - offset, Number(event.metadata?.durationDays) || 1));
      return {
        ...event,
        startDate,
        endDate: addDays(startDate, durationDays - 1),
        metadata: { ...event.metadata, repeat: true, durationDays, recurrenceIndex: 1 },
      };
    });
  }

  return sortEventsBySchedule(compactedEvents).slice(0, MAX_CHART_EVENTS_PER_PLAN);
}

function planTimelineStart(plan: Pick<GrazingPlan, "type" | "startDate">) {
  return plan.type === "perpetual" ? currentPerpetualCycleStart(plan.startDate || today()) : plan.startDate || today();
}

function planTimelineEnd(plan: Pick<GrazingPlan, "type" | "endDate">, startDate: string) {
  return plan.type === "perpetual" ? currentPerpetualCycleEnd(startDate) : plan.endDate || startDate;
}

function buildScheduledEvents(events: GrazingEvent[]): ScheduledEvent[] {
  const sortedEvents = sortEventsBySchedule(events).slice(0, MAX_CHART_EVENTS_PER_PLAN);
  const scheduledById = new Map<string, ScheduledEvent>();
  const scheduled: ScheduledEvent[] = [];

  sortedEvents.forEach((event, index) => {
    const dependencyId = String(event.metadata?.prerequisiteId ?? "");
    const dependencySource = dependencyId ? scheduledById.get(dependencyId) ?? null : index > 0 ? scheduled.at(-1) ?? null : null;
    const startTime = eventStartTime(event);
    const endTime = eventEndTime(event);
    const entry: ScheduledEvent = {
      event,
      sequence: eventSequence(index),
      durationLabel: durationText(event.startDate, event.endDate || event.startDate, startTime, endTime),
      startDate: dateOnly(event.startDate),
      endDate: dateOnly(event.endDate) || dateOnly(event.startDate),
      startTime,
      endTime,
      dependencySource,
      dependencyLabel: dependencySource ? `${dependencySource.sequence} - ${eventTitle(dependencySource.event)}` : "",
    };
    scheduled.push(entry);
    scheduledById.set(event.id, entry);
    const sourceId = typeof event.metadata?.sourceId === "string" ? event.metadata.sourceId : "";
    if (sourceId) scheduledById.set(sourceId, entry);
  });

  return scheduled;
}

function eventRangeMs(item: ScheduledEvent) {
  const start = dateTimeToUtcMs(item.startDate, item.startTime);
  const end = dateTimeToUtcMs(item.endDate || item.startDate, item.endTime, !item.endTime);
  return { start, end };
}

function eventRowId(planId: string, event: GrazingEvent, paddockId?: string | null) {
  return paddockId ? `${planId}-${paddockId}-${event.id}` : `${planId}-event-${event.id}`;
}

function overlapsRange(start: number | null, end: number | null, rangeStart: number, rangeEnd: number) {
  if (start == null || end == null) return false;
  return start <= rangeEnd && end >= rangeStart;
}

function chartRangeFromBounds(rawStart: number, rawEnd: number) {
  const paddedStart = rawStart - CHART_CONTEXT_DAYS * DAY_MS;
  const paddedEnd = rawEnd + CHART_CONTEXT_DAYS * DAY_MS;
  const maxSpan = MAX_CHART_DAYS * DAY_MS;
  if (paddedEnd - paddedStart <= maxSpan) {
    const startDate = dateFromMs(dateToUtcMs(dateFromMs(paddedStart)) ?? paddedStart);
    const endDate = dateFromMs(dateToUtcMs(dateFromMs(paddedEnd)) ?? paddedEnd);
    return {
      startDate,
      endDate,
      startMs: dateToUtcMs(startDate) ?? paddedStart,
      endMs: (dateToUtcMs(endDate) ?? paddedEnd) + DAY_MS - 60_000,
    };
  }

  const currentDateMs = dateToUtcMs(today()) ?? rawStart;
  let boundedStart = paddedStart;
  if (currentDateMs > rawStart && currentDateMs < rawEnd) {
    boundedStart = Math.max(paddedStart, currentDateMs - CHART_FOCUS_PAST_DAYS * DAY_MS);
  } else if (currentDateMs >= rawEnd) {
    boundedStart = Math.max(paddedStart, paddedEnd - maxSpan);
  }
  const boundedEnd = Math.min(paddedEnd, boundedStart + maxSpan);
  const startDate = dateFromMs(dateToUtcMs(dateFromMs(boundedStart)) ?? boundedStart);
  const endDate = dateFromMs(dateToUtcMs(dateFromMs(boundedEnd)) ?? boundedEnd);
  return {
    startDate,
    endDate,
    startMs: dateToUtcMs(startDate) ?? boundedStart,
    endMs: (dateToUtcMs(endDate) ?? boundedEnd) + DAY_MS - 60_000,
  };
}

function monthLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
}

function dayLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function weekdayLetter(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN", { weekday: "short" }).replace(".", "");
}

function hourLabel(value: number) {
  return new Date(value).toISOString().slice(11, 16);
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

function Icon({ name }: { name: "table" | "calendar" }) {
  switch (name) {
    case "calendar":
      return <svg viewBox="0 0 24 24"><path d="M5 5h14v15H5zM8 3v4M16 3v4M5 10h14" /></svg>;
    default:
      return <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 10h16M10 5v14" /></svg>;
  }
}

function initialScale(plans: GrazingPlan[]): TimeScale {
  const ranges = plans.flatMap((plan) => {
    const planStart = dateTimeToUtcMs(planTimelineStart(plan), null);
    const planEnd = dateTimeToUtcMs(planTimelineEnd(plan, planTimelineStart(plan)), null, true);
    const eventRanges = plan.events.flatMap((event) => [
      dateTimeToUtcMs(event.startDate, eventStartTime(event)),
      dateTimeToUtcMs(event.endDate || event.startDate, eventEndTime(event), !eventEndTime(event)),
    ]);
    return [planStart, planEnd, ...eventRanges].filter((value): value is number => value != null);
  });
  if (ranges.length === 0) return "day";
  const spanDays = (Math.max(...ranges) - Math.min(...ranges)) / DAY_MS;
  return spanDays <= 7 ? "hour" : "day";
}

export default function GrazingGanttChart({
  plans,
  title = "Sơ đồ dòng thời gian chăn thả",
  showPlanFilter = false,
}: {
  plans: GrazingPlan[];
  title?: string;
  showPlanFilter?: boolean;
}) {
  const [planTypeFilter, setPlanTypeFilter] = useState<"all" | GrazingPlanType>("all");
  const [featureFilters, setFeatureFilters] = useState<FeatureFilter[]>(["events", "groups", "paddocks"]);
  const [timeScale, setTimeScale] = useState<TimeScale>(() => initialScale(plans));
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);

  const selectedPlans = useMemo(
    () => plans.filter((plan) => planTypeFilter === "all" || plan.type === planTypeFilter).slice(0, MAX_RENDERED_PLANS),
    [planTypeFilter, plans]
  );
  const isFeatureVisible = useCallback((feature: FeatureFilter) => featureFilters.includes(feature), [featureFilters]);
  const isCollapsed = useCallback((id: string) => collapsedIds.includes(id), [collapsedIds]);
  const toggleCollapsed = (id: string) => {
    setCollapsedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };
  const toggleFeature = (feature: FeatureFilter) => {
    setFeatureFilters((current) => (current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]));
  };

  const scheduledEventsByPlan = useMemo(() => {
    return new Map(selectedPlans.map((plan) => [plan.id, buildScheduledEvents(eventsForChart(plan))]));
  }, [selectedPlans]);
  const chartRange = useMemo(() => {
    const bounds = selectedPlans
      .flatMap((plan) => {
        const startDate = planTimelineStart(plan);
        const planStart = dateTimeToUtcMs(startDate, null);
        const planEnd = dateTimeToUtcMs(planTimelineEnd(plan, startDate), null, true);
        const eventBounds = (scheduledEventsByPlan.get(plan.id) ?? []).flatMap((item) => {
          const range = eventRangeMs(item);
          return [range.start, range.end];
        });
        return [planStart, planEnd, ...eventBounds];
      })
      .filter((value): value is number => value != null);
    const start = bounds.length ? Math.min(...bounds) : dateTimeToUtcMs(today(), null) ?? Date.now();
    const end = bounds.length ? Math.max(...bounds) : start;
    return chartRangeFromBounds(start, end);
  }, [scheduledEventsByPlan, selectedPlans]);
  const chartScale = TIME_SCALE_OPTIONS.find((item) => item.value === timeScale) ?? TIME_SCALE_OPTIONS[1];
  const chartTotalDays = Math.max(chartScale.stepDays, (chartRange.endMs - chartRange.startMs) / DAY_MS);
  const chartUnits = Math.max(1, Math.ceil(chartTotalDays / chartScale.stepDays));
  const chartScaleDays = chartUnits * chartScale.stepDays;
  const chartWidth = Math.max(timeScale === "hour" ? 720 : timeScale === "day" ? 560 : timeScale === "week" ? 460 : 360, chartUnits * chartScale.slotWidth);
  const chartTotalMs = chartScaleDays * DAY_MS;
  const chartDates = useMemo(
    () => Array.from({ length: Math.ceil((chartRange.endMs - chartRange.startMs) / DAY_MS) + 1 }, (_, index) => dateFromMs(chartRange.startMs + index * DAY_MS)),
    [chartRange.endMs, chartRange.startMs]
  );
  const chartDayTicks = useMemo(() => {
    const step = timeScale === "hour" ? 1 : Math.max(chartScale.stepDays, Math.ceil(chartDates.length / chartScale.maxTickCount));
    return chartDates.filter((_, index) => index % step === 0);
  }, [chartDates, chartScale.maxTickCount, chartScale.stepDays, timeScale]);
  const chartHourTicks = useMemo(() => {
    if (timeScale !== "hour") return [];
    const ticks: number[] = [];
    const first = Math.ceil(chartRange.startMs / (6 * HOUR_MS)) * 6 * HOUR_MS;
    for (let cursor = first; cursor <= chartRange.endMs; cursor += 6 * HOUR_MS) ticks.push(cursor);
    return ticks;
  }, [chartRange.endMs, chartRange.startMs, timeScale]);
  const chartMonthBands = useMemo(() => {
    const bands: Array<{ key: string; label: string; left: number; width: number }> = [];
    let cursor = chartRange.startDate;
    while (cursor <= chartRange.endDate) {
      const date = new Date(`${cursor}T00:00:00`);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthStart = cursor;
      let monthEnd = cursor;
      while (addDays(monthEnd, 1) <= chartRange.endDate) {
        const next = new Date(`${addDays(monthEnd, 1)}T00:00:00`);
        if (`${next.getFullYear()}-${next.getMonth()}` !== monthKey) break;
        monthEnd = addDays(monthEnd, 1);
      }
      const monthStartMs = dateTimeToUtcMs(monthStart, null) ?? chartRange.startMs;
      const monthEndMs = dateTimeToUtcMs(monthEnd, null, true) ?? monthStartMs;
      const left = ((monthStartMs - chartRange.startMs) / chartTotalMs) * 100;
      const width = ((monthEndMs - monthStartMs) / chartTotalMs) * 100;
      bands.push({ key: monthKey, label: monthLabel(monthStart), left, width });
      cursor = addDays(monthEnd, 1);
    }
    return bands;
  }, [chartRange.endDate, chartRange.startDate, chartRange.startMs, chartTotalMs]);
  const chartRows = useMemo<ChartRow[]>(() => {
    return selectedPlans.flatMap((plan) => {
      const scheduledEvents = scheduledEventsByPlan.get(plan.id) ?? [];
      const scheduledEventsInWindow = scheduledEvents.filter((item) => {
        const range = eventRangeMs(item);
        return overlapsRange(range.start, range.end, chartRange.startMs, chartRange.endMs);
      });
      const eventStarts = scheduledEvents.map((item) => eventRangeMs(item).start).filter((value): value is number => value != null);
      const eventEnds = scheduledEvents.map((item) => eventRangeMs(item).end).filter((value): value is number => value != null);
      const fallbackPlanStart = planTimelineStart(plan);
      const fallbackPlanEnd = planTimelineEnd(plan, fallbackPlanStart);
      const fallbackStartMs = dateTimeToUtcMs(fallbackPlanStart, null) ?? chartRange.startMs;
      const fallbackEndMs = dateTimeToUtcMs(fallbackPlanEnd, null, true) ?? fallbackStartMs;
      const planStartMs = eventStarts.length ? Math.min(...eventStarts, fallbackStartMs) : fallbackStartMs;
      const planEndMs = eventEnds.length ? Math.max(...eventEnds, fallbackEndMs) : fallbackEndMs;
      const planStart = dateFromMs(planStartMs);
      const planEnd = dateFromMs(planEndMs);
      const planCollapsed = isCollapsed(`plan:${plan.id}`);
      const rows: ChartRow[] = [{
        id: `${plan.id}-plan`,
        name: plan.name,
        type: "plan",
        startDate: planStart,
        endDate: planEnd,
        label: `${plan.name} (${durationText(planStart, planEnd)})`,
        collapseKey: `plan:${plan.id}`,
        collapsible: true,
      }];
      if (planCollapsed) return rows;

      if (isFeatureVisible("paddocks")) {
        for (const paddock of plan.paddocks) {
          const paddockKey = `paddock:${plan.id}:${paddock.id}`;
          const paddockCollapsed = isCollapsed(paddockKey);
          const scheduledForPaddock = scheduledEventsInWindow.filter((item) => item.event.paddockId === paddock.id);
          const showPaddockSegments = scheduledForPaddock.length > 0 && (paddockCollapsed || !isFeatureVisible("events"));
          const paddockStarts = scheduledForPaddock.map((item) => eventRangeMs(item).start).filter((value): value is number => value != null);
          const paddockEnds = scheduledForPaddock.map((item) => eventRangeMs(item).end).filter((value): value is number => value != null);
          const paddockStartMs = paddockStarts.length ? Math.min(...paddockStarts) : planStartMs;
          const paddockEndMs = paddockEnds.length ? Math.max(...paddockEnds) : planEndMs;
          const paddockStart = dateFromMs(paddockStartMs);
          const paddockEnd = dateFromMs(paddockEndMs);
          rows.push({
            id: `${plan.id}-${paddock.id}`,
            name: paddock.name,
            type: "paddock",
            priority: paddock.priority,
            rating: paddock.rating,
            startDate: paddockStart,
            endDate: paddockEnd,
            label: `${paddock.name} (${durationText(paddockStart, paddockEnd)})`,
            segments: showPaddockSegments
              ? scheduledForPaddock.map((item) => ({
                  id: `${paddock.id}-${item.event.id}`,
                  label: `${item.sequence} - ${eventTitle(item.event)} (${item.durationLabel}) · ${formatDateTime(item.startDate, item.startTime)} - ${formatDateTime(item.endDate, item.endTime)}`,
                  startDate: item.startDate,
                  endDate: item.endDate,
                  startTime: item.startTime,
                  endTime: item.endTime,
                  color: eventColor(item.event.type),
                }))
              : undefined,
            suppressBar: scheduledForPaddock.length > 0 && !showPaddockSegments,
            collapseKey: paddockKey,
            collapsible: true,
          });
          if (!paddockCollapsed && isFeatureVisible("events")) {
            for (const item of scheduledForPaddock) {
              const event = item.event;
              const sourcePaddockId = item.dependencySource?.event.paddockId ?? null;
              rows.push({
                id: eventRowId(plan.id, event, paddock.id),
                name: eventTitle(event),
                type: "event",
                sequence: item.sequence,
                startDate: item.startDate,
                endDate: item.endDate,
                startTime: item.startTime,
                endTime: item.endTime,
                eventType: event.type,
                label: `${eventTitle(event)} (${item.durationLabel}) · ${formatDateTime(item.startDate, item.startTime)} - ${formatDateTime(item.endDate, item.endTime)}`,
                prerequisite: item.dependencyLabel,
                actionHint: item.dependencySource ? `F-S sau ${item.dependencySource.sequence}` : actionHint(event.note),
                dependencyStartDate: item.dependencySource?.endDate,
                dependencyStartTime: item.dependencySource?.endTime,
                dependencyEndDate: item.startDate,
                dependencyEndTime: item.startTime,
                dependencySourceRowId: item.dependencySource && sourcePaddockId ? eventRowId(plan.id, item.dependencySource.event, sourcePaddockId) : null,
              });
            }
          }
        }
      } else if (isFeatureVisible("events")) {
        for (const item of scheduledEventsInWindow) {
          const event = item.event;
          rows.push({
            id: eventRowId(plan.id, event),
            name: eventTitle(event),
            type: "event",
            sequence: item.sequence,
            startDate: item.startDate,
            endDate: item.endDate,
            startTime: item.startTime,
            endTime: item.endTime,
            eventType: event.type,
            label: `${eventTitle(event)} (${item.durationLabel}) · ${formatDateTime(item.startDate, item.startTime)} - ${formatDateTime(item.endDate, item.endTime)}`,
            prerequisite: item.dependencyLabel,
            actionHint: item.dependencySource ? `F-S sau ${item.dependencySource.sequence}` : actionHint(event.note),
            dependencyStartDate: item.dependencySource?.endDate,
            dependencyStartTime: item.dependencySource?.endTime,
            dependencyEndDate: item.startDate,
            dependencyEndTime: item.startTime,
            dependencySourceRowId: item.dependencySource ? eventRowId(plan.id, item.dependencySource.event) : null,
          });
        }
      }

      if (isFeatureVisible("groups")) {
        for (const group of plan.groups) {
          rows.push({
            id: `${plan.id}-group-${group.id}`,
            name: group.name,
            type: "group",
            startDate: planStart,
            endDate: planEnd,
            label: `${group.name} (${durationText(planStart, planEnd)})`,
          });
        }
      }
      return rows;
    });
  }, [chartRange.endMs, chartRange.startMs, isCollapsed, isFeatureVisible, scheduledEventsByPlan, selectedPlans]);

  const percentForMs = (value: number) => ((value - chartRange.startMs) / chartTotalMs) * 100;
  const rowIndexById = useMemo(() => new Map(chartRows.map((row, index) => [row.id, index])), [chartRows]);

  return (
    <section className={styles.chartPanel}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Biểu đồ</p>
          <h2>{title}</h2>
        </div>
        <span className={styles.panelBadge}>Theo {chartScale.label.toLowerCase()}</span>
      </div>
      <div className={styles.ganttShell}>
        <div className={styles.ganttToolbar}>
          {showPlanFilter && (
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
          )}
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
            <summary><Icon name="calendar" /> {chartScale.label}</summary>
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
            "--chart-days": chartTotalDays,
            "--time-units": chartUnits,
            "--slot-width": `${chartScale.slotWidth}px`,
            "--timeline-width": `${chartWidth}px`,
          } as CSSProperties}
        >
          <div className={styles.ganttLeftHead}>
            <strong>Tên</strong>
            <strong>Ưu tiên</strong>
            <strong>Xếp hạng</strong>
          </div>
          <div className={styles.ganttScale}>
            <div className={styles.ganttMonthRow}>
              {chartMonthBands.map((band) => (
                <span key={band.key} style={{ left: `${band.left}%`, width: `${band.width}%` } as CSSProperties}>
                  {band.label}
                </span>
              ))}
            </div>
            <div className={styles.ganttDayRow}>
              {chartDayTicks.map((tick) => {
                const tickMs = dateTimeToUtcMs(tick, null) ?? chartRange.startMs;
                return (
                  <span key={tick} style={{ left: `${percentForMs(tickMs)}%` } as CSSProperties}>
                    {timeScale === "hour" ? dayLabel(tick) : timeScale === "day" ? new Date(`${tick}T00:00:00`).getDate() : dayLabel(tick)}
                  </span>
                );
              })}
            </div>
            <div className={styles.ganttWeekdayRow}>
              {timeScale === "hour"
                ? chartHourTicks.map((tick) => (
                    <span key={tick} style={{ left: `${percentForMs(tick)}%` } as CSSProperties}>
                      {hourLabel(tick)}
                    </span>
                  ))
                : chartDayTicks.map((tick) => {
                    const tickMs = dateTimeToUtcMs(tick, null) ?? chartRange.startMs;
                    return (
                      <span key={tick} style={{ left: `${percentForMs(tickMs)}%` } as CSSProperties}>
                        {weekdayLetter(tick)}
                      </span>
                    );
                  })}
            </div>
          </div>
          {chartRows.map((row) => {
            const makeBarStyle = (startDate: string | null | undefined, endDate: string | null | undefined, barColor: string, startTime?: string | null, endTime?: string | null): CSSProperties => {
              const rawStart = dateTimeToUtcMs(startDate || chartRange.startDate, startTime);
              const rawEnd = dateTimeToUtcMs(endDate || startDate || chartRange.startDate, endTime, !endTime);
              const startMs = maxMs(rawStart ?? chartRange.startMs, chartRange.startMs);
              const endMs = minMs(Math.max(rawEnd ?? startMs, startMs + HOUR_MS), chartRange.endMs);
              return {
                left: `${Math.min(99, Math.max(0, percentForMs(startMs)))}%`,
                width: `${Math.max(0.6, Math.min(100, ((endMs - startMs) / chartTotalMs) * 100))}%`,
                "--bar-color": barColor,
              } as CSSProperties;
            };
            const dependencyStart = dateTimeToUtcMs(row.dependencyStartDate, row.dependencyStartTime, !row.dependencyStartTime);
            const dependencyEnd = dateTimeToUtcMs(row.dependencyEndDate, row.dependencyEndTime);
            const dependencyLeftValue = dependencyStart == null ? 0 : Math.min(99, Math.max(0, percentForMs(dependencyStart)));
            const dependencyEndValue = dependencyEnd == null ? 0 : Math.min(99, Math.max(0, percentForMs(dependencyEnd)));
            const dependencySourceIndex = row.dependencySourceRowId ? rowIndexById.get(row.dependencySourceRowId) : undefined;
            const currentIndex = rowIndexById.get(row.id);
            const dependencyRowOffset = dependencySourceIndex != null && currentIndex != null ? dependencySourceIndex - currentIndex : 0;
            const dependencySvgTop = Math.min(0, dependencyRowOffset * GANTT_ROW_HEIGHT);
            const dependencySvgHeight = Math.abs(dependencyRowOffset * GANTT_ROW_HEIGHT) + GANTT_ROW_HEIGHT;
            const dependencySourceY = dependencyRowOffset < 0 ? GANTT_ROW_MIDPOINT : GANTT_ROW_MIDPOINT + dependencyRowOffset * GANTT_ROW_HEIGHT - dependencySvgTop;
            const dependencyTargetY = GANTT_ROW_MIDPOINT - dependencySvgTop;
            const dependencyElbowX = dependencyEndValue > dependencyLeftValue
              ? Math.max(dependencyLeftValue + 3, dependencyEndValue - 4)
              : Math.max(1.5, dependencyEndValue - 4);
            const dependencyPath = `M ${dependencyLeftValue} ${dependencySourceY} H ${dependencyElbowX} V ${dependencyTargetY} H ${dependencyEndValue}`;
            const color = row.eventType ? eventColor(row.eventType) : row.type === "plan" ? "#d99a00" : row.type === "group" ? "#3f3f46" : "#67a832";
            return (
              <div key={row.id} className={styles.ganttRow}>
                <div className={`${styles.ganttLabel} ${styles[`ganttLabel${row.type[0].toUpperCase()}${row.type.slice(1)}`]}`}>
                  <span className={styles.ganttLabelTitle} title={[row.sequence, row.name].filter(Boolean).join(" - ")}>
                    {row.collapsible && row.collapseKey && (
                      <button type="button" className={styles.collapseButton} onClick={() => toggleCollapsed(row.collapseKey!)}>
                        {isCollapsed(row.collapseKey) ? "▸" : "▾"}
                      </button>
                    )}
                    {row.sequence && <span className={styles.sequenceBadge}>{row.sequence}</span>}
                    <strong>{row.name}</strong>
                  </span>
                  {row.type === "event" && (
                    <small className={row.prerequisite ? styles.ganttDependency : styles.ganttReady} title={row.prerequisite ? `Sau: ${row.prerequisite}` : "Có thể làm ngay"}>
                      {row.prerequisite ? `Sau: ${row.prerequisite}` : "Có thể làm ngay"}
                    </small>
                  )}
                </div>
                <div className={styles.ganttMetric}>{row.priority ?? "-"}</div>
                <div className={styles.ganttMetric}>{row.rating ?? "-"}</div>
                <div className={styles.ganttCanvas}>
                  {row.type === "event" && dependencyStart != null && dependencyEnd != null && (
                    <svg
                      className={styles.ganttDependencyArrow}
                      style={{
                        top: `${dependencySvgTop}px`,
                        height: `${dependencySvgHeight}px`,
                        "--dependency-source-x": `${dependencyLeftValue}%`,
                        "--dependency-target-x": `${dependencyEndValue}%`,
                        "--dependency-source-y": `${dependencySourceY}px`,
                        "--dependency-target-y": `${dependencyTargetY}px`,
                      } as CSSProperties}
                      viewBox={`0 0 100 ${dependencySvgHeight}`}
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path
                        d={dependencyPath}
                      />
                      <circle cx={dependencyLeftValue} cy={dependencySourceY} r="1.15" />
                      <polygon points={`${dependencyEndValue},${dependencyTargetY} ${Math.max(0, dependencyEndValue - 2.15)},${dependencyTargetY - 4.2} ${Math.max(0, dependencyEndValue - 2.15)},${dependencyTargetY + 4.2}`} />
                    </svg>
                  )}
                  {row.segments?.map((segment) => {
                    const segmentShortLabel = segment.startDate === segment.endDate ? segment.label.split(" · ")[0] : segment.label;
                    return (
                      <span
                        key={segment.id}
                        className={`${styles.ganttBar} ${styles.ganttBarPaddockSegment}`}
                        style={makeBarStyle(segment.startDate, segment.endDate, segment.color, segment.startTime, segment.endTime)}
                        title={segment.label}
                      >
                        <span className={styles.ganttBarText}>{segmentShortLabel}</span>
                      </span>
                    );
                  })}
                  {!row.suppressBar && !row.segments?.length && row.startDate && (
                    <span
                      className={`${styles.ganttBar} ${styles[`ganttBar${row.type[0].toUpperCase()}${row.type.slice(1)}`]}`}
                      style={makeBarStyle(row.startDate, row.endDate, color, row.startTime, row.endTime)}
                      title={row.actionHint ? `${row.label} - ${row.actionHint}` : row.label}
                    >
                      <span className={styles.ganttBarText}>{row.label}</span>
                      {row.type === "event" && row.actionHint && <em>{row.actionHint}</em>}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
