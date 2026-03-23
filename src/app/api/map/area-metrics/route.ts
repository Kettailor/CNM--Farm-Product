import { NextRequest, NextResponse } from "next/server";

type MetricKey = "NDVI" | "EVI" | "NDMI" | "NDWI" | "SAVI" | "NDSI";

const clamp = (v: number, min = 0.05, max = 0.95) => Math.max(min, Math.min(max, v));

const buildMetrics = (lat: number, lng: number, type: string, polygonFactor = 0): Record<MetricKey, number> => {
  const seed = Math.abs(Math.sin(lat * 37.7 + lng * 71.3 + polygonFactor));
  const bias = type === "chan_nuoi" ? -0.08 : type === "thiet_bi" ? -0.12 : type === "dong_co" ? 0.04 : 0.08;

  const ndvi = clamp(0.45 + seed * 0.35 + bias);
  const evi = clamp(ndvi - 0.1 + seed * 0.05);
  const ndmi = clamp(ndvi - 0.14 + seed * 0.08);
  const ndwi = clamp(0.25 + (1 - seed) * 0.28 - bias * 0.3);
  const savi = clamp(ndvi - 0.02 + seed * 0.04);
  const ndsi = clamp(0.32 + seed * 0.22 - bias * 0.25);

  return {
    NDVI: Number(ndvi.toFixed(2)),
    EVI: Number(evi.toFixed(2)),
    NDMI: Number(ndmi.toFixed(2)),
    NDWI: Number(ndwi.toFixed(2)),
    SAVI: Number(savi.toFixed(2)),
    NDSI: Number(ndsi.toFixed(2)),
  };
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = Number(searchParams.get("lat") ?? 0);
  const lng = Number(searchParams.get("lng") ?? 0);
  const type = String(searchParams.get("type") ?? "trong_trot");
  const polygonRaw = searchParams.get("polygon") ?? "[]";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ message: "Tọa độ không hợp lệ." }, { status: 400 });
  }

  let polygonFactor = 0;
  try {
    const polygon = JSON.parse(polygonRaw) as Array<{ lat: number; lng: number }>;
    if (Array.isArray(polygon) && polygon.length >= 3) {
      const avgLat = polygon.reduce((acc, p) => acc + Number(p?.lat || 0), 0) / polygon.length;
      const avgLng = polygon.reduce((acc, p) => acc + Number(p?.lng || 0), 0) / polygon.length;
      polygonFactor = Math.abs(Math.sin(avgLat * 10 + avgLng * 10));
    }
  } catch {
    polygonFactor = 0;
  }

  const metrics = buildMetrics(lat, lng, type, polygonFactor);
  return NextResponse.json({
    metrics,
    source: "synthetic-location-based",
    center: { lat, lng },
  });
}

