"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import InteractiveAreaEditor from "./interactive-area-editor";

type Props = { lat: number; lng: number; zoomLevel: number; boundaryScale: number; farmArea: number };
type AreaType = "cropping" | "grazing" | "hay" | "resting" | "nguon_nuoc" | "phuong_tien" | "chan_nuoi" | "dung_cu" | "nha_kho";
type MetricKey = "NDVI" | "EVI" | "NDMI" | "NDWI" | "SAVI" | "NDSI";
type PlantingStatus = "dang_hoat_dong" | "sua_chua" | "tam_dung";

const typeMeta: Record<AreaType, { label: string; color: string; icon: string; usage: string }> = {
  cropping: { label: "Cropping (Trồng trọt)", color: "#2e7d32", icon: "🌱", usage: "Cropping" },
  grazing: { label: "Grazing (Chăn thả)", color: "#43a047", icon: "🐄", usage: "Grazing" },
  hay: { label: "Hay (Cỏ khô)", color: "#c48a00", icon: "🌾", usage: "Hay" },
  resting: { label: "Resting (Nghỉ đất)", color: "#8d6e63", icon: "🟫", usage: "Resting" },
  nguon_nuoc: { label: "Nguồn nước", color: "#1e88e5", icon: "💧", usage: "Nguồn nước" },
  phuong_tien: { label: "Phương tiện", color: "#546e7a", icon: "🚜", usage: "Phương tiện" },
  chan_nuoi: { label: "Chăn nuôi", color: "#fb8c00", icon: "🐄", usage: "Vật nuôi" },
  dung_cu: { label: "Dụng cụ", color: "#8e24aa", icon: "🧰", usage: "Dụng cụ" },
  nha_kho: { label: "Nhà kho", color: "#6d4c41", icon: "🏚️", usage: "Nhà kho" },
};

const plantingStatusOptions: Array<{ value: PlantingStatus; label: string }> = [
  { value: "dang_hoat_dong", label: "Đang hoạt động" },
  { value: "sua_chua", label: "Sửa chữa" },
  { value: "tam_dung", label: "Tạm dừng" },
];

const worldSoilTypesVi = [
  "Acrisols (Đất Acrisols - đất chua bạc màu)",
  "Albeluvisols (Đất Albeluvisols)",
  "Alisols (Đất Alisols)",
  "Andosols (Đất Andosols - đất tro núi lửa)",
  "Anthrosols (Đất Anthrosols - đất chịu tác động canh tác lâu dài)",
  "Arenosols (Đất Arenosols - đất cát)",
  "Calcisols (Đất Calcisols - đất tích tụ canxi)",
  "Cambisols (Đất Cambisols - đất biến đổi non)",
  "Chernozems (Đất Chernozems - đất đen mùn)",
  "Cryosols (Đất Cryosols - đất băng giá)",
  "Durisols (Đất Durisols - đất có tầng cứng silica)",
  "Ferralsols (Đất Ferralsols - đất đỏ vàng phong hóa mạnh)",
  "Fluvisols (Đất Fluvisols - đất phù sa)",
  "Gleysols (Đất Gleysols - đất gle hóa ngập nước)",
  "Gypsisols (Đất Gypsisols - đất tích tụ thạch cao)",
  "Histosols (Đất Histosols - đất hữu cơ/than bùn)",
  "Kastanozems (Đất Kastanozems - đất nâu thảo nguyên)",
  "Leptosols (Đất Leptosols - đất tầng mỏng)",
  "Lixisols (Đất Lixisols)",
  "Luvisols (Đất Luvisols)",
  "Nitisols (Đất Nitisols - đất đỏ bazan cấu trúc tốt)",
  "Phaeozems (Đất Phaeozems - đất mùn tối màu)",
  "Planosols (Đất Planosols - đất có tầng cản nước)",
  "Plinthosols (Đất Plinthosols - đất kết von)",
  "Podzols (Đất Podzols - đất podzol hóa)",
  "Regosols (Đất Regosols - đất trẻ)",
  "Solonchaks (Đất Solonchaks - đất mặn)",
  "Solonetz (Đất Solonetz - đất kiềm natri)",
  "Stagnosols (Đất Stagnosols - đất úng tạm thời)",
  "Umbrisols (Đất Umbrisols - đất mùn chua)",
  "Vertisols (Đất Vertisols - đất sét trương nở)",
];

const toSeries = (vals: number[]) => vals.map((v, i) => `${i * 52},${76 - v * 60}`).join(" ");
const asNum = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export default function AreaEditorWorkbench({ lat, lng, zoomLevel, boundaryScale, farmArea }: Props) {
  const [areaType, setAreaType] = useState<AreaType>("cropping");
  const [name, setName] = useState("Ô A-01");
  const [status, setStatus] = useState<PlantingStatus>("dang_hoat_dong");
  const [cropType, setCropType] = useState("Lúa ST25");
  const [soilType, setSoilType] = useState(worldSoilTypesVi[0]);
  const [waterSource, setWaterSource] = useState("Tưới nhỏ giọt");
  const [manager, setManager] = useState("Tổ đội 1");
  const [desc, setDesc] = useState("Theo dõi vệ tinh mỗi 8 ngày.");
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveToast, setSaveToast] = useState("");
  const [g, setG] = useState({
    areaHa: 0.001,
    perimeterM: 1200,
    centroidLat: lat,
    centroidLng: lng,
    pointCount: 6,
    polygon: [] as Array<{ lat: number; lng: number }>,
    bounds: { south: lat - 0.001, west: lng - 0.001, north: lat + 0.001, east: lng + 0.001 },
  });
  const safeGeo = {
    areaHa: asNum(g.areaHa, 0),
    perimeterM: asNum(g.perimeterM, 0),
    centroidLat: asNum(g.centroidLat, lat),
    centroidLng: asNum(g.centroidLng, lng),
    pointCount: Math.max(3, Math.round(asNum(g.pointCount, 6))),
    polygon: Array.isArray(g.polygon) ? g.polygon.filter((p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))) : [],
    bounds: {
      south: asNum(g.bounds?.south, lat - 0.001),
      west: asNum(g.bounds?.west, lng - 0.001),
      north: asNum(g.bounds?.north, lat + 0.001),
      east: asNum(g.bounds?.east, lng + 0.001),
    },
  };
  const [metrics, setMetrics] = useState<Record<MetricKey, number>>({ NDVI: 0.58, EVI: 0.47, NDMI: 0.43, NDWI: 0.31, SAVI: 0.57, NDSI: 0.5 });
  const meta = typeMeta[areaType];

  useEffect(() => {
    const run = async () => {
      try {
        const rs = await fetch(
          `/api/map/area-metrics?lat=${safeGeo.centroidLat}&lng=${safeGeo.centroidLng}&type=${areaType}&polygon=${encodeURIComponent(JSON.stringify(safeGeo.polygon))}`
        );
        const data = await rs.json();
        if (data?.metrics) setMetrics(data.metrics);
      } catch {
        // keep local fallback
      }
    };
    run();
  }, [safeGeo.centroidLat, safeGeo.centroidLng, areaType]);

  const points = useMemo(() => toSeries(Object.values(metrics)), [metrics]);

  const handleSave = async (e?: FormEvent) => {
    e?.preventDefault();
    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName) {
      setSaveMsg("❌ Tên ô không được để trống.");
      return;
    }

    setSaving(true);
    setSaveMsg("");
    try {
      const existsRs = await fetch("/api/map/zones", { cache: "no-store" });
      const existsData = await existsRs.json();
      const duplicated = Array.isArray(existsData?.zones)
        ? existsData.zones.some((z: any) => String(z?.name ?? "").trim().toLowerCase() === normalizedName)
        : false;
      if (duplicated) {
        setSaveMsg("❌ Tên ô đã tồn tại. Vui lòng đặt tên khác.");
        setSaving(false);
        return;
      }

      const plantingStatusLabel = plantingStatusOptions.find((s) => s.value === status)?.label ?? "Đang hoạt động";
      const body = {
        name: name.trim(),
        code: `AREA-${Date.now().toString().slice(-6)}`,
        status: "healthy",
        occupancy: 70,
        coverage: `${safeGeo.areaHa.toFixed(2)} ha`,
        geo: {
          lat: safeGeo.centroidLat,
          lng: safeGeo.centroidLng,
          latSpan: Math.max(0.0002, safeGeo.bounds.north - safeGeo.bounds.south),
          lngSpan: Math.max(0.0002, safeGeo.bounds.east - safeGeo.bounds.west),
          polygon: safeGeo.polygon,
          bounds: safeGeo.bounds,
        },
        metadata: {
          areaHecta: Number(safeGeo.areaHa.toFixed(4)), usage: meta.usage, soilType, waterSource, manager,
          plantingStatus: plantingStatusLabel, priority: "medium", notes: `${desc} | Giống: ${cropType} | Loại: ${meta.label}`,
          areaType, farmType: areaType === "chan_nuoi" || areaType === "grazing" ? "cattle" : "crop", shapeRatio: 1.2, rotationDeg: 0,
        },
        resources: [{ id: "m1", type: "metric", name: "vệ tinh", status: "online", lastSeen: new Date().toISOString(), quantity: Number(metrics.NDVI.toFixed(2)) }],
      };
      const rs = await fetch("/api/map/zones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await rs.json();
      if (rs.ok) {
        setSaveMsg("");
        setSaveToast("✅ Đã lưu ô thành công. Đang chuyển về Quản lý ô...");
        setTimeout(() => {
          router.push("/home-2/ban-do/quan-ly-o");
        }, 900);
      } else {
        setSaveMsg(`❌ ${data?.message || "Lưu thất bại"}`);
      }
    } catch {
      setSaveMsg("❌ Không thể kết nối để lưu ô.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id="area-create-form" onSubmit={handleSave}>
      <section className="area-editor-layout">
        <article className="area-editor-map-card">
          <h2>Vị trí (vệ tinh)</h2>
          <InteractiveAreaEditor lat={lat} lng={lng} zoomLevel={zoomLevel} overlayColor={meta.color} onGeometryChange={setG} />
        </article>
        <aside className="area-editor-info-card">
          <h3>Thông tin chi tiết ô</h3>
          <label>Tên ô<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Loại khu vực<select value={areaType} onChange={(e) => setAreaType(e.target.value as AreaType)}><option value="cropping">🌱 Cropping (Trồng trọt)</option><option value="grazing">🐄 Grazing (Chăn thả)</option><option value="hay">🌾 Hay (Cỏ khô)</option><option value="resting">🟫 Resting (Nghỉ đất)</option><option value="nguon_nuoc">💧 Nguồn nước</option><option value="phuong_tien">🚜 Phương tiện</option><option value="chan_nuoi">🐄 Chăn nuôi</option><option value="dung_cu">🧰 Dụng cụ</option><option value="nha_kho">🏚️ Nhà kho</option></select></label>
          <label>Giống/chủng loại<input value={cropType} onChange={(e) => setCropType(e.target.value)} /></label>
          <label>Trạng thái canh tác
            <select value={status} onChange={(e) => setStatus(e.target.value as PlantingStatus)}>
              {plantingStatusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
          <label>Loại đất
            <select value={soilType} onChange={(e) => setSoilType(e.target.value)}>
              {worldSoilTypesVi.map((soil) => <option key={soil} value={soil}>{soil}</option>)}
            </select>
          </label>
          <label>Nguồn nước<input value={waterSource} onChange={(e) => setWaterSource(e.target.value)} /></label>
          <label>Quản lý<input value={manager} onChange={(e) => setManager(e.target.value)} /></label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Ghi chú" />
          <p><strong>Diện tích:</strong> {safeGeo.areaHa.toFixed(3)} ha · <strong>Chu vi:</strong> {Math.round(safeGeo.perimeterM)} m · <strong>Điểm:</strong> {safeGeo.pointCount}</p>
          {!!saveMsg && <p>{saveMsg}</p>}
        </aside>
      </section>

      {!!saveToast && <div className="area-save-toast">{saveToast}</div>}

      <section className="area-editor-pasture-card">
        <h3>Biểu đồ thông số theo vị trí ô</h3>
        <div className="area-metrics-strip">{Object.entries(metrics).map(([k, v]) => <span key={k}>{k}: <b>{Number(v).toFixed(2)}</b></span>)}</div>
        <svg className="area-line-chart" viewBox="0 0 280 84" preserveAspectRatio="none"><polyline points={points} /></svg>
      </section>

    </form>
  );
}

