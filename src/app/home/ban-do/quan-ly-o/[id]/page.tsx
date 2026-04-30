import { db } from "@/lib/db";
import DashboardShell from "@/components/dashboard-shell";
import MapViewSwitcher from "@/components/map-view-switcher";
import AreaIndexTrendChart from "@/components/area-index-trend-chart";
import { layOwnerIdTuServerCookie } from "@/lib/auth";

type OLoai = "cropping" | "grazing" | "hay" | "resting" | "nguon_nuoc" | "phuong_tien" | "chan_nuoi" | "dung_cu" | "nha_kho";
type FarmMapInfo = { farm_name: string; latitude: number | string; longitude: number | string; location_name: string | null };
type ChiSoThamThucVat = { ten: string; ma: string; gia_tri: number; muc: string; mau: string };
type NhatKyNongDuoc = { id: string; ngay_ap_dung: string; gio_bat_dau: string; gio_ket_thuc: string; san_pham: string; thiet_bi: string; lieu_luong: string; dien_tich: string; thoi_gian_cach_ly: string; loai_cay_trong: string; toc_do_gio: string; huong_gio: string; nhiet_do: string; do_am: string; van_hanh: string; giam_sat: string; doi_tuong_ap_dung: string };
type LichSuGhiChu = { id: string; loai: string; ngay: string; noi_dung: string; nguoi_dung: string };
type ChiTietKhuVuc = { id: string; ten: string; loai: string; nhom: OLoai; mo_ta: string; trang_thai: string; dien_tich_ha: number; dien_tich_m2: number; chu_vi_m: number; dien_tich_kha_dung_ha: number | null; vi_tri_ten: string; tam_lat: number; tam_lng: number; ngay_tao: string; ngay_cap_nhat: string; so_ngay_trong_chu_ky: number | null; dse_ngay: number | null; tong_thuc_an_kg_dm: number | null; toc_do_tang_truong: number | null; con_lai_ngay_chan_tha: number | null; thong_so_theo_loai: Record<string, unknown>; polygon: Array<{ lat: number; lng: number }>; chi_so: ChiSoThamThucVat[] };

const nhomInfoMap: Record<OLoai, { label: string; color: string; icon: string }> = {
  cropping: { label: "Trồng trọt", color: "#2e7d32", icon: "🌱" },
  grazing: { label: "Chăn thả", color: "#43a047", icon: "🐄" },
  hay: { label: "Cỏ khô", color: "#c48a00", icon: "🌾" },
  resting: { label: "Nghỉ đất", color: "#8d6e63", icon: "🟫" },
  nguon_nuoc: { label: "Nguồn nước", color: "#1e88e5", icon: "💧" },
  phuong_tien: { label: "Phương tiện", color: "#546e7a", icon: "🚜" },
  chan_nuoi: { label: "Chăn nuôi", color: "#fb8c00", icon: "🐐" },
  dung_cu: { label: "Dụng cụ", color: "#8e24aa", icon: "🧰" },
  nha_kho: { label: "Nhà kho", color: "#6d4c41", icon: "🏚️" },
};

const normalizeText = (v: unknown) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const formatDate = (value: unknown) => (value ? new Date(String(value)).toLocaleDateString("vi-VN") : "-");
const formatDateTime = (value: unknown) => (value ? new Date(String(value)).toLocaleString("vi-VN") : "-");

const detectAreaType = (raw: string): OLoai => {
  if (raw.includes("cropping") || raw.includes("trong trot") || raw.includes("cay trong") || raw.includes("lua") || raw.includes("ke")) return "cropping";
  if (raw.includes("grazing") || raw.includes("chan tha")) return "grazing";
  if (raw.includes("hay") || raw.includes("co kho")) return "hay";
  if (raw.includes("resting") || raw.includes("nghi dat")) return "resting";
  if (raw.includes("nguon nuoc") || raw.includes("water")) return "nguon_nuoc";
  if (raw.includes("phuong tien") || raw.includes("vehicle")) return "phuong_tien";
  if (raw.includes("chan nuoi") || raw.includes("vat nuoi") || raw.includes("cattle") || raw.includes("livestock")) return "chan_nuoi";
  if (raw.includes("dung cu") || raw.includes("tool")) return "dung_cu";
  if (raw.includes("nha kho") || raw.includes("warehouse")) return "nha_kho";
  return "cropping";
};

async function getLatestFarmMap(ownerId: string): Promise<FarmMapInfo | null> {
  try {
    const result = await db.query(
      `select f.name as farm_name, l.latitude, l.longitude, l.location_name
       from du_lieu.nong_trai f
       join du_lieu.vi_tri_nong_trai l on l.farm_id = f.id
       where f.owner_id = $1
       order by f.created_at desc
       limit 1`,
      [ownerId]
    );
    return (result.rows[0] as FarmMapInfo) || null;
  } catch {
    return null;
  }
}

async function getChiTietKhuVuc(ownerId: string, khuVucId: string): Promise<ChiTietKhuVuc | null> {
  try {
    const rs = await db.query(
      `select dc.id, dc.name, dc.crop_type, dc.grazing_status, dc.status, dc.area_ha, dc.created_at, dc.boundary_geojson, n.name as farm_name, l.location_name
       from du_lieu.dong_chan_tha dc
       join du_lieu.nong_trai n on n.id = dc.farm_id
       left join du_lieu.vi_tri_nong_trai l on l.farm_id = n.id
       where n.owner_id = $1 and dc.id = $2
       order by n.created_at desc
       limit 1`,
      [ownerId, khuVucId]
    );

    const r = rs.rows[0];
    if (!r) return null;

    const b = r.boundary_geojson ?? {};
    const metadata = (b?.metadata ?? {}) as Record<string, unknown>;
    const polygon = Array.isArray(b?.geo?.polygon)
      ? b.geo.polygon.filter((p: any) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))).map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
      : [];

    const rawType = normalizeText(metadata.areaType);
    const fullText = normalizeText([r.crop_type, r.grazing_status, r.status, metadata.usage, metadata.notes, metadata.farmType].join(" "));
    const nhom = rawType ? detectAreaType(rawType) : detectAreaType(fullText);
    const areaHa = Number(r.area_ha ?? metadata.areaHecta ?? 0);
    const chuViM = polygon.length >= 3
      ? Number((polygon.reduce((tong: number, point: { lat: number; lng: number }, index: number) => {
          const next = polygon[(index + 1) % polygon.length];
          const dx = (next.lng - point.lng) * 111320 * Math.cos(((next.lat + point.lat) / 2) * Math.PI / 180);
          const dy = (next.lat - point.lat) * 110540;
          return tong + Math.sqrt(dx * dx + dy * dy);
        }, 0)).toFixed(1))
      : 0;

    const chiSo = ["NDVI", "EVI", "NDMI", "NDWI", "SAVI", "NDSI"]
      .map((ma, idx) => {
        const giaTri = Number(metadata[ma] ?? metadata[ma.toLowerCase()] ?? NaN);
        return Number.isFinite(giaTri)
          ? {
              ten: ma,
              ma,
              gia_tri: giaTri,
              muc: giaTri > 0.65 ? "Rất tốt" : giaTri > 0.5 ? "Tốt" : giaTri > 0.35 ? "Trung bình" : "Thấp",
              mau: ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6"][idx],
            }
          : null;
      })
      .filter(Boolean) as ChiSoThamThucVat[];

    return {
      id: r.id,
      ten: r.name ?? "Khu vực chưa đặt tên",
      loai: String(r.crop_type ?? metadata.usage ?? "Chưa phân loại"),
      nhom,
      mo_ta: String(metadata.notes ?? "Chưa có mô tả cho khu vực này."),
      trang_thai: String(r.status ?? r.grazing_status ?? "Đang theo dõi"),
      dien_tich_ha: areaHa,
      dien_tich_m2: Number((areaHa * 10000).toFixed(0)),
      chu_vi_m: chuViM,
      dien_tich_kha_dung_ha: Number(metadata.usableAreaHa ?? metadata.dien_tich_kha_dung_ha ?? NaN) || null,
      vi_tri_ten: String(r.location_name ?? r.farm_name ?? "Khu vực nông trại"),
      tam_lat: Number(b?.geo?.lat ?? polygon[0]?.lat ?? 10.762622),
      tam_lng: Number(b?.geo?.lng ?? polygon[0]?.lng ?? 106.660172),
      ngay_tao: formatDate(r.created_at),
      ngay_cap_nhat: formatDateTime(r.created_at),
      so_ngay_trong_chu_ky: Number(metadata.daysInCycle ?? NaN) || null,
      dse_ngay: Number(metadata.dsePerDay ?? NaN) || null,
      tong_thuc_an_kg_dm: Number(metadata.feedOnOfferKgDmHa ?? NaN) || null,
      toc_do_tang_truong: Number(metadata.pastureGrowthRateKgHaDay ?? NaN) || null,
      con_lai_ngay_chan_tha: Number(metadata.remainingGrazingDays ?? NaN) || null,
      thong_so_theo_loai: metadata as Record<string, unknown>,
      polygon,
      chi_so: chiSo,
    };
  } catch {
    return null;
  }
}

async function getNhatKyNongDuoc(khuVucId: string): Promise<NhatKyNongDuoc[]> {
  return [];
}

async function getLichSuGhiChu(khuVucId: string): Promise<LichSuGhiChu[]> {
  return [];
}

export const dynamic = "force-dynamic";

function renderMetric(label: string, value: number | null, suffix = "") {
  return (
    <div className="card" style={{ padding: 16 }}>
      <span className="muted">{label}</span>
      <strong>{value === null ? "Chưa có dữ liệu" : `${value.toLocaleString("vi-VN")}${suffix}`}</strong>
    </div>
  );
}

export default async function ChiTietKhuVucPage({ params }: { params: { id: string } }) {
  const ownerId = layOwnerIdTuServerCookie();
  const mapData = ownerId ? await getLatestFarmMap(ownerId) : null;
  const chiTiet = ownerId ? await getChiTietKhuVuc(ownerId, params.id) : null;
  const nhatKy = chiTiet ? await getNhatKyNongDuoc(chiTiet.id) : [];
  const lichSu = chiTiet ? await getLichSuGhiChu(chiTiet.id) : [];
  const farmName = mapData?.farm_name || "KetKat-EcoFarm";
  const nhomInfo = nhomInfoMap[chiTiet?.nhom ?? "cropping"];

  return (
    <DashboardShell farmName={farmName} activePath="/home-2/ban-do/quan-ly-o">
      <div style={{ display: "grid", gap: 18 }}>
        {!chiTiet ? (
          <section className="card" style={{ padding: 24 }}>
            <p className="kicker">Chi tiết khu vực</p>
            <h1 className="section-title">Không tìm thấy dữ liệu khu vực</h1>
            <p className="section-subtitle">Khu vực này chưa tồn tại trong cơ sở dữ liệu hoặc bạn không có quyền truy cập.</p>
            <div style={{ marginTop: 16 }}>
              <a href="/home-2/ban-do/quan-ly-o" className="btn btn-primary">Quay lại danh sách</a>
            </div>
          </section>
        ) : (
          <>
            <section className="card" style={{ padding: 24, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
              <div>
                <p className="kicker">{nhomInfo.icon} {nhomInfo.label}</p>
                <h1 className="section-title">{chiTiet.ten}</h1>
                <p className="section-subtitle">Chi tiết khu vực đang được hiển thị trực tiếp từ dữ liệu hiện có trong cơ sở dữ liệu KetKat-EcoFarm.</p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href="/home-2/ban-do/quan-ly-o" className="btn btn-secondary">Danh sách khu vực</a>
                <a href="/home-2/ban-do" className="btn btn-secondary">Xem bản đồ</a>
                <a href={`/home-2/ban-do/quan-ly-o/${chiTiet.id}/chinh-sua`} className="btn btn-primary">Chỉnh sửa</a>
              </div>
            </section>

            <section className="grid-2">
              <article className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <h2 className="section-title" style={{ fontSize: 24 }}>Thông tin chi tiết</h2>
                  <span className="btn btn-secondary" style={{ minHeight: 34, borderRadius: 999, color: nhomInfo.color, paddingInline: 12 }}>{chiTiet.trang_thai}</span>
                </div>
                <div className="grid-2">
                  <div><span className="muted">Tên khu vực</span><strong>{chiTiet.ten}</strong></div>
                  <div><span className="muted">Loại mục đích</span><strong>{chiTiet.loai}</strong></div>
                  <div><span className="muted">Diện tích</span><strong>{chiTiet.dien_tich_ha.toFixed(3)} ha</strong></div>
                  <div><span className="muted">Diện tích khả dụng</span><strong>{chiTiet.dien_tich_kha_dung_ha === null ? "Chưa có dữ liệu" : `${chiTiet.dien_tich_kha_dung_ha.toFixed(3)} ha`}</strong></div>
                  <div><span className="muted">Chu vi</span><strong>{chiTiet.chu_vi_m.toFixed(1)} m</strong></div>
                  <div><span className="muted">Tọa độ tâm</span><strong>{chiTiet.tam_lat.toFixed(6)}, {chiTiet.tam_lng.toFixed(6)}</strong></div>
                  <div><span className="muted">Vị trí</span><strong>{chiTiet.vi_tri_ten}</strong></div>
                  <div><span className="muted">Cập nhật</span><strong>{chiTiet.ngay_cap_nhat}</strong></div>
                </div>
                <p className="section-subtitle" style={{ marginTop: 16 }}>{chiTiet.mo_ta}</p>
              </article>

              <article className="card" style={{ padding: 20 }}>
                <h2 className="section-title" style={{ fontSize: 24 }}>Vị trí khu vực</h2>
                <p className="section-subtitle">Bản đồ cắt theo polygon của khu vực.</p>
                <div style={{ marginTop: 14 }}>
                  <MapViewSwitcher lat={chiTiet.tam_lat} lng={chiTiet.tam_lng} zoom={18} title={`Bản đồ khu vực ${chiTiet.ten}`} frameClassName="area-overview-canvas" polygon={chiTiet.polygon} fitToPolygon={chiTiet.polygon.length >= 3} hideEcoNote />
                </div>
              </article>
            </section>

            <section className="card" style={{ padding: 20 }}>
              <h2 className="section-title" style={{ fontSize: 24 }}>Chỉ số thảm thực vật</h2>
              {chiTiet.chi_so.length > 0 ? (
                <div className="grid-3" style={{ marginTop: 14 }}>
                  {chiTiet.chi_so.map((item) => (
                    <article key={item.ma} className="card" style={{ padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div><span className="muted">{item.ten}</span><strong>{item.ma}</strong></div>
                        <strong style={{ color: item.mau }}>{item.gia_tri.toFixed(2)}</strong>
                      </div>
                      <div className="muted" style={{ marginTop: 6 }}>{item.muc}</div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="section-subtitle">Khu vực này chưa có chỉ số NDVI/EVI/NDMI/NDWI/SAVI/NDSI được lưu trong metadata.</p>
              )}
              {chiTiet.chi_so.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <AreaIndexTrendChart series={chiTiet.chi_so.map((i) => ({ key: i.ma, label: i.ma, color: i.mau, value: i.gia_tri }))} seed={`${chiTiet.id}-${chiTiet.ngay_tao}`} />
                </div>
              )}
            </section>

            <section className="grid-2">
              <article className="card" style={{ padding: 20 }}>
                <h2 className="section-title" style={{ fontSize: 24 }}>Quản lý thảm thực vật và chăn thả</h2>
                <div className="grid-2" style={{ marginTop: 14 }}>
                  {renderMetric("Số ngày trong chu kỳ", chiTiet.so_ngay_trong_chu_ky)}
                  {renderMetric("Tải trọng DSE/ngày", chiTiet.dse_ngay)}
                  {renderMetric("Thức ăn sẵn có", chiTiet.tong_thuc_an_kg_dm, " kg DM/ha")}
                  {renderMetric("Tăng trưởng thảm thực vật", chiTiet.toc_do_tang_truong, " kg/ha/ngày")}
                  {renderMetric("Ngày chăn thả còn lại", chiTiet.con_lai_ngay_chan_tha)}
                  {renderMetric("Diện tích khả dụng", chiTiet.dien_tich_kha_dung_ha, " ha")}
                </div>
              </article>
              <article className="card" style={{ padding: 20 }}>
                <h2 className="section-title" style={{ fontSize: 24 }}>Thông số theo loại</h2>
                <div className="grid-2" style={{ marginTop: 14 }}>
                  {Object.entries(chiTiet.thong_so_theo_loai).slice(0, 10).map(([key, value]) => (
                    <div key={key}><span className="muted">{key.replaceAll("_", " ")}</span><strong>{String(value)}</strong></div>
                  ))}
                </div>
              </article>
            </section>

            <section className="card" style={{ padding: 20 }}>
              <h2 className="section-title" style={{ fontSize: 24 }}>Nhật ký nông dược</h2>
              {nhatKy.length > 0 ? <p className="section-subtitle">Có dữ liệu nhật ký nông dược cần được chuẩn hóa trong nguồn dữ liệu hiện tại.</p> : <p className="section-subtitle">Chưa có bản ghi nhật ký nông dược cho khu vực này.</p>}
            </section>

            <section className="card" style={{ padding: 20 }}>
              <h2 className="section-title" style={{ fontSize: 24 }}>Lịch sử và ghi chú</h2>
              {lichSu.length > 0 ? <p className="section-subtitle">Có dữ liệu lịch sử/ghi chú cần xử lý riêng trong nguồn hiện tại.</p> : <p className="section-subtitle">Chưa có lịch sử hoặc ghi chú nào cho khu vực này.</p>}
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
