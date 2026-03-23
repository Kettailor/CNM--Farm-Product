import { db } from "@/lib/db";
import { cookies } from "next/headers";
import TopbarUserMenu from "@/components/topbar-user-menu";
import MapViewSwitcher from "@/components/map-view-switcher";
import AreaIndexTrendChart from "@/components/area-index-trend-chart";

type OLoai = "cropping" | "grazing" | "hay" | "resting" | "nguon_nuoc" | "phuong_tien" | "chan_nuoi" | "dung_cu" | "nha_kho";

type FarmMapInfo = {
  farm_name: string;
  latitude: number | string;
  longitude: number | string;
  location_name: string | null;
};

type ChiTietKhuVuc = {
  id: string;
  ten: string;
  loai: string;
  nhom: OLoai;
  mo_ta: string;
  trang_thai: string;
  dien_tich_ha: number;
  dien_tich_m2: number;
  chu_vi_m: number;
  dien_tich_kha_dung_ha: number | null;
  vi_tri_ten: string;
  tam_lat: number;
  tam_lng: number;
  ngay_tao: string;
  ngay_cap_nhat: string;
  so_ngay_trong_chu_ky: number | null;
  dse_ngay: number | null;
  tong_thuc_an_kg_dm: number | null;
  toc_do_tang_truong: number | null;
  con_lai_ngay_chan_tha: number | null;
  polygon: Array<{ lat: number; lng: number }>;
  chi_so: ChiSoThamThucVat[];
};

type ChiSoThamThucVat = {
  ten: string;
  ma: string;
  gia_tri: number;
  muc: string;
  mau: string;
};

type NhatKyNongDuoc = {
  id: string;
  ngay_ap_dung: string;
  gio_bat_dau: string;
  gio_ket_thuc: string;
  san_pham: string;
  thiet_bi: string;
  lieu_luong: string;
  dien_tich: string;
  thoi_gian_cach_ly: string;
  loai_cay_trong: string;
  toc_do_gio: string;
  huong_gio: string;
  nhiet_do: string;
  do_am: string;
  van_hanh: string;
  giam_sat: string;
  doi_tuong_ap_dung: string;
};

type LichSuGhiChu = {
  id: string;
  loai: string;
  ngay: string;
  noi_dung: string;
  nguoi_dung: string;
};

const menuItems = [
  { icon: "🏠", ten: "Tổng quan", href: "/home-2" },
  { icon: "🗺️", ten: "Bản đồ nông trại", href: "/home-2/ban-do" },
  { icon: "🧩", ten: "Quản lý khu vực", href: "/home-2/ban-do/quan-ly-o" },
  { icon: "🐄", ten: "Vật nuôi", href: "#" },
  { icon: "⚙️", ten: "Hồ sơ", href: "/home-2/profile" },
];

const nhomKhuVucMap: Record<OLoai, { nhan: string; mau: string; bieu_tuong: string }> = {
  cropping: { nhan: "Trồng trọt", mau: "#2e7d32", bieu_tuong: "🌱" },
  grazing: { nhan: "Chăn thả", mau: "#43a047", bieu_tuong: "🐄" },
  hay: { nhan: "Cỏ khô", mau: "#c48a00", bieu_tuong: "🌾" },
  resting: { nhan: "Nghỉ đất", mau: "#8d6e63", bieu_tuong: "🟫" },
  nguon_nuoc: { nhan: "Nguồn nước", mau: "#1e88e5", bieu_tuong: "💧" },
  phuong_tien: { nhan: "Phương tiện", mau: "#546e7a", bieu_tuong: "🚜" },
  chan_nuoi: { nhan: "Chăn nuôi", mau: "#fb8c00", bieu_tuong: "🐐" },
  dung_cu: { nhan: "Dụng cụ", mau: "#8e24aa", bieu_tuong: "🧰" },
  nha_kho: { nhan: "Nhà kho", mau: "#6d4c41", bieu_tuong: "🏚️" },
};

const normalizeTypeText = (v: unknown) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");


const bangTonTaiCache = new Map<string, boolean>();

async function hasTable(fullName: string): Promise<boolean> {
  if (bangTonTaiCache.has(fullName)) return bangTonTaiCache.get(fullName) ?? false;
  try {
    const rs = await db.query("select to_regclass($1) as regclass", [fullName]);
    const exists = Boolean(rs.rows[0]?.regclass);
    bangTonTaiCache.set(fullName, exists);
    return exists;
  } catch {
    bangTonTaiCache.set(fullName, false);
    return false;
  }
}

const toNumber = (value: unknown, fallback: number | null = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDate = (value: unknown) => {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("vi-VN");
};

const formatDateTime = (value: unknown) => {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("vi-VN");
};

const formatTime = (value: unknown) => {
  if (!value) return "-";
  const raw = String(value);
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
};

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

const mucDanhGia = (value: number) => {
  if (value >= 0.65) return "Rất tốt";
  if (value >= 0.5) return "Tốt";
  if (value >= 0.35) return "Trung bình";
  return "Thấp";
};

function taoChiSoTuMetadata(metadata: Record<string, unknown>): ChiSoThamThucVat[] {
  const mapping = [
    { ma: "NDVI", ten: "Thảm thực vật NDVI", mau: "#0ea5e9", keys: ["NDVI", "ndvi"] },
    { ma: "EVI", ten: "Sinh khối tăng cường EVI", mau: "#10b981", keys: ["EVI", "evi"] },
    { ma: "NDMI", ten: "Độ ẩm NDMI", mau: "#f59e0b", keys: ["NDMI", "ndmi"] },
    { ma: "NDWI", ten: "Nước mặt NDWI", mau: "#ef4444", keys: ["NDWI", "ndwi"] },
    { ma: "SAVI", ten: "Sinh khối đất SAVI", mau: "#8b5cf6", keys: ["SAVI", "savi"] },
    { ma: "NDSI", ten: "Tín hiệu ẩm bề mặt NDSI", mau: "#3b82f6", keys: ["NDSI", "ndsi"] },
  ] as const;

  return mapping
    .map((item) => {
      const rawValue = item.keys.map((key) => metadata[key]).find((value) => value !== undefined && value !== null);
      const giaTri = toNumber(rawValue);
      if (giaTri === null) return null;
      return { ten: item.ten, ma: item.ma, gia_tri: giaTri, muc: mucDanhGia(giaTri), mau: item.mau };
    })
    .filter(Boolean) as ChiSoThamThucVat[];
}

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
      `select dc.id, dc.name, dc.crop_type, dc.grazing_status, dc.status, dc.area_ha, dc.created_at, dc.boundary_geojson,
              n.name as farm_name, l.location_name
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
      ? b.geo.polygon
          .filter((p: any) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)))
          .map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
      : [];
    const rawType = normalizeTypeText(metadata.areaType);
    const fullText = normalizeTypeText([r.crop_type, r.grazing_status, r.status, metadata.usage, metadata.notes, metadata.farmType].join(" "));
    const nhom = rawType ? detectAreaType(rawType) : detectAreaType(fullText);
    const dienTichHa = toNumber(r.area_ha ?? metadata.areaHecta, 0) ?? 0;
    const dienTichKhaDung = toNumber(metadata.dien_tich_kha_dung_ha ?? metadata.usableAreaHa ?? metadata.coverage);
    const chuViM = polygon.length >= 3
      ? Number((polygon.reduce((tong: number, point: { lat: number; lng: number }, index: number) => {
          const next = polygon[(index + 1) % polygon.length];
          const dx = (next.lng - point.lng) * 111320 * Math.cos(((next.lat + point.lat) / 2) * Math.PI / 180);
          const dy = (next.lat - point.lat) * 110540;
          return tong + Math.sqrt(dx * dx + dy * dy);
        }, 0)).toFixed(1))
      : 0;

    return {
      id: r.id,
      ten: r.name ?? "Khu vực chưa đặt tên",
      loai: String(r.crop_type ?? metadata.usage ?? "Chưa phân loại"),
      nhom,
      mo_ta: String(metadata.notes ?? "Chưa có mô tả cho khu vực này."),
      trang_thai: String(r.status ?? r.grazing_status ?? metadata.plantingStatus ?? "Đang theo dõi"),
      dien_tich_ha: dienTichHa,
      dien_tich_m2: Number((dienTichHa * 10000).toFixed(0)),
      chu_vi_m: toNumber(chuViM, 0) ?? 0,
      dien_tich_kha_dung_ha: dienTichKhaDung,
      vi_tri_ten: String(r.location_name ?? r.farm_name ?? "Khu vực nông trại"),
      tam_lat: toNumber(b?.geo?.lat ?? polygon[0]?.lat, 10.762622) ?? 10.762622,
      tam_lng: toNumber(b?.geo?.lng ?? polygon[0]?.lng, 106.660172) ?? 106.660172,
      ngay_tao: formatDate(r.created_at),
      ngay_cap_nhat: formatDateTime(r.created_at),
      so_ngay_trong_chu_ky: toNumber(metadata.so_ngay_trong_chu_ky ?? metadata.daysInCycle),
      dse_ngay: toNumber(metadata.dse_ngay ?? metadata.dsePerDay),
      tong_thuc_an_kg_dm: toNumber(metadata.tong_thuc_an_kg_dm ?? metadata.feedOnOfferKgDmHa),
      toc_do_tang_truong: toNumber(metadata.toc_do_tang_truong ?? metadata.pastureGrowthRateKgHaDay),
      con_lai_ngay_chan_tha: toNumber(metadata.con_lai_ngay_chan_tha ?? metadata.remainingGrazingDays),
      polygon,
      chi_so: taoChiSoTuMetadata(metadata),
    };
  } catch {
    return null;
  }
}

async function getNhatKyNongDuoc(khuVucId: string): Promise<NhatKyNongDuoc[]> {
  try {
    const hasNhatKy = await hasTable("du_lieu.nhat_ky_nong_duoc_khu_vuc");
    const hasChiTiet = await hasTable("du_lieu.khu_vuc_chi_tiet");
    if (!hasNhatKy || !hasChiTiet) return [];
    const rs = await db.query(
      `select nk.id, nk.ngay_ap_dung, nk.gio_bat_dau, nk.gio_ket_thuc, nk.san_pham, nk.thiet_bi, nk.lieu_luong,
              nk.dien_tich_ha, nk.thoi_gian_cach_ly, nk.loai_cay_trong, nk.toc_do_gio_km_h, nk.huong_gio,
              nk.nhiet_do_c, nk.do_am_pct, nk.nguoi_van_hanh, nk.nguoi_giam_sat, nk.doi_tuong_ap_dung
       from du_lieu.nhat_ky_nong_duoc_khu_vuc nk
       join du_lieu.khu_vuc_chi_tiet ct on ct.id = nk.khu_vuc_chi_tiet_id
       where ct.khu_vuc_id = $1
       order by nk.ngay_ap_dung desc, nk.gio_bat_dau desc
       limit 50`,
      [khuVucId]
    );

    return rs.rows.map((r: any) => ({
      id: String(r.id),
      ngay_ap_dung: formatDate(r.ngay_ap_dung),
      gio_bat_dau: formatTime(r.gio_bat_dau),
      gio_ket_thuc: formatTime(r.gio_ket_thuc),
      san_pham: String(r.san_pham ?? "-"),
      thiet_bi: String(r.thiet_bi ?? "-"),
      lieu_luong: String(r.lieu_luong ?? "-"),
      dien_tich: r.dien_tich_ha !== null && r.dien_tich_ha !== undefined ? `${Number(r.dien_tich_ha).toFixed(2)} ha` : "-",
      thoi_gian_cach_ly: String(r.thoi_gian_cach_ly ?? "-"),
      loai_cay_trong: String(r.loai_cay_trong ?? "-"),
      toc_do_gio: r.toc_do_gio_km_h !== null && r.toc_do_gio_km_h !== undefined ? `${Number(r.toc_do_gio_km_h).toFixed(1)} km/h` : "-",
      huong_gio: String(r.huong_gio ?? "-"),
      nhiet_do: r.nhiet_do_c !== null && r.nhiet_do_c !== undefined ? `${Number(r.nhiet_do_c).toFixed(1)}°C` : "-",
      do_am: r.do_am_pct !== null && r.do_am_pct !== undefined ? `${Number(r.do_am_pct).toFixed(0)}%` : "-",
      van_hanh: String(r.nguoi_van_hanh ?? "-"),
      giam_sat: String(r.nguoi_giam_sat ?? "-"),
      doi_tuong_ap_dung: String(r.doi_tuong_ap_dung ?? "-"),
    }));
  } catch {
    return [];
  }
}

async function getLichSuGhiChu(khuVucId: string): Promise<LichSuGhiChu[]> {
  try {
    const hasLichSu = await hasTable("du_lieu.lich_su_ghi_chu_khu_vuc");
    const hasChiTiet = await hasTable("du_lieu.khu_vuc_chi_tiet");
    if (!hasLichSu || !hasChiTiet) return [];
    const rs = await db.query(
      `select ls.id, ls.loai_ban_ghi, ls.thoi_diem, ls.noi_dung, ls.nguoi_tao
       from du_lieu.lich_su_ghi_chu_khu_vuc ls
       join du_lieu.khu_vuc_chi_tiet ct on ct.id = ls.khu_vuc_chi_tiet_id
       where ct.khu_vuc_id = $1
       order by ls.thoi_diem desc
       limit 50`,
      [khuVucId]
    );

    return rs.rows.map((r: any) => ({
      id: String(r.id),
      loai: String(r.loai_ban_ghi ?? "Ghi chú"),
      ngay: formatDateTime(r.thoi_diem),
      noi_dung: String(r.noi_dung ?? "-"),
      nguoi_dung: String(r.nguoi_tao ?? "-"),
    }));
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";


function taoDuLieuBieuDo(chiSo: ChiSoThamThucVat[]) {
  return chiSo.map((item) => ({ key: item.ma, label: item.ma, color: item.mau, value: item.gia_tri }));
}


function nhanMocChiSo(label: string) {
  if (label === "NDVI") return ["None", "Sparse", "Dense"];
  if (label === "EVI") return ["None", "Low", "High"];
  if (label === "NDMI") return ["Bare", "Stress", "High"];
  if (label === "NDWI") return ["Drought", "Humidity", "Water"];
  if (label === "SAVI") return ["Low", "Medium", "High"];
  return ["Ground", "Overcast", "Snow"];
}

function mauThanhChiSo(label: string) {
  if (label === "NDVI") return "linear-gradient(90deg, #ef4444 0%, #f59e0b 35%, #fde68a 55%, #86efac 78%, #16a34a 100%)";
  if (label === "EVI") return "linear-gradient(90deg, #dbeafe 0%, #38bdf8 35%, #0ea5e9 55%, #84cc16 78%, #22c55e 100%)";
  if (label === "NDMI") return "linear-gradient(90deg, #d97706 0%, #facc15 35%, #67e8f9 58%, #60a5fa 100%)";
  if (label === "NDWI") return "linear-gradient(90deg, #f59e0b 0%, #fde68a 35%, #a7f3d0 65%, #22c55e 100%)";
  if (label === "SAVI") return "linear-gradient(90deg, #e2e8f0 0%, #7dd3fc 35%, #38bdf8 55%, #bbf7d0 82%, #84cc16 100%)";
  return "linear-gradient(90deg, #ef4444 0%, #f8fafc 45%, #93c5fd 100%)";
}

function renderMetric(label: string, value: number | null, suffix = "") {
  return (
    <div>
      <span>{label}</span>
      <strong>{value === null ? "Chưa có dữ liệu" : `${value.toLocaleString("vi-VN")}${suffix}`}</strong>
    </div>
  );
}

export default async function ChiTietKhuVucPage({ params }: { params: { id: string } }) {
  const ownerId = cookies().get("ownerId")?.value;
  const mapData = ownerId ? await getLatestFarmMap(ownerId) : null;
  const chiTiet = ownerId ? await getChiTietKhuVuc(ownerId, params.id) : null;
  const nhatKy = chiTiet ? await getNhatKyNongDuoc(chiTiet.id) : [];
  const lichSu = chiTiet ? await getLichSuGhiChu(chiTiet.id) : [];
  const farmName = mapData?.farm_name || "KetKat-EcoFarm";
  const nhomInfo = nhomKhuVucMap[chiTiet?.nhom ?? "cropping"];
  const duLieuBieuDo = chiTiet ? taoDuLieuBieuDo(chiTiet.chi_so) : [];

  return (
    <main className="dashboard-page area-detail-page">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-left">
          <label htmlFor="dashboardMenuToggleAreaDetail" className="dashboard-menu-btn">☰</label>
          <div>
            <p className="farm-map-eyebrow">Chi tiết khu vực</p>
            <strong className="dashboard-brand">{farmName}</strong>
          </div>
        </div>
        <div className="dashboard-toolbar"><span>🔔</span><TopbarUserMenu /></div>
      </header>

      <nav className="dashboard-taskbar">
        <a href="/home-2" className="dashboard-taskbar-item">Tổng quan</a>
        <a href="/home-2/ban-do" className="dashboard-taskbar-item">Bản đồ nông trại</a>
        <a href="/home-2/ban-do/quan-ly-o" className="dashboard-taskbar-item active">Quản lý khu vực</a>
        <a href="#" className="dashboard-taskbar-item">Nhật ký canh tác</a>
        <a href="/home-2/profile" className="dashboard-taskbar-item">Hồ sơ</a>
      </nav>

      <section className="dashboard-layout dashboard-layout-with-toggle">
        <input id="dashboardMenuToggleAreaDetail" type="checkbox" className="dashboard-menu-toggle" />
        <aside className="dashboard-sidebar dashboard-sidebar-panel">
          {menuItems.map((item, idx) => (
            <a key={item.ten} href={item.href} className={`dashboard-menu-item ${idx === 2 ? "active" : ""}`}>
              <span className="dashboard-menu-icon">{item.icon}</span>
              <span className="dashboard-menu-label">{item.ten}</span>
            </a>
          ))}
        </aside>

        <div className="dashboard-main area-detail-main">
          {!chiTiet ? (
            <section className="area-detail-card">
              <div className="area-detail-card-head">
                <h2>Không tìm thấy dữ liệu khu vực</h2>
                <a href="/home-2/ban-do/quan-ly-o" className="area-link-btn">← Quay lại danh sách</a>
              </div>
              <p className="area-farm-note">Khu vực này chưa tồn tại trong cơ sở dữ liệu hoặc bạn không có quyền truy cập.</p>
            </section>
          ) : (
            <>
              <section className="area-header-card area-detail-hero">
                <div>
                  <p className="area-detail-badge">{nhomInfo.bieu_tuong} {nhomInfo.nhan}</p>
                  <h1>{chiTiet.ten}</h1>
                  <p className="area-detail-subtitle">Chi tiết khu vực đang được hiển thị trực tiếp từ dữ liệu hiện có trong cơ sở dữ liệu KetKat-EcoFarm.</p>
                </div>
                <div className="area-header-actions">
                  <a href="/home-2/ban-do/quan-ly-o" className="area-link-btn">← Danh sách khu vực</a>
                  <a href="/home-2/ban-do" className="area-link-btn primary">Xem toàn bộ bản đồ</a>
                </div>
              </section>

              <section className="area-detail-top-grid">
                <article className="area-detail-card">
                  <div className="area-detail-card-head">
                    <h2>Thông tin chi tiết</h2>
                    <span className="area-detail-pill" style={{ backgroundColor: `${nhomInfo.mau}1a`, color: nhomInfo.mau }}>{chiTiet.trang_thai}</span>
                  </div>
                  <dl className="area-detail-info-list">
                    <div><dt>Tên khu vực</dt><dd>{chiTiet.ten}</dd></div>
                    <div><dt>Trạng thái</dt><dd>{chiTiet.trang_thai}</dd></div>
                    <div><dt>Loại cây trồng / mục đích</dt><dd>{chiTiet.loai}</dd></div>
                    <div><dt>Diện tích</dt><dd>{chiTiet.dien_tich_ha.toFixed(3)} ha</dd></div>
                    <div><dt>Diện tích khả dụng</dt><dd>{chiTiet.dien_tich_kha_dung_ha === null ? "Chưa có dữ liệu" : `${chiTiet.dien_tich_kha_dung_ha.toFixed(3)} ha`}</dd></div>
                    <div><dt>Chu vi</dt><dd>{chiTiet.chu_vi_m.toFixed(1)} m</dd></div>
                    <div><dt>Vị trí</dt><dd>{chiTiet.vi_tri_ten}</dd></div>
                    <div><dt>Tọa độ tâm</dt><dd>{chiTiet.tam_lat.toFixed(6)}, {chiTiet.tam_lng.toFixed(6)}</dd></div>
                    <div><dt>Ngày tạo</dt><dd>{chiTiet.ngay_tao}</dd></div>
                    <div><dt>Cập nhật gần nhất</dt><dd>{chiTiet.ngay_cap_nhat}</dd></div>
                    <div className="full"><dt>Mô tả</dt><dd>{chiTiet.mo_ta}</dd></div>
                  </dl>
                </article>

                <article className="area-detail-card">
                  <div className="area-detail-card-head">
                    <h2>Vị trí khu vực</h2>
                    <span className="area-detail-muted">{chiTiet.vi_tri_ten}</span>
                  </div>
                  <div className="area-detail-map-wrap">
                    <MapViewSwitcher
                      lat={chiTiet.tam_lat}
                      lng={chiTiet.tam_lng}
                      zoom={18}
                      title={`Bản đồ khu vực ${chiTiet.ten}`}
                      frameClassName="area-detail-map"
                      polygon={chiTiet.polygon}
                      fitToPolygon={chiTiet.polygon.length >= 3}
                      hideEcoNote
                    />
                  </div>
                </article>
              </section>

              <section className="area-detail-card">
                <div className="area-detail-card-head">
                  <div>
                    <h2>Chỉ số thảm thực vật</h2>
                    
                  </div>
                </div>

                {chiTiet.chi_so.length > 0 ? (
                  <>
                    <div className="area-detail-scale-grid">
                      {chiTiet.chi_so.map((item) => {
                        const moc = nhanMocChiSo(item.ma);
                        return (
                          <article key={item.ma} className="area-detail-scale-card">
                            <div className="area-detail-scale-head">
                              <div>
                                <p>{item.ten}</p>
                                <strong>{item.ma}</strong>
                              </div>
                              <span style={{ color: item.mau }}>{item.gia_tri.toFixed(2)}</span>
                            </div>
                            <div className="area-detail-scale-track" style={{ backgroundImage: mauThanhChiSo(item.ma) }}>
                              <span className="area-detail-scale-dot" style={{ left: `calc(${Math.min(item.gia_tri * 100, 100)}% - 7px)` }} />
                            </div>
                            <div className="area-detail-scale-labels">
                              {moc.map((label) => <span key={label}>{label}</span>)}
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div className="area-detail-chart-card">
                      <div className="area-detail-chart-head">
                        <strong>Biểu đồ chỉ số khu vực</strong>
                        <span>Cho phép phóng to, thu nhỏ và kéo ngang để xem chi tiết từng giai đoạn</span>
                      </div>
                      <AreaIndexTrendChart series={duLieuBieuDo} seed={`${chiTiet.id}-${chiTiet.ngay_tao}`} />
                    </div>
                  </>
                ) : (
                  <p className="area-farm-note">Khu vực này chưa có chỉ số NDVI/EVI/NDMI/NDWI/SAVI/NDSI được lưu trong metadata.</p>
                )}
              </section>

              <section className="area-detail-card area-detail-pasture">
                <div className="area-detail-card-head">
                  <h2>Quản lý thảm thực vật và chăn thả</h2>
                  <span className="area-detail-muted">Chỉ hiển thị dữ liệu hiện có trong cơ sở dữ liệu</span>
                </div>

                <div className="area-detail-kpis">
                  <div><span>Hình thức sử dụng</span><strong>{nhomInfo.nhan}</strong></div>
                  <div><span>Loại cây trồng</span><strong>{chiTiet.loai}</strong></div>
                  {renderMetric("Số ngày trong chu kỳ", chiTiet.so_ngay_trong_chu_ky)}
                  {renderMetric("Tải trọng DSE/ngày", chiTiet.dse_ngay)}
                  {renderMetric("Thức ăn sẵn có", chiTiet.tong_thuc_an_kg_dm, " kg DM/ha")}
                  {renderMetric("Tăng trưởng thảm thực vật", chiTiet.toc_do_tang_truong, " kg/ha/ngày")}
                  {renderMetric("Ngày chăn thả còn lại", chiTiet.con_lai_ngay_chan_tha)}
                  {renderMetric("Diện tích khả dụng", chiTiet.dien_tich_kha_dung_ha, " ha")}
                </div>
              </section>

              <section className="area-detail-card">
                <div className="area-detail-card-head">
                  <h2>Nhật ký nông dược</h2>
                  <span className="area-detail-muted">Nguồn dữ liệu: bảng `du_lieu.nhat_ky_nong_duoc_khu_vuc`</span>
                </div>
                {nhatKy.length > 0 ? (
                  <div className="area-detail-table-wrap">
                    <table className="area-detail-table wide">
                      <thead>
                        <tr>
                          <th>Ngày áp dụng</th>
                          <th>Bắt đầu</th>
                          <th>Kết thúc</th>
                          <th>Sản phẩm</th>
                          <th>Thiết bị</th>
                          <th>Liều lượng</th>
                          <th>Diện tích</th>
                          <th>Cách ly</th>
                          <th>Loại cây trồng</th>
                          <th>Tốc độ gió</th>
                          <th>Hướng gió</th>
                          <th>Nhiệt độ</th>
                          <th>Độ ẩm</th>
                          <th>Vận hành</th>
                          <th>Giám sát</th>
                          <th>Đối tượng áp dụng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nhatKy.map((item) => (
                          <tr key={item.id}>
                            <td>{item.ngay_ap_dung}</td>
                            <td>{item.gio_bat_dau}</td>
                            <td>{item.gio_ket_thuc}</td>
                            <td>{item.san_pham}</td>
                            <td>{item.thiet_bi}</td>
                            <td>{item.lieu_luong}</td>
                            <td>{item.dien_tich}</td>
                            <td>{item.thoi_gian_cach_ly}</td>
                            <td>{item.loai_cay_trong}</td>
                            <td>{item.toc_do_gio}</td>
                            <td>{item.huong_gio}</td>
                            <td>{item.nhiet_do}</td>
                            <td>{item.do_am}</td>
                            <td>{item.van_hanh}</td>
                            <td>{item.giam_sat}</td>
                            <td>{item.doi_tuong_ap_dung}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="area-farm-note">Chưa có bản ghi nhật ký nông dược cho khu vực này.</p>
                )}
              </section>

              <section className="area-detail-card">
                <div className="area-detail-card-head">
                  <div>
                    <h2>Lịch sử và ghi chú</h2>
                    <p className="area-detail-inline-tabs"><span>Lịch sử</span><span>Ghi chú</span></p>
                  </div>
                  <span className="area-detail-muted">Nguồn dữ liệu: bảng `du_lieu.lich_su_ghi_chu_khu_vuc`</span>
                </div>
                {lichSu.length > 0 ? (
                  <div className="area-detail-table-wrap">
                    <table className="area-detail-table">
                      <thead>
                        <tr>
                          <th>Mã</th>
                          <th>Loại</th>
                          <th>Ngày</th>
                          <th>Thông tin</th>
                          <th>Người dùng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lichSu.map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>{item.loai}</td>
                            <td>{item.ngay}</td>
                            <td>{item.noi_dung}</td>
                            <td>{item.nguoi_dung}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="area-farm-note">Chưa có lịch sử hoặc ghi chú nào cho khu vực này.</p>
                )}
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
