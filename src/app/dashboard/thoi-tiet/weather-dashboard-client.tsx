"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardTopActions from "@/components/dashboard-top-actions";
import type { DuLieuThoiTiet } from "@/lib/thoi-tiet";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
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

type ChartValue = number | string | Array<number | string> | null | undefined;

const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";
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

function formatWeatherLocalDateTime(value: string | null | undefined) {
  if (!value) return "--";
  const parts = localDateParts(value);
  if (!parts) return "--";
  const weekday = weekDayFormat.format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
  return `${parts.time} ${weekday}, ${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}`;
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

function chartNumber(value: ChartValue) {
  return typeof value === "number" && Number.isFinite(value) ? fmt(value) : "--";
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

export default function WeatherDashboardClient({ farmName, locationName, latitude, longitude, initialWeather }: Props) {
  const [weather, setWeather] = useState(initialWeather);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialWeather ? null : "Chưa tải được dữ liệu thời tiết.");

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lấy được dữ liệu thời tiết.");
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (!initialWeather) void loadWeather(false);
  }, [initialWeather, loadWeather]);

  const hourly = useMemo(() => {
    return (weather?.theo_gio ?? []).slice(0, 24).map((item) => ({
      time: formatHour(item.thoi_gian),
      temperature: item.nhiet_do_c,
      rain: item.luong_mua_mm,
      chance: item.xac_suat_mua_pct,
      humidity: item.do_am_pct,
      pressure: item.ap_suat_hpa,
      wind: item.gio_km_h,
    }));
  }, [weather]);

  const rainAxisMax = useMemo(() => {
    const values = hourly.map((item) => item.rain ?? 0).filter((value) => Number.isFinite(value));
    const max = Math.max(0, ...values);
    if (max <= 0.5) return 0.5;
    if (max <= 1) return 1;
    if (max <= 2) return 2;
    return Math.ceil(max);
  }, [hourly]);
  const rainChartMax = Math.min(rainAxisMax, 2);

  const daily = weather?.du_bao_ngay ?? [];
  const current = weather?.hien_tai;

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
          <DashboardTopActions />
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
          <div className={styles.panelTitle}>Nhiệt độ hôm nay (°C)</div>
          <ResponsiveContainer width="100%" height={168}>
            <AreaChart data={hourly} margin={{ top: 14, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff8a1f" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ffb869" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.08)" />
              <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={26} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={34} />
              <Tooltip formatter={(value) => [`${chartNumber(value as ChartValue)}°C`, "Nhiệt độ"]} />
              <Area type="monotone" dataKey="temperature" stroke="#ff7a1a" strokeWidth={3} fill="url(#temperatureFill)" name="Nhiệt độ" />
            </AreaChart>
          </ResponsiveContainer>
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
        <div className={styles.panelTitle}>LƯỢNG MƯA</div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={hourly} margin={{ top: 18, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.08)" />
            <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} fontSize={11} />
            <YAxis yAxisId="rain" domain={[0, rainChartMax]} allowDataOverflow tickLine={false} axisLine={false} fontSize={11} width={44} />
            <YAxis yAxisId="chance" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} width={36} />
            <Tooltip
              formatter={(value, name) => {
                if (name === "Lượng mưa dự kiến") return [`${chartNumber(value as ChartValue)} mm`, name];
                return [`${chartNumber(value as ChartValue)}%`, name];
              }}
            />
            <Bar yAxisId="rain" dataKey="rain" fill="#8fc5e4" radius={[5, 5, 0, 0]} name="Lượng mưa dự kiến" maxBarSize={28} />
            <Area yAxisId="chance" type="monotone" dataKey="chance" stroke="#b8dcf0" fill="#cfe8f6" fillOpacity={0.55} name="Khả năng mưa" />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <section className={styles.chartPanel}>
        <div className={styles.panelTitle}>ÁP SUẤT | ĐỘ ẨM</div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={hourly} margin={{ top: 18, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.08)" />
            <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} fontSize={11} />
            <YAxis yAxisId="pressure" tickLine={false} axisLine={false} fontSize={11} width={52} />
            <YAxis yAxisId="humidity" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} width={36} />
            <Tooltip
              formatter={(value, name) => {
                if (name === "Áp suất") return [`${chartNumber(value as ChartValue)} hPa`, name];
                return [`${chartNumber(value as ChartValue)}%`, name];
              }}
            />
            <Area yAxisId="pressure" type="monotone" dataKey="pressure" stroke="#9be0d3" fill="#c9efe8" fillOpacity={0.72} name="Áp suất" />
            <Area yAxisId="humidity" type="monotone" dataKey="humidity" stroke="#b6d97a" fill="#dcefc1" fillOpacity={0.72} name="Độ ẩm" />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <section className={styles.chartPanel}>
        <div className={styles.panelTitle}>TỐC ĐỘ GIÓ</div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={hourly} margin={{ top: 18, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="rgba(15,23,42,0.08)" />
            <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} width={44} />
            <Tooltip formatter={(value) => [`${chartNumber(value as ChartValue)} km/h`, "Tốc độ gió"]} />
            <Area type="monotone" dataKey="wind" stroke="#7da7d9" fill="#d5e3f6" fillOpacity={0.78} name="Tốc độ gió" />
          </AreaChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
