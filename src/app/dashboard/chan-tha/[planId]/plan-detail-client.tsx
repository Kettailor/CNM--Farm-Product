"use client";

import { useState } from "react";
import type { GrazingEvent, GrazingPlan, GrazingStatus } from "@/lib/grazing-types";
import { GRAZING_EVENT_TYPE_LABELS, GRAZING_STATUS_LABELS, getGrazingPlanTypeOption } from "@/lib/grazing-types";
import GrazingGanttChart from "../grazing-gantt-chart";
import styles from "./plan-detail.module.css";

const PERPETUAL_PLAN_DAYS = 7;

type DetailStatus = GrazingStatus | "expired";
type CompletedOccurrence = { completed?: unknown; completedAt?: unknown };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateToUtcTime(value: string) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const [year, month, day] = parts;
  return Date.UTC(year, month - 1, day);
}

function addDays(value: string, days: number) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return value;
  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function daysBetween(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null;
  const start = dateToUtcTime(startDate);
  const end = dateToUtcTime(endDate);
  if (start == null || end == null) return null;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
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

function eventTime(event: GrazingEvent, key: "startTime" | "endTime") {
  const value = event.metadata?.[key];
  return cleanTime(value);
}

function formatEventDateTime(event: GrazingEvent, key: "start" | "end") {
  const date = key === "start" ? event.startDate : event.endDate || event.startDate;
  const time = eventTime(event, key === "start" ? "startTime" : "endTime");
  const formattedDate = formatDate(date);
  return time ? `${time} ${formattedDate}` : formattedDate;
}

function eventTitle(event: GrazingEvent) {
  return event.type === "other" ? event.title || GRAZING_EVENT_TYPE_LABELS.other : GRAZING_EVENT_TYPE_LABELS[event.type];
}

function eventCompleted(event: GrazingEvent) {
  const occurrenceDate = typeof event.metadata?.occurrenceDate === "string" ? event.metadata.occurrenceDate : null;
  const occurrences = event.metadata?.completedOccurrences;
  if (occurrenceDate && occurrences && typeof occurrences === "object" && !Array.isArray(occurrences)) {
    const occurrence = (occurrences as Record<string, CompletedOccurrence>)[occurrenceDate];
    return occurrence?.completed === true || occurrence?.completed === "true";
  }
  return event.status === "completed" || event.metadata?.completed === true || event.metadata?.completed === "true";
}

function displayStatus(status: GrazingStatus, startDate: string | null, endDate: string | null): DetailStatus {
  if (status === "completed" || status === "paused" || status === "da_huy") return status;
  const current = today();
  if (endDate && endDate < current) return "expired";
  if (startDate && startDate > current) return "future";
  return "active";
}

function statusLabel(status: DetailStatus) {
  if (status === "expired") return "Quá hạn";
  return GRAZING_STATUS_LABELS[status];
}

function planEndForDisplay(plan: GrazingPlan) {
  if (plan.endDate) return plan.endDate;
  if (plan.type === "perpetual" && plan.startDate) return addDays(plan.startDate, PERPETUAL_PLAN_DAYS - 1);
  const eventEnds = plan.events.map((event) => event.endDate || event.startDate).filter(Boolean) as string[];
  return eventEnds.sort().at(-1) ?? plan.startDate;
}

function planDuration(plan: GrazingPlan) {
  if (plan.type === "perpetual") return PERPETUAL_PLAN_DAYS;
  return daysBetween(plan.startDate, planEndForDisplay(plan));
}

function isRepeatEvent(event: GrazingEvent) {
  return event.metadata?.repeat === true || event.metadata?.repeat === "true" || event.metadata?.repeat === "1";
}

function dateOffset(startDate: string | null, value: string | null) {
  if (!startDate || !value) return 0;
  const start = dateToUtcTime(startDate);
  const date = dateToUtcTime(value);
  if (start == null || date == null) return 0;
  return Math.max(0, Math.round((date - start) / 86400000));
}

function occurrenceEvents(plan: GrazingPlan) {
  if (plan.type !== "perpetual") return plan.events;
  const cycleStart = plan.startDate && plan.startDate > today() ? plan.startDate : today();
  const planStart = plan.startDate ?? cycleStart;
  return plan.events.map((event) => {
    if (!isRepeatEvent(event)) return event;
    const offset = Math.min(PERPETUAL_PLAN_DAYS - 1, dateOffset(planStart, event.startDate ?? planStart));
    const startDate = addDays(cycleStart, offset);
    const duration = Math.max(1, Math.min(PERPETUAL_PLAN_DAYS - offset, Number(event.metadata?.durationDays) || daysBetween(event.startDate, event.endDate || event.startDate) || 1));
    return {
      ...event,
      startDate,
      endDate: addDays(startDate, duration - 1),
      status: event.status === "completed" ? "active" : event.status,
      metadata: { ...event.metadata, occurrenceDate: startDate, durationDays: duration },
    };
  });
}

function prerequisiteLabel(events: GrazingEvent[], event: GrazingEvent) {
  const prerequisiteId = String(event.metadata?.prerequisiteId ?? "");
  if (!prerequisiteId) return "";
  const index = events.findIndex((item) => item.id === prerequisiteId || item.metadata?.sourceId === prerequisiteId);
  const source = index >= 0 ? events[index] : null;
  return source ? `CV${String(index + 1).padStart(2, "0")} - ${eventTitle(source)}` : event.note ?? "";
}

function prerequisiteEvent(events: GrazingEvent[], event: GrazingEvent) {
  const prerequisiteId = String(event.metadata?.prerequisiteId ?? "");
  if (!prerequisiteId) return null;
  return events.find((item) => item.id === prerequisiteId || item.metadata?.sourceId === prerequisiteId) ?? null;
}

export default function GrazingPlanDetailClient({ plan: initialPlan, canWrite }: { plan: GrazingPlan; canWrite: boolean }) {
  const [plan, setPlan] = useState(initialPlan);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const typeOption = getGrazingPlanTypeOption(plan.type);
  const endDate = planEndForDisplay(plan);
  const duration = planDuration(plan);
  const displayedEvents = occurrenceEvents(plan);
  const displayedPlan = plan.type === "perpetual" ? { ...plan, events: displayedEvents } : plan;
  const completedEvents = displayedEvents.filter(eventCompleted).length;

  const toggleEvent = async (event: GrazingEvent, completed: boolean) => {
    if (!canWrite || savingEventId) return;
    setSavingEventId(event.id);
    setMessage("");
    try {
      const response = await fetch(`/api/du-lieu/chan-tha/${plan.id}/su-kien/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed, occurrenceDate: event.startDate }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.plan) {
        setMessage(result.message ?? "Không thể cập nhật nhiệm vụ.");
        return;
      }
      setPlan(result.plan);
      setMessage(result.message ?? "Đã cập nhật nhiệm vụ.");
    } catch {
      setMessage("Không thể kết nối máy chủ để cập nhật nhiệm vụ.");
    } finally {
      setSavingEventId(null);
    }
  };

  const summaryEvents = Array.from(new Set(plan.events.map((event) => GRAZING_EVENT_TYPE_LABELS[event.type]))).join(", ") || "-";
  const paddockNames = plan.paddocks.map((paddock) => paddock.name).join(", ") || "-";
  const groupNames = plan.groups.map((group) => `${group.name} (${group.headCount.toLocaleString("vi-VN")} con)`).join(", ") || "-";

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.titleBlock}>
          <span className={styles.titleIcon}>♧</span>
          <div>
            <p className={styles.eyebrow}>Chi tiết kế hoạch chăn thả</p>
            <h1>{plan.name}</h1>
          </div>
        </div>
        <a className={styles.backButton} href="/dashboard/chan-tha">Quay lại</a>
      </section>

      {message && <p className={styles.message}>{message}</p>}

      <section className={styles.summaryCard}>
        <div className={styles.summaryColumn}>
          <h2>Thông tin</h2>
          <dl>
            <div><dt>Tên</dt><dd>{plan.name}</dd></div>
            <div><dt>Loại kế hoạch</dt><dd>{typeOption.label}</dd></div>
            <div><dt>Trạng thái</dt><dd><span className={styles.statusPill} data-status={displayStatus(plan.status, plan.startDate, endDate)}>{statusLabel(displayStatus(plan.status, plan.startDate, endDate))}</span></dd></div>
            <div><dt>Bắt đầu</dt><dd>{formatDate(plan.startDate)}</dd></div>
            <div><dt>Kết thúc</dt><dd>{plan.type === "perpetual" ? `Vĩnh viễn (${PERPETUAL_PLAN_DAYS} ngày/lần)` : formatDate(endDate)}</dd></div>
            <div><dt>Thời lượng</dt><dd>{duration ? `${duration} ngày` : "-"}</dd></div>
            <div><dt>Người phụ trách</dt><dd>{plan.manager || "-"}</dd></div>
            <div><dt>Mục tiêu</dt><dd>{plan.note || "-"}</dd></div>
          </dl>
        </div>
        <div className={styles.summaryColumn}>
          <h2>Dữ liệu</h2>
          <dl>
            <div><dt>Công việc</dt><dd>{completedEvents}/{displayedEvents.length} hoàn tất</dd></div>
            <div><dt>Loại công việc</dt><dd>{summaryEvents}</dd></div>
            <div><dt>Ô chăn thả</dt><dd>{paddockNames}</dd></div>
            <div><dt>Nhóm vật nuôi</dt><dd>{groupNames}</dd></div>
          </dl>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <p className={styles.eyebrow}>{typeOption.shortLabel}</p>
            <h2>Bảng nhiệm vụ</h2>
          </div>
          <span className={styles.progressBadge}>{completedEvents}/{displayedEvents.length} đã xong</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.detailTable}>
            <thead>
              <tr>
                <th>Đã xong</th>
                <th>Tên</th>
                <th>Trạng thái</th>
                <th>Loại</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Thời lượng</th>
                <th>Quan hệ</th>
                <th>Việc trước</th>
                <th>Liên quan</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.planRow}>
                <td>-</td>
                <td><strong>{plan.name}</strong></td>
                <td><span className={styles.statusPill} data-status={displayStatus(plan.status, plan.startDate, endDate)}>{statusLabel(displayStatus(plan.status, plan.startDate, endDate))}</span></td>
                <td>Kế hoạch</td>
                <td>{formatDate(plan.startDate)}</td>
                <td>{plan.type === "perpetual" ? "Vĩnh viễn" : formatDate(endDate)}</td>
                <td>{duration ?? "-"}</td>
                <td>-</td>
                <td>-</td>
                <td>{plan.manager || "-"}</td>
              </tr>
              {plan.paddocks.map((paddock) => (
                <tr key={`paddock-${paddock.id}`}>
                  <td>-</td>
                  <td>{paddock.name}</td>
                  <td>-</td>
                  <td>Ô chăn thả</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>Ưu tiên {paddock.priority}, xếp hạng {paddock.rating}</td>
                </tr>
              ))}
              {displayedEvents.map((event, index) => {
                const done = eventCompleted(event);
                const status = done ? "completed" : displayStatus(event.status, event.startDate, event.endDate);
                const dependency = prerequisiteLabel(displayedEvents, event);
                const dependencySource = prerequisiteEvent(displayedEvents, event);
                const dependencyDone = dependencySource ? eventCompleted(dependencySource) : true;
                return (
                  <tr key={event.id} className={done ? styles.doneRow : ""}>
                    <td>
                      <label className={styles.completeBox}>
                        <input
                          type="checkbox"
                          checked={done}
                          disabled={!canWrite || savingEventId === event.id || (!done && !dependencyDone)}
                          title={!done && !dependencyDone ? "Cần hoàn thành công việc trước trong quan hệ F-S" : undefined}
                          onChange={(changeEvent) => toggleEvent(event, changeEvent.target.checked)}
                        />
                        <span>{done ? "Xong" : "Chưa"}</span>
                      </label>
                    </td>
                    <td><strong>CV{String(index + 1).padStart(2, "0")}</strong> {eventTitle(event)}</td>
                    <td><span className={styles.statusPill} data-status={status}>{statusLabel(status)}</span></td>
                    <td>Công việc</td>
                    <td>{formatEventDateTime(event, "start")}</td>
                    <td>{formatEventDateTime(event, "end")}</td>
                    <td>{daysBetween(event.startDate, event.endDate || event.startDate) ?? "-"}</td>
                    <td>{dependency ? <span className={styles.fsPill}>F-S</span> : "-"}</td>
                    <td>{dependency || "Có thể làm ngay"}</td>
                    <td>{[event.paddockName, event.groupName].filter(Boolean).join(" - ") || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <GrazingGanttChart plans={[displayedPlan]} title="Sơ đồ dòng thời gian chăn thả" />
    </div>
  );
}
