"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DuLieuThoiTiet } from "@/lib/thoi-tiet";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./page.module.css";

type Props = {
  farmName: string;
  locationName: string | null;
  latitude: number;
  longitude: number;
  initialWeather: DuLieuThoiTiet | null;
};

type WeatherApiPayload = {
  du_lieu?: DuLieuThoiTiet;
  message?: string;
};

type WeatherChartPoint = {
  index: number;
  isoTime: string;
  time: string;
  tooltipTime: string;
  rangeTime: string;
  temperature: number | null;
  rain: number | null;
  chance: number | null;
  humidity: number | null;
  pressure: number | null;
  wind: number | null;
  gust: number | null;
  uv: number | null;
  cloud: number | null;
  dewPoint: number | null;
};

type ChartMetricKey = keyof Pick<
  WeatherChartPoint,
  "temperature" | "rain" | "chance" | "humidity" | "pressure" | "wind" | "gust" | "uv" | "cloud" | "dewPoint"
>;

type TooltipMetric = {
  key: ChartMetricKey;
  label: string;
  unit?: string;
  color: string;
  integer?: boolean;
};

type TooltipPayload = {
  payload?: WeatherChartPoint;
};

type WeatherTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  metrics: readonly TooltipMetric[];
};

type ZoomRange = {
  start: number;
  end: number;
};

type WeatherChartId = "temperature" | "rain" | "pressureHumidity" | "wind" | "uv";

type ChartZoomRanges = Partial<Record<WeatherChartId, ZoomRange>>;

const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";
const MIN_VISIBLE_POINTS = 6;

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const integerFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const weekDayFormat = new Intl.DateTimeFormat("vi-VN", { weekday: "short", timeZone: "UTC" });
const instantDateTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const rainMetrics: readonly TooltipMetric[] = [
  { key: "rain", label: "Lượng mưa", unit: "mm", color: "#86bfe0" },
  { key: "chance", label: "Khả năng mưa", unit: "%", color: "#cde6f4", integer: true },
];

const pressureHumidityMetrics: readonly TooltipMetric[] = [
  { key: "pressure", label: "Áp suất", unit: "hPa", color: "#9be0d3" },
  { key: "humidity", label: "Độ ẩm", unit: "%", color: "#b6d97a", integer: true },
];

const windMetrics: readonly TooltipMetric[] = [
  { key: "wind", label: "Tốc độ gió", unit: "km/h", color: "#8aa7b8" },
  { key: "gust", label: "Gió giật", unit: "km/h", color: "#c6d2db" },
];

const uvMetrics: readonly TooltipMetric[] = [
  { key: "uv", label: "UVI", color: "#4f9f73" },
  { key: "cloud", label: "Mây che phủ", unit: "%", color: "#9fb8c8", integer: true },
];

const temperatureMetrics: readonly TooltipMetric[] = [
  { key: "temperature", label: "Nhiệt độ", unit: "°C", color: "#ff8a1f" },
  { key: "dewPoint", label: "Điểm sương", unit: "°C", color: "#8fc5e4" },
];

const uvBands = [
  { from: 0, to: 3, label: "Thấp", color: "#cdf5d0" },
  { from: 3, to: 6, label: "Trung bình", color: "#fff4b8" },
  { from: 6, to: 8, label: "Cao", color: "#ffe2ad" },
  { from: 8, to: 11, label: "Rất cao", color: "#ffd0c9" },
  { from: 11, to: 15, label: "Cực cao", color: "#e8cdf5" },
] as const;

function fmt(value: number | null | undefined, fallback = "--") {
  return typeof value === "number" && Number.isFinite(value) ? numberFormat.format(value) : fallback;
}

function fmtInt(value: number | null | undefined, fallback = "--") {
  return typeof value === "number" && Number.isFinite(value) ? integerFormat.format(value) : fallback;
}

function localDateParts(value: string) {
  const [datePart, timePart = ""] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day, time: timePart.slice(0, 5) };
}

function formatHour(value: string) {
  return localDateParts(value)?.time || "--:--";
}

function formatDateLabel(value: string) {
  const parts = localDateParts(value);
  if (!parts) return "--";
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}`;
}

function formatWeatherLocalDateTime(value: string | null | undefined) {
  if (!value) return "--";
  const parts = localDateParts(value);
  if (!parts) return "--";
  const weekday = weekDayFormat.format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
  return `${parts.time} ${weekday}, ${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}`;
}

function formatTooltipDateTime(value: string) {
  const parts = localDateParts(value);
  if (!parts) return value;
  const weekday = weekDayFormat.format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
  return `${weekday} ${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")} ${parts.time}`;
}

function formatRangeDateTime(value: string) {
  const parts = localDateParts(value);
  if (!parts) return "--";
  return `${parts.time} ${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}`;
}

function formatAxisTick(value: string, visibleCount: number) {
  const parts = localDateParts(value);
  if (!parts) return value;
  if (visibleCount <= 24) return parts.time;
  if (visibleCount <= 72) return parts.time === "00:00" ? formatDateLabel(value) : parts.time;
  return parts.time === "00:00" ? formatDateLabel(value) : `${parts.time.slice(0, 2)}h`;
}

function tickGapFor(visibleCount: number) {
  if (visibleCount > 120) return 50;
  if (visibleCount > 72) return 40;
  if (visibleCount > 36) return 30;
  return 22;
}

function formatInstantDateTime(value: string | null | undefined) {
  if (!value) return "--";
  return instantDateTimeFormat.format(new Date(value));
}

function formatDay(value: string) {
  const parts = localDateParts(value);
  if (!parts) return "--";
  return weekDayFormat.format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

function huongGio(deg: number | null | undefined) {
  if (typeof deg !== "number" || !Number.isFinite(deg)) return "--";
  const labels = ["B", "ĐB", "Đ", "ĐN", "N", "TN", "T", "TB"];
  return labels[Math.round(deg / 45) % 8];
}

function uvLabel(value: number | null | undefined) {
  if (typeof value !== "number") return "Chưa có";
  if (value < 3) return "Thấp";
  if (value < 6) return "Trung bình";
  if (value < 8) return "Cao";
  if (value < 11) return "Rất cao";
  return "Cực cao";
}

function formatMetricValue(metric: TooltipMetric, value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  const formatted = metric.integer ? fmtInt(value) : fmt(value);
  return metric.unit ? `${formatted} ${metric.unit}` : formatted;
}

function findForecastStartIndex(items: DuLieuThoiTiet["theo_gio"], currentTime: string | null | undefined) {
  if (!items.length || !currentTime) return 0;
  const currentHour = currentTime.slice(0, 13);
  const index = items.findIndex((item) => item.thoi_gian.slice(0, 13) >= currentHour);
  return index >= 0 ? index : 0;
}

function makeRange(total: number, requestedCount: number, requestedStart = 0): ZoomRange {
  if (total <= 0) return { start: 0, end: -1 };
  const count = Math.min(total, Math.max(1, Math.round(requestedCount)));
  const start = Math.max(0, Math.min(total - count, Math.round(requestedStart)));
  return { start, end: start + count - 1 };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function numericValues(points: readonly WeatherChartPoint[], key: ChartMetricKey) {
  return points
    .map((point) => point[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function niceUpperBound(values: readonly number[], fallback = 1) {
  const max = Math.max(0, ...values);
  if (!Number.isFinite(max) || max <= 0) return fallback;
  if (max <= 0.5) return 0.5;
  if (max <= 1) return 1;
  if (max <= 2) return 2;
  if (max <= 5) return Math.ceil(max);
  return Math.ceil(max / 5) * 5;
}

function paddedDomain(values: readonly number[], fallback: [number, number]): [number, number] {
  if (!values.length) return fallback;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback;
  if (min === max) return [Number((min - 1).toFixed(1)), Number((max + 1).toFixed(1))];
  const pad = Math.max(0.2, (max - min) * 0.18);
  return [Number((min - pad).toFixed(1)), Number((max + pad).toFixed(1))];
}

function WeatherGlyph({ code }: { code: number | null | undefined }) {
  const rainy = code !== null && code !== undefined && [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
  const cloudy = code !== null && code !== undefined && [2, 3, 45, 48].includes(code);

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={styles.weatherGlyph}>
      <circle cx="23" cy="22" r="10" className={styles.sunShape} />
      <path d="M21 41h25a10 10 0 0 0 0-20 15 15 0 0 0-27-5 11 11 0 0 0 2 25Z" className={cloudy || rainy ? styles.cloudShape : styles.cloudShapeMuted} />
      {rainy && (
        <g className={styles.rainShape}>
          <path d="M24 47v7" />
          <path d="M35 47v7" />
          <path d="M46 47v7" />
        </g>
      )}
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18 11a6.5 6.5 0 0 0-11-3.5L4 10" />
      <path d="M6 13a6.5 6.5 0 0 0 11 3.5l3-2.5" />
    </svg>
  );
}

function ChartLegend({ metrics }: { metrics: readonly TooltipMetric[] }) {
  return (
    <div className={styles.chartLegend}>
      {metrics.map((metric) => (
        <span key={metric.key}>
          <i style={{ background: metric.color }} />
          {metric.label}{metric.unit ? ` (${metric.unit})` : ""}
        </span>
      ))}
    </div>
  );
}

function ChartRangeBadge({ points, range, total }: { points: readonly WeatherChartPoint[]; range: ZoomRange; total: number }) {
  const visibleCount = range.end >= range.start ? range.end - range.start + 1 : 0;
  const label = visibleCount
    ? `${points[range.start]?.rangeTime ?? "--"} - ${points[range.end]?.rangeTime ?? "--"}`
    : "--";

  return <span className={styles.chartRange}>{label} · {visibleCount}/{total} giờ</span>;
}

function ChartInteractionFrame({
  chartId,
  children,
  className = "",
  onWheelZoom,
  onReset,
}: {
  chartId: WeatherChartId;
  children: ReactNode;
  className?: string;
  onWheelZoom: (chartId: WeatherChartId, deltaY: number, focusRatio: number) => void;
  onReset: (chartId: WeatherChartId) => void;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const rect = frame.getBoundingClientRect();
      const focusRatio = rect.width > 0 ? clamp((event.clientX - rect.left) / rect.width, 0, 1) : 0.5;
      onWheelZoom(chartId, event.deltaY, focusRatio);
    };

    frame.addEventListener("wheel", handleWheel, { passive: false });
    return () => frame.removeEventListener("wheel", handleWheel);
  }, [chartId, onWheelZoom]);

  return (
    <div ref={frameRef} className={`${styles.chartInteractive} ${className}`} onDoubleClick={() => onReset(chartId)}>
      {children}
    </div>
  );
}

function WeatherTooltip({ active, payload, metrics }: WeatherTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className={styles.chartTooltip}>
      <div className={styles.tooltipTitle}>{point.tooltipTime}</div>
      <div className={styles.tooltipGrid}>
        {metrics.map((metric) => (
          <div key={metric.key} className={styles.tooltipMetric}>
            <span><i style={{ background: metric.color }} />{metric.label}</span>
            <strong>{formatMetricValue(metric, point[metric.key])}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeatherDashboardClient({ farmName, locationName, latitude, longitude, initialWeather }: Props) {
  const [weather, setWeather] = useState(initialWeather);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialWeather ? null : "Chưa tải được dữ liệu thời tiết.");
  const [zoomRanges, setZoomRanges] = useState<ChartZoomRanges>({});

  const loadWeather = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        vi_do: String(latitude),
        kinh_do: String(longitude),
      });
      if (force) params.set("lam_moi", "1");

      const response = await fetch(`/api/thoi-tiet?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as WeatherApiPayload;
      if (!response.ok || !payload.du_lieu) throw new Error(payload.message || `HTTP ${response.status}`);
      setWeather(payload.du_lieu);
      setZoomRanges({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lấy được dữ liệu thời tiết.");
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (!initialWeather) void loadWeather(false);
  }, [initialWeather, loadWeather]);

  const daily = weather?.du_bao_ngay ?? [];
  const current = weather?.hien_tai;

  const hourly = useMemo(() => {
    const source = weather?.theo_gio ?? [];
    const startIndex = findForecastStartIndex(source, current?.thoi_gian);
    return source.slice(startIndex).map((item, index) => ({
      index,
      isoTime: item.thoi_gian,
      time: formatHour(item.thoi_gian),
      tooltipTime: formatTooltipDateTime(item.thoi_gian),
      rangeTime: formatRangeDateTime(item.thoi_gian),
      temperature: item.nhiet_do_c,
      rain: item.luong_mua_mm,
      chance: item.xac_suat_mua_pct,
      humidity: item.do_am_pct,
      pressure: item.ap_suat_hpa,
      wind: item.gio_km_h,
      gust: item.gio_giat_km_h,
      uv: item.uv,
      cloud: item.may_pct,
      dewPoint: item.diem_suong_c,
    }));
  }, [current?.thoi_gian, weather]);

  const totalPoints = hourly.length;
  const defaultRange = useMemo(() => makeRange(totalPoints, totalPoints, 0), [totalPoints]);
  const chartRanges = useMemo<Record<WeatherChartId, ZoomRange>>(() => ({
    temperature: zoomRanges.temperature ? makeRange(totalPoints, zoomRanges.temperature.end - zoomRanges.temperature.start + 1, zoomRanges.temperature.start) : defaultRange,
    rain: zoomRanges.rain ? makeRange(totalPoints, zoomRanges.rain.end - zoomRanges.rain.start + 1, zoomRanges.rain.start) : defaultRange,
    pressureHumidity: zoomRanges.pressureHumidity ? makeRange(totalPoints, zoomRanges.pressureHumidity.end - zoomRanges.pressureHumidity.start + 1, zoomRanges.pressureHumidity.start) : defaultRange,
    wind: zoomRanges.wind ? makeRange(totalPoints, zoomRanges.wind.end - zoomRanges.wind.start + 1, zoomRanges.wind.start) : defaultRange,
    uv: zoomRanges.uv ? makeRange(totalPoints, zoomRanges.uv.end - zoomRanges.uv.start + 1, zoomRanges.uv.start) : defaultRange,
  }), [defaultRange, totalPoints, zoomRanges]);

  const temperatureHourly = useMemo(() => hourly.slice(chartRanges.temperature.start, chartRanges.temperature.end + 1), [chartRanges.temperature, hourly]);
  const rainHourly = useMemo(() => hourly.slice(chartRanges.rain.start, chartRanges.rain.end + 1), [chartRanges.rain, hourly]);
  const pressureHumidityHourly = useMemo(() => hourly.slice(chartRanges.pressureHumidity.start, chartRanges.pressureHumidity.end + 1), [chartRanges.pressureHumidity, hourly]);
  const windHourly = useMemo(() => hourly.slice(chartRanges.wind.start, chartRanges.wind.end + 1), [chartRanges.wind, hourly]);
  const uvHourly = useMemo(() => hourly.slice(chartRanges.uv.start, chartRanges.uv.end + 1), [chartRanges.uv, hourly]);

  const temperatureCount = temperatureHourly.length;
  const rainCount = rainHourly.length;
  const pressureHumidityCount = pressureHumidityHourly.length;
  const windCount = windHourly.length;
  const uvCount = uvHourly.length;

  const rainChartMax = useMemo(() => niceUpperBound(numericValues(rainHourly, "rain"), 0.5), [rainHourly]);
  const pressureDomain = useMemo(() => paddedDomain(numericValues(pressureHumidityHourly, "pressure"), [1000, 1015]), [pressureHumidityHourly]);
  const windChartMax = useMemo(() => niceUpperBound([...numericValues(windHourly, "wind"), ...numericValues(windHourly, "gust")], 5), [windHourly]);
  const uvChartMax = useMemo(() => Math.max(15, niceUpperBound(numericValues(uvHourly, "uv"), 15)), [uvHourly]);

  const resetChartZoom = useCallback((chartId: WeatherChartId) => {
    setZoomRanges((ranges) => {
      const next = { ...ranges };
      delete next[chartId];
      return next;
    });
  }, []);

  const zoomChartWithWheel = useCallback((chartId: WeatherChartId, deltaY: number, focusRatio: number) => {
    if (!totalPoints) return;

    setZoomRanges((current) => {
      const existingRange = current[chartId];
      const currentRange = existingRange
        ? makeRange(totalPoints, existingRange.end - existingRange.start + 1, existingRange.start)
        : makeRange(totalPoints, totalPoints, 0);
      const currentCount = Math.max(1, currentRange.end - currentRange.start + 1);
      const nextCount = deltaY < 0
        ? Math.max(MIN_VISIBLE_POINTS, Math.floor(currentCount * 0.72))
        : Math.min(totalPoints, Math.ceil(currentCount * 1.38));

      if (nextCount === currentCount) return current;

      const focusIndex = currentRange.start + Math.round((currentCount - 1) * focusRatio);
      const nextStart = focusIndex - Math.round((nextCount - 1) * focusRatio);

      return {
        ...current,
        [chartId]: makeRange(totalPoints, nextCount, nextStart),
      };
    });
  }, [totalPoints]);

  return (
    <div className={styles.page}>
      <section className={styles.topBar}>
        <div className={styles.pageTitle}>
          <div className={styles.titleIcon}><WeatherGlyph code={current?.ma_thoi_tiet} /></div>
          <div>
            <p className={styles.eyebrow}>Dự báo thời tiết</p>
            <h1>{farmName}</h1>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.refreshButton} type="button" onClick={() => void loadWeather(true)} disabled={loading} title="Làm mới">
            <RefreshIcon />
            <span>{loading ? "Đang tải" : "Làm mới"}</span>
          </button>
        </div>
      </section>

      <section className={styles.sourceStrip}>
        <span>{locationName || "Vị trí nông trại"}</span>
        <span>{weather?.nguon_du_lieu || "Open-Meteo Forecast API"}</span>
        <span>Cập nhật: {formatInstantDateTime(weather?.cap_nhat_luc)}</span>
        {error ? <strong>{error}</strong> : null}
      </section>

      <section className={styles.overviewGrid}>
        <article className={styles.currentCard}>
          <div className={styles.locationLine}>{locationName || farmName}</div>
          <div className={styles.currentMain}>
            <WeatherGlyph code={current?.ma_thoi_tiet} />
            <div>
              <strong>{fmtInt(current?.nhiet_do_c)}<span>°C</span></strong>
              <p>{current?.mo_ta || "--"}</p>
            </div>
          </div>
          <div className={styles.tempRange}>
            <span>Cảm giác {fmt(current?.cam_giac_c)}°C</span>
            <span>Hôm nay {fmtInt(daily[0]?.nhiet_do_thap_nhat_c)} / {fmtInt(daily[0]?.nhiet_do_cao_nhat_c)}°C</span>
          </div>
          <small>{formatWeatherLocalDateTime(current?.thoi_gian)}</small>
        </article>

        <article className={styles.temperaturePanel}>
          <div className={styles.chartPanelHeader}>
            <div className={styles.panelTitle}>Nhiệt độ theo khung xem (°C)</div>
            <div className={styles.chartHeaderMeta}>
              <ChartRangeBadge points={hourly} range={chartRanges.temperature} total={totalPoints} />
              <ChartLegend metrics={temperatureMetrics} />
            </div>
          </div>
          <ChartInteractionFrame chartId="temperature" onWheelZoom={zoomChartWithWheel} onReset={resetChartZoom}>
            <ResponsiveContainer width="100%" height={168}>
              <AreaChart data={temperatureHourly} margin={{ top: 14, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff8a1f" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#ffb869" stopOpacity={0.16} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.08)" />
                <XAxis dataKey="isoTime" tickFormatter={(value) => formatAxisTick(String(value), temperatureCount)} tickLine={false} axisLine={false} minTickGap={tickGapFor(temperatureCount)} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={34} />
                <Tooltip cursor={{ stroke: "rgba(15,23,42,0.2)", strokeWidth: 1 }} content={<WeatherTooltip metrics={temperatureMetrics} />} />
                <Area type="monotone" dataKey="temperature" stroke="#ff7a1a" strokeWidth={3} fill="url(#temperatureFill)" name="Nhiệt độ" connectNulls activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartInteractionFrame>
        </article>

        <aside className={styles.dailyList}>
          {daily.slice(0, 6).map((day) => (
            <div key={day.ngay} className={styles.dailyRow}>
              <strong>{formatDay(day.ngay)}</strong>
              <WeatherGlyph code={day.ma_thoi_tiet} />
              <span>{fmtInt(day.nhiet_do_cao_nhat_c)}°C</span>
            </div>
          ))}
        </aside>
      </section>

      <section className={styles.metricGrid}>
        <article className={styles.metricCard}><span>Chỉ số UV</span><strong>{fmt(current?.uv)}</strong><small>{uvLabel(current?.uv)}</small></article>
        <article className={styles.metricCard}><span>Độ ẩm</span><strong>{fmtInt(current?.do_am_pct)}%</strong><small>Điểm sương: {fmt(current?.diem_suong_c)}°C</small></article>
        <article className={styles.metricCard}><span>Áp suất</span><strong>{fmt(current?.ap_suat_hpa)}</strong><small>hPa</small></article>
        <article className={styles.metricCard}><span>Gió</span><strong>{fmt(current?.gio_km_h)}</strong><small>km/h hướng {huongGio(current?.huong_gio_do)}</small></article>
        <article className={styles.metricCard}><span>Tầm nhìn</span><strong>{fmt(current?.tam_nhin_km)}</strong><small>km</small></article>
      </section>

      <section className={styles.chartPanel}>
        <div className={styles.chartPanelHeader}>
          <div className={styles.panelTitle}>LƯỢNG MƯA</div>
          <div className={styles.chartHeaderMeta}>
            <ChartRangeBadge points={hourly} range={chartRanges.rain} total={totalPoints} />
            <ChartLegend metrics={rainMetrics} />
          </div>
        </div>
        <ChartInteractionFrame chartId="rain" onWheelZoom={zoomChartWithWheel} onReset={resetChartZoom}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={rainHourly} margin={{ top: 18, right: 20, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="rainChanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c4e4f4" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#dff1f8" stopOpacity={0.42} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.08)" />
              <XAxis dataKey="isoTime" tickFormatter={(value) => formatAxisTick(String(value), rainCount)} tickLine={false} axisLine={false} minTickGap={tickGapFor(rainCount)} fontSize={11} />
              <YAxis yAxisId="rain" domain={[0, rainChartMax]} tickLine={false} axisLine={false} fontSize={11} width={44} label={{ value: "mm", angle: -90, position: "insideLeft", style: { fontSize: 11, fontWeight: 700, fill: "#263238" } }} />
              <YAxis yAxisId="chance" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} width={38} label={{ value: "%", angle: 90, position: "insideRight", style: { fontSize: 11, fontWeight: 700, fill: "#263238" } }} />
              <Tooltip cursor={{ fill: "rgba(134,191,224,0.16)" }} content={<WeatherTooltip metrics={rainMetrics} />} />
              <Area yAxisId="chance" type="monotone" dataKey="chance" stroke="#b8dcf0" fill="url(#rainChanceFill)" fillOpacity={0.75} name="Khả năng mưa" connectNulls activeDot={{ r: 4, strokeWidth: 0 }} />
              <Bar yAxisId="rain" dataKey="rain" fill="#86bfe0" radius={[5, 5, 0, 0]} name="Lượng mưa dự kiến" maxBarSize={30} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartInteractionFrame>
      </section>

      <section className={styles.chartPanel}>
        <div className={styles.chartPanelHeader}>
          <div className={styles.panelTitle}>ÁP SUẤT | ĐỘ ẨM</div>
          <div className={styles.chartHeaderMeta}>
            <ChartRangeBadge points={hourly} range={chartRanges.pressureHumidity} total={totalPoints} />
            <ChartLegend metrics={pressureHumidityMetrics} />
          </div>
        </div>
        <ChartInteractionFrame chartId="pressureHumidity" onWheelZoom={zoomChartWithWheel} onReset={resetChartZoom}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={pressureHumidityHourly} margin={{ top: 18, right: 20, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="pressureFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b8efe6" stopOpacity={0.88} />
                  <stop offset="100%" stopColor="#d8f6f0" stopOpacity={0.42} />
                </linearGradient>
                <linearGradient id="humidityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d8edb8" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#edf6dc" stopOpacity={0.42} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.08)" />
              <XAxis dataKey="isoTime" tickFormatter={(value) => formatAxisTick(String(value), pressureHumidityCount)} tickLine={false} axisLine={false} minTickGap={tickGapFor(pressureHumidityCount)} fontSize={11} />
              <YAxis yAxisId="pressure" domain={pressureDomain} tickLine={false} axisLine={false} fontSize={11} width={56} label={{ value: "hPa", angle: -90, position: "insideLeft", style: { fontSize: 11, fontWeight: 700, fill: "#263238" } }} />
              <YAxis yAxisId="humidity" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} width={38} label={{ value: "%", angle: 90, position: "insideRight", style: { fontSize: 11, fontWeight: 700, fill: "#263238" } }} />
              <Tooltip cursor={{ stroke: "rgba(15,23,42,0.18)", strokeWidth: 1 }} content={<WeatherTooltip metrics={pressureHumidityMetrics} />} />
              <Area yAxisId="pressure" type="monotone" dataKey="pressure" stroke="#9be0d3" fill="url(#pressureFill)" fillOpacity={0.7} name="Áp suất" connectNulls activeDot={{ r: 4, strokeWidth: 0 }} />
              <Area yAxisId="humidity" type="monotone" dataKey="humidity" stroke="#b6d97a" fill="url(#humidityFill)" fillOpacity={0.72} name="Độ ẩm" connectNulls activeDot={{ r: 4, strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartInteractionFrame>
      </section>

      <section className={styles.chartPanel}>
        <div className={styles.chartPanelHeader}>
          <div className={styles.panelTitle}>TỐC ĐỘ GIÓ</div>
          <div className={styles.chartHeaderMeta}>
            <ChartRangeBadge points={hourly} range={chartRanges.wind} total={totalPoints} />
            <ChartLegend metrics={windMetrics} />
          </div>
        </div>
        <ChartInteractionFrame chartId="wind" onWheelZoom={zoomChartWithWheel} onReset={resetChartZoom}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={windHourly} margin={{ top: 18, right: 20, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.08)" />
              <XAxis dataKey="isoTime" tickFormatter={(value) => formatAxisTick(String(value), windCount)} tickLine={false} axisLine={false} minTickGap={tickGapFor(windCount)} fontSize={11} />
              <YAxis domain={[0, windChartMax]} tickLine={false} axisLine={false} fontSize={11} width={46} label={{ value: "km/h", angle: -90, position: "insideLeft", style: { fontSize: 11, fontWeight: 700, fill: "#263238" } }} />
              <Tooltip cursor={{ stroke: "rgba(15,23,42,0.18)", strokeWidth: 1 }} content={<WeatherTooltip metrics={windMetrics} />} />
              <Line type="monotone" dataKey="gust" stroke="#c6d2db" strokeWidth={2} dot={false} name="Gió giật" connectNulls activeDot={{ r: 4, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="wind" stroke="#8aa7b8" strokeWidth={3} dot={false} name="Tốc độ gió" connectNulls activeDot={{ r: 5, strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartInteractionFrame>
      </section>

      <section className={styles.chartPanel}>
        <div className={styles.chartPanelHeader}>
          <div className={styles.panelTitle}>CHỈ SỐ BỨC XẠ UV</div>
          <div className={styles.chartHeaderMeta}>
            <ChartRangeBadge points={hourly} range={chartRanges.uv} total={totalPoints} />
            <ChartLegend metrics={uvMetrics} />
          </div>
        </div>
        <ChartInteractionFrame chartId="uv" className={styles.uvChartWrap} onWheelZoom={zoomChartWithWheel} onReset={resetChartZoom}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={uvHourly} margin={{ top: 18, right: 20, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.08)" />
              <XAxis dataKey="isoTime" tickFormatter={(value) => formatAxisTick(String(value), uvCount)} tickLine={false} axisLine={false} minTickGap={tickGapFor(uvCount)} fontSize={11} />
              <YAxis yAxisId="uv" domain={[0, uvChartMax]} tickLine={false} axisLine={false} fontSize={11} width={44} label={{ value: "UVI", angle: -90, position: "insideLeft", style: { fontSize: 11, fontWeight: 700, fill: "#263238" } }} />
              {uvBands.map((band) => (
                <ReferenceArea key={band.label} yAxisId="uv" y1={band.from} y2={band.to} fill={band.color} fillOpacity={0.78} strokeOpacity={0} />
              ))}
              <Tooltip cursor={{ stroke: "rgba(15,23,42,0.18)", strokeWidth: 1 }} content={<WeatherTooltip metrics={uvMetrics} />} />
              <Line yAxisId="uv" type="monotone" dataKey="uv" stroke="#4f9f73" strokeWidth={2.5} strokeDasharray="5 4" dot={false} name="UVI" connectNulls activeDot={{ r: 5, strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className={styles.uvBandLabels} aria-hidden="true">
            {[...uvBands].reverse().map((band) => <span key={band.label}>{band.label}</span>)}
          </div>
        </ChartInteractionFrame>
      </section>
    </div>
  );
}
