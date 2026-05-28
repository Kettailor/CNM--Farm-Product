"use client";

import type { ZoneListItem } from "@/lib/dashboard-zone-list";
import styles from "@/app/dashboard/khu-vuc/page.module.css";

type Props = {
  zone: ZoneListItem;
};

type Point = { lat: number; lng: number };


const PREVIEW_WIDTH = 240;
const PREVIEW_HEIGHT = 180;
const TILE_SIZE = 256;
const WORLD_SPAN = 360;
const MAX_ZOOM = 18;
const MIN_ZOOM = 14;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toRad = (deg: number) => (deg * Math.PI) / 180;

const getBounds = (polygon: Point[]) => {
  if (polygon.length < 3) return null;
  const lats = polygon.map((point) => point.lat);
  const lngs = polygon.map((point) => point.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
};

const project = (lat: number, lng: number, zoom: number) => {
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    x: ((lng + 180) / WORLD_SPAN) * scale,
    y: ((1 - Math.log(Math.tan(toRad(lat)) + 1 / Math.cos(toRad(lat))) / Math.PI) / 2) * scale,
  };
};

const fitZoom = (bounds: NonNullable<ReturnType<typeof getBounds>>) => {
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 1e-7);
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 1e-7);
  const safeWidth = PREVIEW_WIDTH - 24;
  const safeHeight = PREVIEW_HEIGHT - 24;
  const zoomByWidth = Math.log2((safeWidth * WORLD_SPAN) / (lngSpan * TILE_SIZE));
  const zoomByHeight = Math.log2((safeHeight * WORLD_SPAN) / (latSpan * TILE_SIZE));
  return clamp(Math.floor(Math.min(zoomByWidth, zoomByHeight)), MIN_ZOOM, MAX_ZOOM);
};

const buildGeometry = (polygon: Point[]) => {
  const bounds = getBounds(polygon);
  if (!bounds) return null;
  const zoom = fitZoom(bounds);
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const centerPoint = project(centerLat, centerLng, zoom);
  const translateX = PREVIEW_WIDTH / 2 - centerPoint.x;
  const translateY = PREVIEW_HEIGHT / 2 - centerPoint.y;
  const points = polygon.map((point) => {
    const projected = project(point.lat, point.lng, zoom);
    return { x: projected.x + translateX, y: projected.y + translateY };
  });
  const path = points.map((p, index) => `${index === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") + " Z";
  return { points, path, bounds };
};

export default function ZonePreviewCard({ zone }: Props) {
  const geometry = buildGeometry(zone.polygon);
  if (!geometry) {
    return (
      <div className={styles.zoneMapPreview} aria-hidden="true">
        <div className={styles.zoneMapFrame} style={{ borderColor: zone.color }}>
          <div className={styles.zoneMapFallback}>
            <span>Không có hình học</span>
          </div>
        </div>
      </div>
    );
  }

  const { points, path } = geometry;
  const gridLines = [20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220];

  return (
    <div className={styles.zoneMapPreview} aria-hidden="true">
      <div className={styles.zoneMapFrame} style={{ borderColor: zone.color }}>
        <div className={styles.zoneStaticMapCanvas}>
          <svg viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`} className={styles.zoneMapSvg} preserveAspectRatio="none">
            <defs>
              <linearGradient id={`zone-static-bg-${zone.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#eef4ef" stopOpacity="1" />
                <stop offset="100%" stopColor="#dbe8df" stopOpacity="1" />
              </linearGradient>
              <pattern id={`zone-static-grid-${zone.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="1" />
              </pattern>
              <linearGradient id={`zone-static-fill-${zone.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={zone.color} stopOpacity="0.38" />
                <stop offset="100%" stopColor={zone.color} stopOpacity="0.18" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} fill={`url(#zone-static-bg-${zone.id})`} />
            <rect x="0" y="0" width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} fill={`url(#zone-static-grid-${zone.id})`} />
            {gridLines.map((x) => <line key={`v-${x}`} x1={x} y1="0" x2={x} y2={PREVIEW_HEIGHT} stroke="rgba(15,23,42,0.03)" strokeWidth="1" />)}
            {gridLines.map((y) => <line key={`h-${y}`} x1="0" y1={y} x2={PREVIEW_WIDTH} y2={y} stroke="rgba(15,23,42,0.03)" strokeWidth="1" />)}
            <path d={path} fill={`url(#zone-static-fill-${zone.id})`} stroke={zone.color} strokeWidth="4.4" vectorEffect="non-scaling-stroke" />
            {points.map((point, index) => (
              <circle key={`${zone.id}-${index}`} cx={clamp(point.x, 6, PREVIEW_WIDTH - 6)} cy={clamp(point.y, 6, PREVIEW_HEIGHT - 6)} r="4.4" fill="#ffffff" stroke={zone.color} strokeWidth="1.8" />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
