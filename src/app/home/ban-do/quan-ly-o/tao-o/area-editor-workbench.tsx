"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import InteractiveAreaEditor from "./interactive-area-editor";

type Props = { lat: number; lng: number; zoomLevel: number; boundaryScale: number; farmArea: number };
type AreaType = "cropping" | "grazing" | "hay" | "resting" | "nguon_nuoc" | "phuong_tien" | "chan_nuoi" | "dung_cu" | "nha_kho";
type MetricKey = "NDVI" | "EVI" | "NDMI" | "NDWI" | "SAVI" | "NDSI";
type PlantingStatus = "dang_hoat_dong" | "sua_chua" | "tam_dung";

const typeMeta: Record<AreaType, { label: string; color: string; icon: string; usage: string }> = {
  cropping: { label: "Trồng trọt", color: "#2e7d32", icon: "🌱", usage: "Trồng trọt" },
  grazing: { label: "Chăn thả", color: "#43a047", icon: "🐄", usage: "Chăn thả" },
  hay: { label: "Cỏ khô", color: "#c48a00", icon: "🌾", usage: "Cỏ khô" },
  resting: { label: "Nghỉ đất", color: "#8d6e63", icon: "🟫", usage: "Nghỉ đất" },
  nguon_nuoc: { label: "Nguồn nước", color: "#1e88e5", icon: "💧", usage: "Nguồn nước" },
  phuong_tien: { label: "Phương tiện", color: "#546e7a", icon: "🚜", usage: "Phương tiện" },
  chan_nuoi: { label: "Chăn nuôi", color: "#fb8c00", icon: "🐄", usage: "Chăn nuôi" },
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

const clamp = (v: number, min = 0.2, max = 0.9) => Math.min(max, Math.max(min, v));
const asNum = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value.trim());

export default function AreaEditorWorkbench({ lat, lng, zoomLevel }: Props) {
  const [areaType, setAreaType] = useState<AreaType>("cropping");
  const [name, setName] = useState("Khu vực A-01");
  const [status, setStatus] = useState<PlantingStatus>("dang_hoat_dong");
  const [cropType, setCropType] = useState("Lúa ST25");
  const [soilType, setSoilType] = useState(worldSoilTypesVi[0]);
  const [waterSource, setWaterSource] = useState("Tưới nhỏ giọt");
  const [manager, setManager] = useState("Tổ đội 1");
  const [desc, setDesc] = useState("Theo dõi vệ tinh mỗi 8 ngày.");
  const [areaColor, setAreaColor] = useState(typeMeta.cropping.color);
  const [sucChuaToiDa, setSucChuaToiDa] = useState("100");
  const [dungCuChinh, setDungCuChinh] = useState("Bộ dụng cụ tiêu chuẩn");
  const [nhietDoBaoQuan, setNhietDoBaoQuan] = useState("18");
  const [doAmBaoQuan, setDoAmBaoQuan] = useState("65");
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
    setAreaColor(typeMeta[areaType].color);
  }, [areaType]);

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

  const trendLabels = ["11 Th3", "13 Th3", "15 Th3", "17 Th3", "19 Th3", "Hiện tại"];
  const chartWidth = 700;
  const chartHeight = 220;
  const chartLeft = 40;
  const chartRight = 20;
  const chartTop = 16;
  const chartBottom = 172;
  const yMin = 0.2;
  const yMax = 0.9;
  const chartStepX = (chartWidth - chartLeft - chartRight) / Math.max(trendLabels.length - 1, 1);
  const [hoverIndex, setHoverIndex] = useState<number | null>(trendLabels.length - 1);

  const trendSeries = useMemo(() => {
    const makeLine = (base: number, shift: number) => [
      clamp(base - 0.06 + shift),
      clamp(base - 0.02 + shift),
      clamp(base + 0.01 + shift),
      clamp(base + 0.04 + shift),
      clamp(base + 0.02 + shift),
      clamp(base + shift),
    ];
    return [
      { key: "NDVI", color: "#1d4ed8", vals: makeLine(metrics.NDVI, 0) },
      { key: "EVI", color: "#0f766e", vals: makeLine(metrics.EVI, 0.01) },
      { key: "NDMI", color: "#f59e0b", vals: makeLine(metrics.NDMI, -0.01) },
      { key: "NDWI", color: "#ef4444", vals: makeLine(metrics.NDWI, -0.02) },
      { key: "SAVI", color: "#7c3aed", vals: makeLine(metrics.SAVI, 0) },
      { key: "NDSI", color: "#0ea5e9", vals: makeLine(metrics.NDSI, 0.02) },
    ];
  }, [metrics]);

  const yAt = (value: number) => chartBottom - ((value - yMin) / (yMax - yMin)) * (chartBottom - chartTop);

  const handleChartMove = (clientX: number, box: DOMRect) => {
    const x = clientX - box.left;
    const idx = Math.round((x / Math.max(box.width, 1)) * (trendLabels.length - 1));
    setHoverIndex(Math.max(0, Math.min(trendLabels.length - 1, idx)));
  };

  const handleSave = async (e?: FormEvent) => {
    e?.preventDefault();
    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName) {
      setSaveMsg("❌ Tên khu vực không được để trống.");
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
        setSaveMsg("❌ Tên khu vực đã tồn tại. Vui lòng đặt tên khác.");
        setSaving(false);
        return;
      }

      const plantingStatusLabel = plantingStatusOptions.find((s) => s.value === status)?.label ?? "Đang hoạt động";
      const finalAreaColor = isHexColor(areaColor) ? areaColor : meta.color;
      const thongSoTheoLoai =
        areaType === "nha_kho"
          ? {
              loai_khu_vuc: "nha_kho",
              loai_hang_luu_tru: cropType.trim(),
              suc_chua_luu_kho: Math.max(0, Math.round(asNum(sucChuaToiDa, 0))),
              don_vi_suc_chua: "don_vi",
              nhiet_do_bao_quan_c: asNum(nhietDoBaoQuan, 0),
              do_am_bao_quan_pct: asNum(doAmBaoQuan, 0),
              hinh_thuc_luu_tru: "trong_nha",
              muc_do_thong_gio: "trung_binh",
            }
          : areaType === "dung_cu"
            ? {
                loai_khu_vuc: "dung_cu",
                nhom_dung_cu: cropType.trim(),
                dung_cu_chinh: dungCuChinh.trim(),
                tan_suat_su_dung: "hang_ngay",
                chu_ky_bao_tri_ngay: 30,
                khu_vuc_luu_tru: "kho_dung_cu",
              }
            : areaType === "phuong_tien"
              ? {
                  loai_khu_vuc: "phuong_tien",
                  loai_phuong_tien: cropType.trim(),
                  suc_chua_toi_da: Math.max(0, Math.round(asNum(sucChuaToiDa, 0))),
                  don_vi_suc_chua: "kg",
                  nhien_lieu_chinh: "dien",
                  tan_suat_hoat_dong: "hang_ngay",
                }
              : areaType === "chan_nuoi"
                ? {
                    loai_khu_vuc: "chan_nuoi",
                    giong_vat_nuoi: cropType.trim(),
                    suc_chua_toi_da: Math.max(0, Math.round(asNum(sucChuaToiDa, 0))),
                    nguon_nuoc: waterSource.trim(),
                    hinh_thuc_chan_nuoi: "ban_chan_tha",
                    mat_do_chan_nuoi_con_m2: 1,
                  }
                : areaType === "nguon_nuoc"
                  ? {
                      loai_khu_vuc: "nguon_nuoc",
                      kieu_nguon_nuoc: cropType.trim() || "ho_chua",
                      chat_luong_nguon_nuoc: "dat",
                      luu_luong_m3_ngay: 0,
                      phuong_thuc_cap_nuoc: "tu_nhien",
                    }
                  : {
                      loai_khu_vuc: areaType,
                      thong_so_chinh: cropType.trim(),
                      loai_dat: soilType,
                      nguon_nuoc: waterSource.trim(),
                      mua_vu_chinh: "quanh_nam",
                      muc_tieu_san_xuat: "thuong_pham",
                    };
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
          areaHecta: Number(safeGeo.areaHa.toFixed(4)),
          usage: meta.usage,
          soilType,
          waterSource,
          manager,
          plantingStatus: plantingStatusLabel,
          priority: "medium",
          notes: `${desc} | Loại: ${meta.label}`,
          areaType,
          areaColor: finalAreaColor,
          area_color: finalAreaColor,
          farmType: areaType === "chan_nuoi" || areaType === "grazing" ? "cattle" : "crop",
          shapeRatio: 1.2,
          rotationDeg: 0,
          thong_so_theo_loai: thongSoTheoLoai,
          NDVI: Number(metrics.NDVI.toFixed(2)),
          EVI: Number(metrics.EVI.toFixed(2)),
          NDMI: Number(metrics.NDMI.toFixed(2)),
          NDWI: Number(metrics.NDWI.toFixed(2)),
          SAVI: Number(metrics.SAVI.toFixed(2)),
          NDSI: Number(metrics.NDSI.toFixed(2)),
        },
        resources: [{ id: "m1", type: "metric", name: "vệ tinh", status: "online", lastSeen: new Date().toISOString(), quantity: Number(metrics.NDVI.toFixed(2)) }],
      };
      const rs = await fetch("/api/map/zones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await rs.json();
      if (rs.ok) {
        setSaveMsg("");
        setSaveToast("✅ Đã lưu khu vực thành công. Đang chuyển về Quản lý khu vực...");
        setTimeout(() => {
          router.push("/home-2/ban-do/quan-ly-o");
        }, 900);
      } else {
        setSaveMsg(`❌ ${data?.message || "Lưu thất bại"}`);
      }
    } catch {
      setSaveMsg("❌ Không thể kết nối để lưu khu vực.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id="area-create-form" onSubmit={handleSave}>
      <section className="area-editor-layout">
        <article className="area-editor-map-card">
          <h2>Vị trí (vệ tinh)</h2>
          <InteractiveAreaEditor lat={lat} lng={lng} zoomLevel={zoomLevel} overlayColor={isHexColor(areaColor) ? areaColor : meta.color} onGeometryChange={setG} />
        </article>
        <aside className="area-editor-info-card">
          <h3>Thông tin chi tiết khu vực</h3>
          <label>Tên khu vực<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Loại khu vực<select value={areaType} onChange={(e) => setAreaType(e.target.value as AreaType)}><option value="cropping">🌱 Trồng trọt</option><option value="grazing">🐄 Chăn thả</option><option value="hay">🌾 Cỏ khô</option><option value="resting">🟫 Nghỉ đất</option><option value="nguon_nuoc">💧 Nguồn nước</option><option value="phuong_tien">🚜 Phương tiện</option><option value="chan_nuoi">🐄 Chăn nuôi</option><option value="dung_cu">🧰 Dụng cụ</option><option value="nha_kho">🏚️ Nhà kho</option></select></label>
          <label>{areaType === "nha_kho" ? "Loại hàng lưu trữ" : areaType === "phuong_tien" ? "Loại phương tiện" : areaType === "dung_cu" ? "Nhóm dụng cụ" : areaType === "chan_nuoi" ? "Giống vật nuôi" : "Giống/chủng loại"}<input value={cropType} onChange={(e) => setCropType(e.target.value)} required /></label>
          <label>Màu khu vực
            <input type="color" value={isHexColor(areaColor) ? areaColor : meta.color} onChange={(e) => setAreaColor(e.target.value)} />
          </label>
          <label>Trạng thái khu vực
            <select value={status} onChange={(e) => setStatus(e.target.value as PlantingStatus)}>
              {plantingStatusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
          {(areaType === "cropping" || areaType === "grazing" || areaType === "hay" || areaType === "resting") && (
            <label>Loại đất
              <select value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                {worldSoilTypesVi.map((soil) => <option key={soil} value={soil}>{soil}</option>)}
              </select>
            </label>
          )}
          {(areaType === "cropping" || areaType === "grazing" || areaType === "hay" || areaType === "resting" || areaType === "nguon_nuoc" || areaType === "chan_nuoi") && (
            <label>Nguồn nước<input value={waterSource} onChange={(e) => setWaterSource(e.target.value)} required={areaType === "chan_nuoi" || areaType === "nguon_nuoc"} /></label>
          )}
          {(areaType === "chan_nuoi" || areaType === "nha_kho" || areaType === "phuong_tien") && (
            <label>{areaType === "nha_kho" ? "Sức chứa lưu kho (đơn vị)" : "Sức chứa tối đa"}<input value={sucChuaToiDa} onChange={(e) => setSucChuaToiDa(e.target.value)} inputMode="numeric" required /></label>
          )}
          {areaType === "dung_cu" && <label>Dụng cụ chính<input value={dungCuChinh} onChange={(e) => setDungCuChinh(e.target.value)} required /></label>}
          {areaType === "nha_kho" && (
            <>
              <label>Nhiệt độ bảo quản (°C)<input value={nhietDoBaoQuan} onChange={(e) => setNhietDoBaoQuan(e.target.value)} inputMode="decimal" required /></label>
              <label>Độ ẩm bảo quản (%)<input value={doAmBaoQuan} onChange={(e) => setDoAmBaoQuan(e.target.value)} inputMode="decimal" required /></label>
            </>
          )}
          <label>Quản lý<input value={manager} onChange={(e) => setManager(e.target.value)} /></label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Ghi chú" />
          <p><strong>Diện tích:</strong> {safeGeo.areaHa.toFixed(3)} ha · <strong>Chu vi:</strong> {Math.round(safeGeo.perimeterM)} m · <strong>Điểm:</strong> {safeGeo.pointCount}</p>
          {saving && <p>Đang lưu khu vực...</p>}
          {!!saveMsg && <p>{saveMsg}</p>}
        </aside>
      </section>

      {!!saveToast && <div className="area-save-toast">{saveToast}</div>}

      <section className="area-editor-pasture-card">
        <h3>Biểu đồ chỉ số khu vực</h3>
        <div className="area-metrics-strip">{Object.entries(metrics).map(([k, v]) => <span key={k}>{k}: <b>{Number(v).toFixed(2)}</b></span>)}</div>
        <div className="area-chart-legend">{trendSeries.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.key}</span>)}</div>
        <div
          className="area-line-chart-wrap"
          onMouseMove={(e) => handleChartMove(e.clientX, e.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => setHoverIndex(null)}
          onMouseEnter={(e) => handleChartMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        >
          <svg className="area-line-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
            {[0.2, 0.35, 0.5, 0.65, 0.8].map((tick) => (
              <line key={tick} x1={chartLeft} y1={yAt(tick)} x2={chartWidth - chartRight} y2={yAt(tick)} stroke="#d9e4ea" />
            ))}
            {trendLabels.map((lb, i) => (
              <text key={lb} x={chartLeft + i * chartStepX} y={chartHeight - 16} fill="#60727d" fontSize="11" textAnchor="middle">{lb}</text>
            ))}
            {hoverIndex !== null && <line x1={chartLeft + hoverIndex * chartStepX} y1={chartTop} x2={chartLeft + hoverIndex * chartStepX} y2={chartBottom} stroke="#9eb2bf" strokeDasharray="5 4" />}
            {trendSeries.map((s) => (
              <polyline
                key={s.key}
                points={s.vals.map((v, i) => `${chartLeft + i * chartStepX},${yAt(v)}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth="2.4"
              />
            ))}
            {hoverIndex !== null && trendSeries.map((s) => (
              <circle key={`${s.key}-dot`} cx={chartLeft + hoverIndex * chartStepX} cy={yAt(s.vals[hoverIndex])} r="3.6" fill={s.color} stroke="#fff" strokeWidth="1.4" />
            ))}
          </svg>
          {hoverIndex !== null && (
            <div className="area-chart-tooltip" style={{ left: `${((chartLeft + hoverIndex * chartStepX) / chartWidth) * 100}%` }}>
              <strong>{trendLabels[hoverIndex]}</strong>
              {trendSeries.map((s) => <span key={`${s.key}-tip`}><i style={{ background: s.color }} />{s.key}: {s.vals[hoverIndex].toFixed(2)}</span>)}
            </div>
          )}
        </div>
      </section>

    </form>
  );
}

