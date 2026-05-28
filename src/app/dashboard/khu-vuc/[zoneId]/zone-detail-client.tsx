"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MapViewSwitcher from "@/components/map-view-switcher";
import type { ZoneDetail } from "@/lib/dashboard-zone-detail";
import type { VegetationIndexSeries } from "@/lib/zone-vegetation";
import styles from "./page.module.css";

type VegetationPayload = {
  zoneId: string;
  source: string;
  updatedAt: string;
  vegetation: {
    samples: Array<{ date: string; ndvi: number; evi: number; gndvi: number; savi: number; ndwi: number }>;
    indexes: VegetationIndexSeries[];
  };
};

type Props = {
  zone: ZoneDetail;
  vegetation: VegetationPayload["vegetation"];
};

const chartColors: Record<string, string> = {
  ndvi: "#2f855a",
  evi: "#2563eb",
  gndvi: "#0f766e",
  savi: "#ca8a04",
  ndwi: "#0ea5e9",
};

const CHART_WIDTH = 900;
const CHART_HEIGHT = 320;
const CHART_PADDING = 34;

function scalePoints(values: number[], min: number, max: number) {
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = CHART_PADDING + (index * (CHART_WIDTH - CHART_PADDING * 2)) / Math.max(values.length - 1, 1);
      const y = CHART_HEIGHT - CHART_PADDING - ((value - min) / span) * (CHART_HEIGHT - CHART_PADDING * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

function MultiLineChart({ samples }: { samples: VegetationPayload["vegetation"]["samples"] }) {
  const series = ["ndvi", "evi", "gndvi", "savi", "ndwi"] as const;
  const allValues = samples.flatMap((item) => series.map((key) => item[key]));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const yTicks = Array.from({ length: 5 }, (_, index) => min + (index * (max - min)) / 4);

  return (
    <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className={styles.chartSvg} role="img" aria-label="Biểu đồ nhiều đường chỉ số thảm thực vật">
      {yTicks.map((tick) => {
        const y = CHART_HEIGHT - CHART_PADDING - ((tick - min) / (max - min || 1)) * (CHART_HEIGHT - CHART_PADDING * 2);
        return <line key={tick} x1={CHART_PADDING} y1={y} x2={CHART_WIDTH - CHART_PADDING} y2={y} stroke="rgba(15,23,42,0.08)" strokeWidth="1" />;
      })}
      {series.map((key) => {
        const color = chartColors[key];
        const values = samples.map((item) => item[key]);
        const points = scalePoints(values, min, max);
        return (
          <g key={key}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {values.map((value, valueIndex) => {
              const x = CHART_PADDING + (valueIndex * (CHART_WIDTH - CHART_PADDING * 2)) / Math.max(values.length - 1, 1);
              const y = CHART_HEIGHT - CHART_PADDING - ((value - min) / (max - min || 1)) * (CHART_HEIGHT - CHART_PADDING * 2);
              return <circle key={`${key}-${valueIndex}`} cx={x} cy={y} r="3.2" fill="#fff" stroke={color} strokeWidth="2" />;
            })}
          </g>
        );
      })}
      {samples.map((sample, index) => {
        const x = CHART_PADDING + (index * (CHART_WIDTH - CHART_PADDING * 2)) / Math.max(samples.length - 1, 1);
        return <text key={sample.date} x={x} y={CHART_HEIGHT - 10} textAnchor="middle" fontSize="11" fill="#64748b">{sample.date}</text>;
      })}
    </svg>
  );
}

export default function ZoneDetailClient({ zone, vegetation: initialVegetation }: Props) {
  const [vegetation, setVegetation] = useState(initialVegetation);
  const [vegetationUpdatedAt, setVegetationUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadVegetation = async () => {
      try {
        const response = await fetch(`/api/dashboard/khu-vuc/${zone.id}/vegetation`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as VegetationPayload;
        if (!cancelled && payload.vegetation) {
          setVegetation(payload.vegetation);
          setVegetationUpdatedAt(payload.updatedAt ?? null);
        }
      } catch {
        if (!cancelled) {
          setVegetation(initialVegetation);
          setVegetationUpdatedAt(null);
        }
      }
    };

    void loadVegetation();
    return () => {
      cancelled = true;
    };
  }, [initialVegetation, zone.id]);

  const mapPolygon = zone.polygon;
  const chartTitle = useMemo(() => "Biểu đồ nhiều đường theo thời gian", []);

  return (
    <>
      <section className={styles.heroCard}>
        <div className={styles.heroMain}>
          <p className={styles.kicker}>Quản lý khu vực</p>
          <div className={styles.heroTitleRow}>
            <h1>{zone.name}</h1>
            <span className={`${styles.statusBadge} ${styles.statusActive}`}>{zone.statusLabel}</span>
          </div>
          <p className={styles.heroSub}>{zone.description}</p>
          <div className={styles.heroMeta}>
            <span>Mã khu: {zone.id}</span>
            <span>Diện tích: {zone.areaHa ? `${zone.areaHa.toFixed(2)} ha` : ""}</span>
            <span>Chu vi: {zone.perimeterM ? `${zone.perimeterM.toFixed(0)} m` : ""}</span>
          </div>
        </div>
        <div className={styles.heroActions}>
          <Link href="/dashboard/khu-vuc" className={styles.secondaryButton}>Quay lại</Link>
          <Link href={`/dashboard/khu-vuc/${zone.id}/chinh-sua`} className={styles.primaryButton}>Chỉnh sửa</Link>
        </div>
      </section>

      <section className={styles.twoColumnGrid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}><h2>Chi tiết khu vực</h2></div>
          <div className={styles.detailGrid}>
            {zone.details.map((item) => (
              <div key={item.label} className={styles.detailItem}><span>{item.label}</span><strong>{item.value}</strong></div>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}><h2>Vị trí trên bản đồ</h2></div>
          <div className={styles.mapFrame}>
            <MapViewSwitcher
              lat={zone.center.lat}
              lng={zone.center.lng}
              zoom={17}
              title={zone.name}
              initialMode="satellite"
              frameClassName={styles.mapCanvas}
              polygon={mapPolygon}
              fitToPolygon
              hideModeTabs={false}
              hideEcoNote
              lockMap={false}
            />
          </div>
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Vegetation Indexes</p>
            <h2>Chỉ số thảm thực vật theo polygon khu vực</h2>
          </div>
          <span className={styles.sectionPill}>{chartTitle}</span>
        </div>
        <p className={styles.sourceLine}>Nguồn dữ liệu: {vegetationUpdatedAt ? `cập nhật lúc ${new Date(vegetationUpdatedAt).toLocaleString("vi-VN")}` : ""}</p>
        <div className={styles.indexCards}>
          {vegetation.indexes.map((index) => (
            <div key={index.key} className={styles.indexCard}>
              <div className={styles.indexRow}><strong>{index.label}</strong><span style={{ color: index.color }}>{index.value.toFixed(2)}</span></div>
              <div className={styles.indexBar}><div className={styles.indexBarFill} style={{ width: `${Math.min(100, Math.max(5, (index.value + 0.4) * 100))}%`, background: index.color }} /></div>
              <p>{index.helper}</p>
            </div>
          ))}
        </div>
        <div className={styles.chartGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}><strong>Tổng hợp nhiều chỉ số</strong><span>NDVI · EVI · GNDVI · SAVI · NDWI</span></div>
            <MultiLineChart samples={vegetation.samples} />
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Thông tin liên quan</p>
            <h2>Vật nuôi và cảm biến gắn với khu vực</h2>
          </div>
        </div>
        <div className={styles.linkedGrid}>
          <div className={styles.linkedPanel}>
            <h3>Vật nuôi</h3>
            <div className={styles.scrollList}>
              {zone.livestock.map((item) => item.label || item.value ? <div key={item.label} className={styles.listRow}><strong>{item.label}</strong><span>{item.value}</span></div> : null)}
            </div>
          </div>
          <div className={styles.linkedPanel}>
            <h3>Cảm biến</h3>
            <div className={styles.scrollList}>
              {zone.sensors.map((item) => item.label || item.value ? <div key={item.label} className={styles.listRow}><strong>{item.label}</strong><span>{item.value}</span></div> : null)}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Nhật ký</p>
            <h2>Hoạt động và ghi chú khu vực</h2>
          </div>
        </div>
        <div className={styles.dualScrollLists}>
          <div className={styles.linkedPanel}>
            <h3>Nhật ký hoạt động</h3>
            <div className={styles.scrollList}>
              {zone.activities.map((item) => (
                <article key={item.id} className={styles.logItem}>
                  <div className={styles.logHead}><strong>{item.action}</strong><span>{item.date}</span></div>
                  <p>{item.details}</p>
                  <small>{item.actor}</small>
                </article>
              ))}
            </div>
          </div>
          <div className={styles.linkedPanel}>
            <h3>Notes</h3>
            <div className={styles.scrollList}>
              {zone.notes.map((note) => (
                <article key={note.id} className={styles.logItem}>
                  <div className={styles.logHead}><strong>{note.type}</strong><span>{note.date}</span></div>
                  <p>{note.info}</p>
                  <small>{note.user}</small>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
