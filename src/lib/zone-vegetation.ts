export type VegetationIndexKey = "ndvi" | "evi" | "gndvi" | "savi" | "ndwi";

export type VegetationIndexSeries = {
  key: VegetationIndexKey;
  label: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "flat";
  color: string;
  helper: string;
};

export type VegetationSample = {
  date: string;
  ndvi: number;
  evi: number;
  gndvi: number;
  savi: number;
  ndwi: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hashString = (value: string) =>
  value.split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000003, 7);

const polygonSignature = (polygon: Array<{ lat: number; lng: number }>) => {
  const base = polygon.map((point) => `${point.lat.toFixed(5)}:${point.lng.toFixed(5)}`).join("|");
  return hashString(base || "empty-polygon");
};

const seededNumber = (seed: number, index: number, min: number, max: number) => {
  const raw = Math.sin(seed * 0.0001 + index * 1.137 + 0.77) * 10000;
  const fraction = raw - Math.floor(raw);
  return min + fraction * (max - min);
};

export function buildVegetationDataset(polygon: Array<{ lat: number; lng: number }>, areaHa: number) {
  const seed = polygonSignature(polygon) + Math.round(areaHa * 100);
  const months = 12;
  const samples: VegetationSample[] = Array.from({ length: months }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (months - 1 - index));
    const base = clamp(0.28 + (areaHa % 2.4) * 0.08 + seededNumber(seed, index, -0.08, 0.18), 0.08, 0.88);
    const ndvi = clamp(base, 0.05, 0.92);
    const evi = clamp(ndvi * 0.92 + seededNumber(seed, index + 11, -0.05, 0.07), 0.03, 0.96);
    const gndvi = clamp(ndvi * 0.85 + seededNumber(seed, index + 22, -0.06, 0.08), 0.02, 0.94);
    const savi = clamp(ndvi * 0.88 + seededNumber(seed, index + 33, -0.05, 0.06), 0.02, 0.95);
    const ndwi = clamp(0.22 + seededNumber(seed, index + 44, -0.16, 0.18) - (ndvi - 0.35) * 0.18, -0.4, 0.8);
    return {
      date: date.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" }),
      ndvi,
      evi,
      gndvi,
      savi,
      ndwi,
    };
  });

  const latest = samples[samples.length - 1];
  const previous = samples[samples.length - 2] ?? latest;

  const make = (
    key: VegetationIndexKey,
    label: string,
    value: number,
    prev: number,
    color: string,
    helper: string
  ): VegetationIndexSeries => ({
    key,
    label,
    value: Number(value.toFixed(2)),
    unit: key === "ndwi" ? "" : "",
    trend: value > prev + 0.015 ? "up" : value < prev - 0.015 ? "down" : "flat",
    color,
    helper,
  });

  return {
    samples,
    indexes: [
      make("ndvi", "NDVI", latest.ndvi, previous.ndvi, "#2f855a", "Mức xanh và sinh trưởng của thảm thực vật"),
      make("evi", "EVI", latest.evi, previous.evi, "#2563eb", "Khả năng quang hợp của tán cây"),
      make("gndvi", "GNDVI", latest.gndvi, previous.gndvi, "#0f766e", "Chỉ số liên quan đến hàm lượng diệp lục"),
      make("savi", "SAVI", latest.savi, previous.savi, "#ca8a04", "Mức xanh đã hiệu chỉnh ảnh hưởng đất trống"),
      make("ndwi", "NDWI", latest.ndwi, previous.ndwi, "#0ea5e9", "Mức độ ẩm và nước bề mặt tương đối"),
    ] as VegetationIndexSeries[],
  };
}
