"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import InteractiveAreaEditor from "../../tao-o/interactive-area-editor";

type AreaType = "cropping" | "grazing" | "hay" | "resting" | "nguon_nuoc" | "phuong_tien" | "chan_nuoi" | "dung_cu" | "nha_kho";

type InitialData = {
  id: string;
  code: string;
  name: string;
  status: "healthy" | "warning" | "critical" | "cancelled";
  metadata: {
    areaType: string;
    usage: string;
    soilType: string;
    waterSource: string;
    manager: string;
    plantingStatus: string;
    notes: string;
    areaColor: string;
    thong_so_theo_loai?: Record<string, unknown>;
  };
  geo: { lat: number; lng: number; polygon: Array<{ lat: number; lng: number }> };
};

const typeMeta: Record<AreaType, { label: string; color: string; usage: string }> = {
  cropping: { label: "Trồng trọt", color: "#2e7d32", usage: "Trồng trọt" },
  grazing: { label: "Chăn thả", color: "#43a047", usage: "Chăn thả" },
  hay: { label: "Cỏ khô", color: "#c48a00", usage: "Cỏ khô" },
  resting: { label: "Nghỉ đất", color: "#8d6e63", usage: "Nghỉ đất" },
  nguon_nuoc: { label: "Nguồn nước", color: "#1e88e5", usage: "Nguồn nước" },
  phuong_tien: { label: "Phương tiện", color: "#546e7a", usage: "Phương tiện" },
  chan_nuoi: { label: "Chăn nuôi", color: "#fb8c00", usage: "Chăn nuôi" },
  dung_cu: { label: "Dụng cụ", color: "#8e24aa", usage: "Dụng cụ" },
  nha_kho: { label: "Nhà kho", color: "#6d4c41", usage: "Nhà kho" },
};

const toAreaType = (v: string): AreaType => (Object.keys(typeMeta).includes(v) ? (v as AreaType) : "cropping");
const toStatus = (v: string) => (v.includes("Sửa") ? "sua_chua" : v.includes("Tạm") ? "tam_dung" : "dang_hoat_dong");

export default function AreaEditWorkbench({ initialData }: { initialData: InitialData }) {
  const router = useRouter();
  const [name, setName] = useState(initialData.name);
  const [areaType, setAreaType] = useState<AreaType>(toAreaType(initialData.metadata.areaType));
  const [soilType, setSoilType] = useState(initialData.metadata.soilType);
  const [waterSource, setWaterSource] = useState(initialData.metadata.waterSource);
  const [manager, setManager] = useState(initialData.metadata.manager);
  const [desc, setDesc] = useState(initialData.metadata.notes);
  const [status, setStatus] = useState(toStatus(initialData.metadata.plantingStatus));
  const [areaColor, setAreaColor] = useState(initialData.metadata.areaColor || typeMeta.cropping.color);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [msg, setMsg] = useState("");
  const [g, setG] = useState({ areaHa: 0.001, perimeterM: 0, centroidLat: initialData.geo.lat, centroidLng: initialData.geo.lng, pointCount: Math.max(3, initialData.geo.polygon.length), polygon: initialData.geo.polygon, bounds: { south: initialData.geo.lat, west: initialData.geo.lng, north: initialData.geo.lat, east: initialData.geo.lng } });

  const plantingStatusLabel = useMemo(() => (status === "sua_chua" ? "Sửa chữa" : status === "tam_dung" ? "Tạm dừng" : "Đang hoạt động"), [status]);

  const handleCancelArea = async () => {
    const ok = window.confirm("Bạn có chắc muốn hủy khu vực này? Khu vực sẽ không hiển thị trên bản đồ nhưng vẫn lưu trong CSDL.");
    if (!ok) return;

    setCancelling(true);
    setMsg("");
    try {
      const rs = await fetch("/api/map/zones", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initialData.id }),
      });
      const data = await rs.json();
      if (!rs.ok) return setMsg(`❌ ${data?.message || "Không thể hủy khu vực"}`);
      setMsg("✅ Đã hủy khu vực. Đang chuyển về danh sách...");
      setTimeout(() => router.push("/home-2/ban-do/quan-ly-o?trang_thai=huy"), 700);
    } catch {
      setMsg("❌ Không thể kết nối để hủy khu vực.");
    } finally {
      setCancelling(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setMsg("❌ Tên khu vực không được để trống.");
    if (!Array.isArray(g.polygon) || g.polygon.length < 3) return setMsg("❌ Khu vực cần ít nhất 3 điểm.");

    setSaving(true);
    setMsg("");
    try {
      const body = {
        id: initialData.id,
        code: initialData.code,
        name: name.trim(),
        status: initialData.status,
        occupancy: 70,
        coverage: `${g.areaHa.toFixed(2)} ha`,
        geo: { lat: g.centroidLat, lng: g.centroidLng, latSpan: Math.max(0.0002, g.bounds.north - g.bounds.south), lngSpan: Math.max(0.0002, g.bounds.east - g.bounds.west), polygon: g.polygon, bounds: g.bounds },
        metadata: {
          areaHecta: Number(g.areaHa.toFixed(4)), usage: typeMeta[areaType].usage, soilType, waterSource, manager,
          plantingStatus: plantingStatusLabel, priority: "medium", notes: desc, farmType: areaType === "chan_nuoi" || areaType === "grazing" ? "cattle" : "crop",
          shapeRatio: 1.2, rotationDeg: 0, areaType, areaColor, area_color: areaColor, thong_so_theo_loai: initialData.metadata.thong_so_theo_loai ?? {},
        },
        resources: [],
      };

      const rs = await fetch("/api/map/zones", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await rs.json();
      if (!rs.ok) return setMsg(`❌ ${data?.message || "Cập nhật thất bại"}`);
      setMsg("✅ Cập nhật khu vực thành công. Đang chuyển về chi tiết...");
      setTimeout(() => router.push(`/home-2/ban-do/quan-ly-o/${initialData.id}`), 800);
    } catch {
      setMsg("❌ Không thể kết nối để cập nhật.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="area-header-card"><h1>Chỉnh sửa khu vực</h1><div className="area-header-actions"><a href={`/home-2/ban-do/quan-ly-o/${initialData.id}`} className="area-link-btn">← Quay lại chi tiết</a><button type="button" className="area-link-btn" onClick={handleCancelArea} disabled={cancelling || saving}>{cancelling ? "Đang hủy..." : "Hủy khu vực"}</button><button type="submit" form="area-edit-form" className="primary" disabled={cancelling || saving}>Lưu cập nhật</button></div></section>
      <form id="area-edit-form" onSubmit={handleSave}>
        <section className="area-editor-layout">
          <article className="area-editor-map-card"><h2>Biên dạng khu vực</h2><InteractiveAreaEditor lat={initialData.geo.lat} lng={initialData.geo.lng} zoomLevel={18} overlayColor={areaColor || typeMeta[areaType].color} initialPolygon={initialData.geo.polygon} onGeometryChange={setG} /></article>
          <aside className="area-editor-info-card">
            <h3>Thông tin chỉnh sửa</h3>
            <label>Tên khu vực<input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>Loại khu vực<select value={areaType} onChange={(e) => setAreaType(e.target.value as AreaType)}>{Object.entries(typeMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
            <label>Màu khu vực<input type="color" value={areaColor} onChange={(e) => setAreaColor(e.target.value)} /></label>
            <label>Trạng thái<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="dang_hoat_dong">Đang hoạt động</option><option value="sua_chua">Sửa chữa</option><option value="tam_dung">Tạm dừng</option></select></label>
            <label>Loại đất<input value={soilType} onChange={(e) => setSoilType(e.target.value)} /></label>
            <label>Nguồn nước<input value={waterSource} onChange={(e) => setWaterSource(e.target.value)} /></label>
            <label>Quản lý<input value={manager} onChange={(e) => setManager(e.target.value)} /></label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Ghi chú vận hành" />
            <p><strong>Diện tích:</strong> {g.areaHa.toFixed(3)} ha · <strong>Chu vi:</strong> {Math.round(g.perimeterM)} m · <strong>Số đỉnh:</strong> {g.pointCount}</p>
            {saving && <p>Đang cập nhật khu vực...</p>}
            {!!msg && <p>{msg}</p>}
          </aside>
        </section>
      </form>
    </>
  );
}
