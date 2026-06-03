export const BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function todayInBusinessTimeZone(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : now.toISOString().slice(0, 10);
}

export function dateOnlyToUtcMs(value: string | null) {
  const match = value ? DATE_ONLY_PATTERN.exec(value) : null;
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatBusinessDate(value: string | null) {
  if (!value) return "-";
  const dateOnly = DATE_ONLY_PATTERN.exec(value);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date);
}
