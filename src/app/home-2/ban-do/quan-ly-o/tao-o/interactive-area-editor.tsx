"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import MapViewSwitcher from "@/components/map-view-switcher";

type Point = { x: number; y: number };

type Props = {
  lat: number;
  lng: number;
  zoomLevel: number;
  overlayColor: string;
  onGeometryChange?: (v: {
    areaHa: number;
    perimeterM: number;
    centroidLat: number;
    centroidLng: number;
    pointCount: number;
    polygon: Array<{ lat: number; lng: number }>;
    bounds: { south: number; west: number; north: number; east: number };
  }) => void;
};

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const EARTH_RADIUS = 6378137;

const toRad = (v: number) => (v * Math.PI) / 180;
const toDeg = (v: number) => (v * 180) / Math.PI;

const projectToWorld = (lat: number, lng: number, zoom: number) => {
  const worldSize = 256 * 2 ** zoom;
  const clampedSin = Math.min(0.9999, Math.max(-0.9999, Math.sin(toRad(lat))));
  const x = ((lng + 180) / 360) * worldSize;
  const y = (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) * worldSize;
  return { x, y, worldSize };
};

const unprojectFromWorld = (x: number, y: number, worldSize: number) => {
  const lng = (x / worldSize) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / worldSize;
  const lat = toDeg(Math.atan(Math.sinh(n)));
  return { lat, lng };
};

const getMetersPerPixel = (lat: number, zoom: number) => {
  const cosLat = Math.max(0.01, Math.cos(toRad(lat)));
  return (156543.03392 * cosLat) / (2 ** zoom);
};

const haversineM = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export default function InteractiveAreaEditor({ lat, lng, zoomLevel, overlayColor, onGeometryChange }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [points, setPoints] = useState<Point[]>([
    { x: 32, y: 26 },
    { x: 51, y: 20 },
    { x: 67, y: 31 },
    { x: 64, y: 51 },
    { x: 45, y: 60 },
    { x: 28, y: 47 },
  ]);
  const [viewport, setViewport] = useState({ width: 720, height: 420 });
  const [mapView, setMapView] = useState({ lat, lng, zoom: zoomLevel });

  const polygonPoints = useMemo(() => points.map((p) => `${p.x},${p.y}`).join(" "), [points]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const measure = () => {
      const rect = wrap.getBoundingClientRect();
      setViewport({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const viewLat = Number.isFinite(mapView.lat) ? mapView.lat : lat;
    const viewLng = Number.isFinite(mapView.lng) ? mapView.lng : lng;
    const viewZoom = Number.isFinite(mapView.zoom) ? mapView.zoom : zoomLevel;
    const { x: cx, y: cy, worldSize } = projectToWorld(viewLat, viewLng, viewZoom);
    const metersPerPixel = getMetersPerPixel(viewLat, viewZoom);

    const polygon = points.map((p) => {
      const dxPx = ((p.x - 50) / 100) * viewport.width;
      const dyPx = ((p.y - 50) / 100) * viewport.height;
      return unprojectFromWorld(cx + dxPx, cy + dyPx, worldSize);
    });

    if (polygon.length < 3) return;

    const avgLat = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
    const cosLat = Math.max(0.01, Math.cos(toRad(avgLat)));
    const local = polygon.map((p) => ({ x: EARTH_RADIUS * toRad(p.lng) * cosLat, y: EARTH_RADIUS * toRad(p.lat) }));

    const signedAreaM2 = local.reduce((acc, p, i) => {
      const n = local[(i + 1) % local.length];
      return acc + p.x * n.y - n.x * p.y;
    }, 0) / 2;
    const perimeterM = polygon.reduce((acc, p, i) => {
      const n = polygon[(i + 1) % polygon.length];
      return acc + haversineM(p, n);
    }, 0);

    const centroidLocal = local.reduce(
      (acc, p, i) => {
        const n = local[(i + 1) % local.length];
        const cross = p.x * n.y - n.x * p.y;
        return { x: acc.x + (p.x + n.x) * cross, y: acc.y + (p.y + n.y) * cross };
      },
      { x: 0, y: 0 }
    );
    const centroidX = Math.abs(signedAreaM2) > 1e-6 ? centroidLocal.x / (6 * signedAreaM2) : local.reduce((s, p) => s + p.x, 0) / local.length;
    const centroidY = Math.abs(signedAreaM2) > 1e-6 ? centroidLocal.y / (6 * signedAreaM2) : local.reduce((s, p) => s + p.y, 0) / local.length;
    const centroidLat = toDeg(centroidY / EARTH_RADIUS);
    const centroidLng = toDeg(centroidX / (EARTH_RADIUS * cosLat));

    const bounds = {
      south: Math.min(...polygon.map((p) => p.lat)),
      west: Math.min(...polygon.map((p) => p.lng)),
      north: Math.max(...polygon.map((p) => p.lat)),
      east: Math.max(...polygon.map((p) => p.lng)),
    };

    const areaM2ByPixels = Math.abs(
      points.reduce((acc, p, i) => {
        const n = points[(i + 1) % points.length];
        const x1 = (p.x / 100) * viewport.width;
        const y1 = (p.y / 100) * viewport.height;
        const x2 = (n.x / 100) * viewport.width;
        const y2 = (n.y / 100) * viewport.height;
        return acc + x1 * y2 - x2 * y1;
      }, 0) / 2
    ) * (metersPerPixel ** 2);

    onGeometryChange?.({
      areaHa: Math.max(0, areaM2ByPixels / 10000),
      perimeterM,
      centroidLat,
      centroidLng,
      pointCount: points.length,
      polygon,
      bounds,
    });
  }, [points, lat, lng, zoomLevel, viewport.width, viewport.height, mapView, onGeometryChange]);

  const startDrag = (mode: "vertex" | "edge" | "move", idx: number, e: React.MouseEvent<Element>) => {
    e.preventDefault();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const base = points.map((p) => ({ ...p }));

    const onMove = (ev: MouseEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      setPoints((prev) => {
        const next = base.map((p) => ({ ...p }));
        if (mode === "move") return next.map((p) => ({ x: clamp(p.x + dx), y: clamp(p.y + dy) }));
        if (mode === "vertex") {
          next[idx] = { x: clamp(base[idx].x + dx), y: clamp(base[idx].y + dy) };
          return next;
        }
        const insertIdx = idx + 1;
        const p1 = base[idx];
        const p2 = base[(idx + 1) % base.length];
        const m = { x: clamp((p1.x + p2.x) / 2 + dx), y: clamp((p1.y + p2.y) / 2 + dy) };
        next.splice(insertIdx, 0, m);
        return next;
      });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="area-editor-map-wrap">
      <MapViewSwitcher
        lat={lat}
        lng={lng}
        zoom={zoomLevel}
        title="Bản đồ tạo ô"
        frameClassName="area-editor-map"
        onViewChange={setMapView}
        frameOverlay={
          <div className="area-overlay-layer" ref={wrapRef}>
            <svg className="area-overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points={polygonPoints} fill={overlayColor} fillOpacity="0.28" stroke={overlayColor} strokeWidth="0.5" />
              {points.map((p, i) => {
                const n = points[(i + 1) % points.length];
                const mid = { x: (p.x + n.x) / 2, y: (p.y + n.y) / 2 };
                return (
                  <g key={`p-${i}`}>
                    <circle cx={p.x} cy={p.y} r={1.15} className="area-node" onMouseDown={(e) => startDrag("vertex", i, e)} />
                    <circle cx={mid.x} cy={mid.y} r={0.75} className="area-edge-node" onMouseDown={(e) => startDrag("edge", i, e)} />
                  </g>
                );
              })}
            </svg>
          </div>
        }
      />
    </div>
  );
}

