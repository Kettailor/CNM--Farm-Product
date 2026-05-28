"use client";

import { useCallback, useMemo, useState } from "react";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import type { ToolbarAction } from "@/components/dashboard-map-tool-icons";
import styles from "./zone-create-wizard.module.css";

type InitialLocation = {
  farmName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
};

type ZoneKind = "pasture" | "cropping" | "storage" | "parking";
type ZoneState = "đang hoạt động" | "bản nháp" | "ngừng hoạt động" | "bảo trì" | "đã ngừng" | "dự kiến" | "hoàn thành" | "đã hủy";
type MapType = "vệ tinh" | "đường" | "địa hình";

type Props = {
  ownerId: string;
  initialLocation: InitialLocation | null;
};

type FieldConfig = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number";
  step?: string;
};

type KindConfig = {
  title: string;
  subtitle: string;
  fields: FieldConfig[];
};

type Point = { lat: number; lng: number };

const ZONE_STATES: Array<{ value: ZoneState; label: string }> = [
  { value: "đang hoạt động", label: "Đang hoạt động" },
  { value: "bản nháp", label: "Bản nháp" },
  { value: "dự kiến", label: "Dự kiến" },
  { value: "hoàn thành", label: "Hoàn thành" },
  { value: "bảo trì", label: "Bảo trì" },
  { value: "ngừng hoạt động", label: "Ngừng hoạt động" },
  { value: "đã ngừng", label: "Đã ngừng" },
  { value: "đã hủy", label: "Đã hủy" },
];

const ZONE_KINDS: Array<{ value: ZoneKind; label: string }> = [
  { value: "pasture", label: "Đồng cỏ / chăn nuôi" },
  { value: "cropping", label: "Trồng trọt" },
  { value: "storage", label: "Kho lương thực / kho dụng cụ" },
  { value: "parking", label: "Bãi đỗ xe" },
];

const MAP_TYPES: Array<{ value: MapType; label: string }> = [
  { value: "vệ tinh", label: "Bản đồ vệ tinh" },
  { value: "đường", label: "Bản đồ đường" },
  { value: "địa hình", label: "Bản đồ địa hình" },
];

const COLORS = ["#f43f5e", "#ef4444", "#d946ef", "#8b5cf6", "#3b82f6", "#0ea5e9", "#14b8a6", "#22c55e", "#84cc16", "#eab308", "#f97316", "#b45309", "#6b7280"];

const KIND_CONFIGS: Record<ZoneKind, KindConfig> = {
  pasture: {
    title: "Nhập dữ liệu cho khu vực đồng cỏ / chăn nuôi",
    subtitle: "Chuẩn hóa nhập liệu cho khu vực đồng cỏ hoặc chăn nuôi.",
    fields: [
      { key: "daysEmpty", label: "Số ngày nghỉ cỏ", type: "number", placeholder: "Nhập số ngày nghỉ cỏ" },
      { key: "dseLoad", label: "DSE Load", type: "number", step: "0.01", placeholder: "Nhập DSE Load" },
      { key: "stockingRate", label: "Tỷ lệ chăn thả", type: "number", step: "0.01", placeholder: "Nhập tỷ lệ chăn thả" },
      { key: "feedOnOffer", label: "Thức ăn sẵn có (kg DM/ha)", type: "number", step: "0.01", placeholder: "Nhập lượng thức ăn" },
      { key: "grazingDaysRemaining", label: "Số ngày chăn thả còn lại", type: "number", placeholder: "Nhập số ngày còn lại" },
      { key: "pastureGrowthRate", label: "Tốc độ mọc cỏ", type: "number", step: "0.01", placeholder: "Nhập tốc độ mọc cỏ" },
    ],
  },
  cropping: {
    title: "Nhập dữ liệu cho khu vực trồng trọt",
    subtitle: "Chuẩn hóa nhập liệu cho khu vực canh tác cây trồng.",
    fields: [
      { key: "cropType", label: "Cây trồng", type: "text", placeholder: "Ví dụ: lúa, ngô, rau" },
      { key: "soilPh", label: "pH đất", type: "number", step: "0.01", placeholder: "Nhập pH đất" },
      { key: "soilMoisture", label: "Độ ẩm đất (%)", type: "number", step: "0.01", placeholder: "Nhập độ ẩm đất" },
      { key: "sunHours", label: "Số giờ nắng", type: "number", step: "0.01", placeholder: "Nhập số giờ nắng" },
    ],
  },
  storage: {
    title: "Nhập dữ liệu cho khu vực kho bãi",
    subtitle: "Chuẩn hóa nhập liệu cho khu vực lưu trữ nông sản, vật tư hoặc thiết bị.",
    fields: [
      { key: "storageType", label: "Loại lưu trữ", type: "text", placeholder: "Ví dụ: nông sản, thức ăn, vật tư" },
      { key: "capacity", label: "Sức chứa", type: "number", step: "0.01", placeholder: "Nhập sức chứa" },
      { key: "temperature", label: "Nhiệt độ vận hành", type: "number", step: "0.01", placeholder: "Nhập nhiệt độ" },
      { key: "notes", label: "Ghi chú kho", type: "text", placeholder: "Ghi chú thêm" },
    ],
  },
  parking: {
    title: "Nhập dữ liệu cho khu vực bãi đỗ xe",
    subtitle: "Chuẩn hóa nhập liệu cho khu vực đỗ xe, máy móc hoặc thiết bị.",
    fields: [
      { key: "parkingType", label: "Loại bãi đỗ", type: "text", placeholder: "Ví dụ: xe tải, máy kéo" },
      { key: "capacity", label: "Sức chứa", type: "number", step: "0.01", placeholder: "Nhập sức chứa" },
      { key: "surface", label: "Bề mặt", type: "text", placeholder: "Ví dụ: bê tông, đất nện" },
      { key: "notes", label: "Ghi chú", type: "text", placeholder: "Ghi chú thêm" },
    ],
  },
};

const calcAreaHa = (points: Point[]) => {
  if (points.length < 3) return 0;
  const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((avgLat * Math.PI) / 180);
  const pts = points.map((p) => ({ x: p.lng * mPerDegLng, y: p.lat * mPerDegLat }));
  let area = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(area / 2) / 10000;
};

const calcPerimeterM = (points: Point[]) => {
  if (points.length < 2) return 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dist = (a: Point, b: Point) => {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  return points.reduce((sum, point, index) => sum + dist(point, points[(index + 1) % points.length]), 0);
};

export default function ZoneCreateWizard({ initialLocation }: Props) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [activeTool, setActiveTool] = useState<ToolbarAction | null>(null);
  const [form, setForm] = useState({
    name: "",
    state: "đang hoạt động" as ZoneState,
    kind: "pasture" as ZoneKind,
    description: "",
    latitude: String(initialLocation?.latitude ?? 10.762622),
    longitude: String(initialLocation?.longitude ?? 106.660172),
    locationName: initialLocation?.locationName ?? initialLocation?.farmName ?? "",
    daysEmpty: "",
    dseLoad: "",
    stockingRate: "",
    feedOnOffer: "",
    grazingDaysRemaining: "",
    pastureGrowthRate: "",
    cropType: "",
    soilPh: "",
    soilMoisture: "",
    sunHours: "",
    storageType: "",
    capacity: "",
    temperature: "",
    parkingType: "",
    surface: "",
    notes: "",
    preferredColor: "#22c55e",
    mapType: "vệ tinh" as MapType,
    zoomLevel: "15",
  });

  const kindConfig = KIND_CONFIGS[form.kind];
  const kindFields = kindConfig.fields;
  const areaHa = calcAreaHa(points);
  const perimeterM = calcPerimeterM(points);
  const canSave = form.name.trim().length > 0 && points.length >= 3;

  const onMapClick = useCallback((p: Point) => {
    if (activeTool !== "add") return;
    setPoints((prev) => [...prev, p]);
  }, [activeTool]);

  const onToolbarAction = useCallback((action: ToolbarAction) => {
    if (action === "add") {
      setActiveTool((prev) => (prev === "add" ? null : "add"));
      return;
    }
    if (action === "undo") setPoints((prev) => prev.slice(0, -1));
    if (action === "clear") setPoints([]);
  }, []);

  const mapPreview = useMemo(() => (
    <MapViewSwitcher
      lat={Number(form.latitude) || 10.762622}
      lng={Number(form.longitude) || 106.660172}
      zoom={Number(form.zoomLevel) || 15}
      title="Bản đồ khu vực"
      initialMode={form.mapType === "vệ tinh" ? "satellite" : form.mapType === "đường" ? "roadmap" : "terrain"}
      frameClassName="farm-map-canvas"
      polygon={points}
      fitToPolygon={points.length >= 3}
      showToolbar
      toolbarAboveMap
      activeTool={activeTool}
      onToolbarAction={onToolbarAction}
      onMapClick={onMapClick}
    />
  ), [activeTool, form.latitude, form.longitude, form.mapType, form.zoomLevel, onMapClick, onToolbarAction, points]);

  const onNext = () => {
    setError("");
    if (step === 1 && !form.name.trim()) return setError("Vui lòng nhập tên khu vực.");
    if (step === 2 && points.length < 3) return setError("Vui lòng chọn ít nhất 3 điểm để tạo polygon.");
    setStep((s) => Math.min(5, s + 1));
  };

  const onBack = () => setStep((s) => Math.max(1, s - 1));
  const buildExtraPayload = () => { const extra: Record<string, string> = {}; kindFields.forEach((field) => { const value = (form as Record<string, string>)[field.key]; if (value?.trim()) extra[field.key] = value.trim(); }); return extra; };
  const onSave = async () => {
    if (!canSave) return setError("Vui lòng nhập đầy đủ thông tin bắt buộc.");
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/du-lieu/khu-vuc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name.trim(), status: form.state, kind: form.kind, categoryId: null, description: form.description.trim() || undefined, areaHa: String(areaHa || ""), perimeterM: String(perimeterM || ""), latitude: form.latitude, longitude: form.longitude, color: form.preferredColor, points, extra: buildExtraPayload() }) });
      const data = (await res.json()) as { message?: string; nextPath?: string };
      if (!res.ok) return setError(data.message || "Không thể lưu khu vực.");
      window.location.href = data.nextPath || "/dashboard/khu-vuc";
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = ["Thông tin cơ bản", "Tạo polygon trên bản đồ", kindConfig.title, "Thiết lập bổ sung", "Xác nhận và lưu"][step - 1];
  const stepSubtitle = ["Nhập tên, loại và trạng thái khu vực.", "Bấm vào bản đồ để thêm các điểm tạo thành polygon. Hệ thống sẽ tự tính diện tích và chu vi.", kindConfig.subtitle, "Tùy chỉnh màu sắc, bản đồ và thông số hiển thị.", "Kiểm tra lại toàn bộ dữ liệu trước khi lưu."][step - 1];

  return (
    <section className={styles.overlay} aria-label="Tạo khu vực mới">
      <header className={styles.header}><h1>Tạo khu vực mới</h1><button type="button" className={styles.close} aria-label="Đóng">×</button></header>
      <div className={styles.body}>
        <div className={styles.stepHead}><div className={styles.stepBadge}>{step} / 5</div><div className={styles.stepMeta}><h2>{stepTitle}</h2><p>{stepSubtitle}</p></div></div>
        {step === 1 && <div className={styles.formGrid}><div className={styles.field}><label>Tên khu vực <small>*</small></label><input className={styles.input} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nhập tên khu vực" /></div><div className={styles.twoCols}><div className={styles.field}><label>Trạng thái khu vực <small>*</small></label><select className={styles.select} value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value as ZoneState }))}>{ZONE_STATES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div><div className={styles.field}><label>Loại khu vực <small>*</small></label><select className={styles.select} value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as ZoneKind }))}>{ZONE_KINDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></div><div className={styles.field}><label>Mô tả <small>(không bắt buộc)</small></label><textarea className={styles.textarea} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Mô tả thêm về khu vực" /></div></div>}
        {step === 2 && <div className={styles.formGrid}><div className={styles.summaryCard}><h3>Hướng dẫn vẽ polygon</h3><div className={styles.summaryItem}><span>Cách dùng:</span><strong>Bật nút Thêm điểm ở thanh công cụ trong bản đồ rồi bấm lên bản đồ để tạo các đỉnh polygon.</strong></div><div className={styles.summaryItem}><span>Số điểm hiện tại:</span><strong>{points.length}</strong></div><div className={styles.summaryItem}><span>Diện tích:</span><strong>{areaHa > 0 ? `${areaHa.toFixed(2)} ha` : "—"}</strong></div><div className={styles.summaryItem}><span>Chu vi:</span><strong>{perimeterM > 0 ? `${perimeterM.toFixed(0)} m` : "—"}</strong></div></div><div className={styles.field}><label>Địa điểm</label><input className={styles.input} value={form.locationName} onChange={(e) => setForm((p) => ({ ...p, locationName: e.target.value }))} placeholder="Tên địa điểm" /></div><div className={styles.twoCols}><div className={styles.field}><label>Vĩ độ trung tâm</label><input className={styles.input} value={form.latitude} onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))} /></div><div className={styles.field}><label>Kinh độ trung tâm</label><input className={styles.input} value={form.longitude} onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))} /></div></div><div className={styles.mapBox}>{mapPreview}</div></div>}
        {step === 3 && <div className={styles.formGrid}><div className={styles.twoCols}>{kindFields.map((field) => <div key={field.key} className={styles.field}><label>{field.label}</label><input className={styles.input} type={field.type ?? "text"} step={field.step} placeholder={field.placeholder} value={(form as Record<string, string>)[field.key]} onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))} /></div>)}</div></div>}
        {step === 4 && <div className={styles.formGrid}><div className={styles.field}><label>Màu hiển thị <small>(không bắt buộc)</small></label><div className={styles.colorRow}>{COLORS.map((color) => <button key={color} type="button" className={styles.colorSwatch} style={{ background: color, outline: form.preferredColor === color ? "2px solid #0f172a" : "none" }} onClick={() => setForm((p) => ({ ...p, preferredColor: color }))} aria-label={`Chọn màu ${color}`} />)}</div></div><div className={styles.twoCols}><div className={styles.field}><label>Loại bản đồ</label><select className={styles.select} value={form.mapType} onChange={(e) => setForm((p) => ({ ...p, mapType: e.target.value as MapType }))}>{MAP_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div><div className={styles.field}><label>Mức thu phóng</label><select className={styles.select} value={form.zoomLevel} onChange={(e) => setForm((p) => ({ ...p, zoomLevel: e.target.value }))}>{Array.from({ length: 12 }, (_, i) => 10 + i).map((level) => <option key={level} value={String(level)}>{level}</option>)}</select></div></div></div>}
        {step === 5 && <div className={styles.summary}><div className={styles.summaryCard}><h3>Thông tin cơ bản</h3><div className={styles.summaryItem}><span>Tên khu vực:</span><strong>{form.name}</strong></div><div className={styles.summaryItem}><span>Trạng thái:</span><strong>{ZONE_STATES.find((s) => s.value === form.state)?.label}</strong></div><div className={styles.summaryItem}><span>Loại khu vực:</span><strong>{ZONE_KINDS.find((s) => s.value === form.kind)?.label}</strong></div></div><div className={styles.summaryCard}><h3>Polygon & vị trí</h3><div className={styles.summaryItem}><span>Số điểm:</span><strong>{points.length}</strong></div><div className={styles.summaryItem}><span>Diện tích:</span><strong>{areaHa > 0 ? `${areaHa.toFixed(2)} ha` : "—"}</strong></div><div className={styles.summaryItem}><span>Chu vi:</span><strong>{perimeterM > 0 ? `${perimeterM.toFixed(0)} m` : "—"}</strong></div></div><div className={styles.summaryCard}><h3>Dữ liệu theo loại</h3>{kindFields.map((field) => <div key={field.key} className={styles.summaryItem}><span>{field.label}:</span><strong>{(form as Record<string, string>)[field.key] || "—"}</strong></div>)}</div><div className={styles.summaryCard}><h3>Thiết lập bổ sung</h3><div className={styles.summaryItem}><span>Màu hiển thị:</span><strong>{form.preferredColor}</strong></div><div className={styles.summaryItem}><span>Loại bản đồ:</span><strong>{form.mapType}</strong></div><div className={styles.summaryItem}><span>Mức thu phóng:</span><strong>{form.zoomLevel}</strong></div><div className={styles.summaryItem}><span>Mô tả:</span><strong>{form.description || "—"}</strong></div></div></div>}
        {error && <p style={{ color: "#dc2626", margin: 0 }}>{error}</p>}
      </div>
      <footer className={styles.footer}><button type="button" className={styles.secondary} onClick={onBack} disabled={step === 1}>Quay lại</button>{step < 5 ? <button type="button" className={styles.primary} onClick={onNext}>Tiếp tục</button> : <button type="button" className={styles.primary} onClick={onSave} disabled={loading || !canSave}>{loading ? "Đang lưu..." : "Lưu khu vực"}</button>}</footer>
    </section>
  );
}
