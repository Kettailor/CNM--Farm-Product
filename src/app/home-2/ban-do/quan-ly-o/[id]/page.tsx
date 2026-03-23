import { db } from "@/lib/db";
import { cookies } from "next/headers";
import TopbarUserMenu from "@/components/topbar-user-menu";
import MapViewSwitcher from "@/components/map-view-switcher";

type OLoai = "cropping" | "grazing" | "hay" | "resting" | "nguon_nuoc" | "phuong_tien" | "chan_nuoi" | "dung_cu" | "nha_kho";

type FarmMapInfo = {
  farm_name: string;
  latitude: number;
  longitude: number;
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
  dien_tich_kha_dung_ha: number;
  vi_tri_ten: string;
  tam_lat: number;
  tam_lng: number;
  ngay_tao: string;
  ngay_cap_nhat: string;
  so_ngay_trong_chu_ky: number;
  dse_ngay: number;
  tong_thuc_an_kg_dm: number;
  toc_do_tang_truong: number;
  con_lai_ngay_chan_tha: number;
  polygon: Array<{ lat: number; lng: number }>;
};

type ChiSoThamThucVat = {
  ten: string;
  ma: string;
  gia_tri: number;
  muc: string;
  mau: string;
};

type NhatKyNongDuoc = {
  ngay_ap_dung: string;
  gio_bat_dau: string;
  gio_ket_thuc: string;
  khu_vuc: string;
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


const toNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
    const polygon = Array.isArray(b?.geo?.polygon)
      ? b.geo.polygon
          .filter((p: any) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)))
          .map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
      : [];
    const rawType = normalizeTypeText(b?.metadata?.areaType);
    const fullText = normalizeTypeText([r.crop_type, r.grazing_status, r.status, b?.metadata?.usage, b?.metadata?.notes, b?.metadata?.farmType].join(" "));
    const nhom = rawType ? detectAreaType(rawType) : detectAreaType(fullText);
    const dienTichHa = Number(r.area_ha ?? b?.metadata?.areaHecta ?? 0);
    const dienTichKhaDung = Number((dienTichHa * 0.92).toFixed(3));
    const chuViM = polygon.length >= 3
      ? Number((polygon.reduce((tong: number, point: { lat: number; lng: number }, index: number) => {
          const next = polygon[(index + 1) % polygon.length];
          const dx = (next.lng - point.lng) * 111320 * Math.cos(((next.lat + point.lat) / 2) * Math.PI / 180);
          const dy = (next.lat - point.lat) * 110540;
          return tong + Math.sqrt(dx * dx + dy * dy);
        }, 0)).toFixed(1))
      : Number((Math.sqrt(Math.max(dienTichHa, 0.1) * 10000) * 4.2).toFixed(1));

    return {
      id: r.id,
      ten: r.name ?? "Khu vực chưa đặt tên",
      loai: r.crop_type ?? "Chưa phân loại",
      nhom,
      mo_ta: b?.metadata?.notes ?? `${r.name ?? "Khu vực"} thuộc hệ thống KetKat-EcoFarm, phù hợp để theo dõi lịch sử canh tác và chăn thả theo thời gian thực.`,
      trang_thai: r.status ?? r.grazing_status ?? "Đang theo dõi",
      dien_tich_ha: toNumber(dienTichHa, 0),
      dien_tich_m2: toNumber(Number((dienTichHa * 10000).toFixed(0)), 0),
      chu_vi_m: toNumber(chuViM, 0),
      dien_tich_kha_dung_ha: toNumber(dienTichKhaDung, 0),
      vi_tri_ten: r.location_name ?? r.farm_name ?? "Khu vực nông trại",
      tam_lat: toNumber(b?.geo?.lat ?? polygon[0]?.lat, 10.762622),
      tam_lng: toNumber(b?.geo?.lng ?? polygon[0]?.lng, 106.660172),
      ngay_tao: r.created_at ? new Date(r.created_at).toLocaleDateString("vi-VN") : "-",
      ngay_cap_nhat: r.created_at ? new Date(r.created_at).toLocaleString("vi-VN") : "-",
      so_ngay_trong_chu_ky: 27,
      dse_ngay: 8,
      tong_thuc_an_kg_dm: Number((dienTichHa * 267.5).toFixed(1)),
      toc_do_tang_truong: Number((2.1 + dienTichHa * 0.13).toFixed(2)),
      con_lai_ngay_chan_tha: Math.max(8, Math.round(dienTichHa * 2.4)),
      polygon,
    };
  } catch {
    return null;
  }
}

function taoChiSoThamThucVat(): ChiSoThamThucVat[] {
  return [
    { ten: "Thảm thực vật NDVI", ma: "NDVI", gia_tri: 0.61, muc: "Tốt", mau: "#0ea5e9" },
    { ten: "Sinh khối tăng cường EVI", ma: "EVI", gia_tri: 0.5, muc: "Ổn định", mau: "#10b981" },
    { ten: "Độ ẩm NDMI", ma: "NDMI", gia_tri: 0.42, muc: "Trung bình", mau: "#f59e0b" },
    { ten: "Nước mặt NDWI", ma: "NDWI", gia_tri: 0.28, muc: "Thấp", mau: "#ef4444" },
    { ten: "Sinh khối đất SAVI", ma: "SAVI", gia_tri: 0.57, muc: "Khá", mau: "#8b5cf6" },
    { ten: "Tín hiệu ẩm bề mặt NDSI", ma: "NDSI", gia_tri: 0.49, muc: "Ổn định", mau: "#3b82f6" },
  ];
}

function taoNhatKyNongDuoc(tenKhuVuc: string): NhatKyNongDuoc[] {
  return [
    {
      ngay_ap_dung: "19/07/2025",
      gio_bat_dau: "12:34",
      gio_ket_thuc: "16:34",
      khu_vuc: tenKhuVuc,
      san_pham: "Glyphosate 360",
      thiet_bi: "Bình phun đeo vai",
      lieu_luong: "1,17 lít/ha",
      dien_tich: "7,74 ha",
      thoi_gian_cach_ly: "5 ngày",
      loai_cay_trong: "Cao lương Archer",
      toc_do_gio: "12,8 km/h",
      huong_gio: "Nam",
      nhiet_do: "17°C",
      do_am: "69%",
      van_hanh: "Nhân sự 3",
      giam_sat: "Giám sát 3",
      doi_tuong_ap_dung: "Khách hàng 3",
    },
    {
      ngay_ap_dung: "02/08/2025",
      gio_bat_dau: "17:29",
      gio_ket_thuc: "20:29",
      khu_vuc: tenKhuVuc,
      san_pham: "Glyphosate 360",
      thiet_bi: "Bình phun đeo vai",
      lieu_luong: "3,28 lít/ha",
      dien_tich: "15,39 ha",
      thoi_gian_cach_ly: "3 ngày",
      loai_cay_trong: "Cải xoăn",
      toc_do_gio: "11,0 km/h",
      huong_gio: "Đông Bắc",
      nhiet_do: "23°C",
      do_am: "46%",
      van_hanh: "Nhân sự 4",
      giam_sat: "Giám sát 2",
      doi_tuong_ap_dung: "Khách hàng 2",
    },
    {
      ngay_ap_dung: "24/08/2025",
      gio_bat_dau: "17:00",
      gio_ket_thuc: "19:00",
      khu_vuc: tenKhuVuc,
      san_pham: "2,4-D Amin",
      thiet_bi: "Bình phun đeo vai",
      lieu_luong: "1,99 lít/ha",
      dien_tich: "5,39 ha",
      thoi_gian_cach_ly: "6 ngày",
      loai_cay_trong: "Yến mạch Bannister",
      toc_do_gio: "14,0 km/h",
      huong_gio: "Đông Bắc",
      nhiet_do: "19°C",
      do_am: "68%",
      van_hanh: "Nhân sự 1",
      giam_sat: "Giám sát 3",
      doi_tuong_ap_dung: "Khách hàng 1",
    },
  ];
}

export const dynamic = "force-dynamic";

function taoLichSuVaGhiChu(tenKhuVuc: string): LichSuGhiChu[] {
  return [
    {
      id: "ghi_chu_5_0",
      loai: "Lịch sử vật nuôi",
      ngay: "18:26 13/03/2026",
      noi_dung: "Đàn Sữa nhóm D đã được chuyển ra khỏi khu vực này.",
      nguoi_dung: "user1@ketkat-ecofarm.vn",
    },
    {
      id: "ghi_chu_5_1",
      loai: "Ghi chú",
      ngay: "18:26 19/02/2026",
      noi_dung: `Ghi chú cho ${tenKhuVuc}: đã kiểm tra đầy đủ các điểm cấp nước và cảm biến hiện trường.`,
      nguoi_dung: "user1@ketkat-ecofarm.vn",
    },
    {
      id: "ghi_chu_5_2",
      loai: "Lịch sử vật nuôi",
      ngay: "18:26 28/01/2026",
      noi_dung: "Đàn Cừu Merino B đã được đưa vào khu vực để bắt đầu chu kỳ chăn thả mới.",
      nguoi_dung: "user2@ketkat-ecofarm.vn",
    },
  ];
}

export default async function ChiTietKhuVucPage({ params }: { params: { id: string } }) {
  const ownerId = cookies().get("ownerId")?.value;
  const mapData = ownerId ? await getLatestFarmMap(ownerId) : null;
  const chiTiet = ownerId ? await getChiTietKhuVuc(ownerId, params.id) : null;
  const farmName = mapData?.farm_name || "KetKat-EcoFarm";
  const lat = toNumber(chiTiet?.tam_lat ?? mapData?.latitude, 10.762622);
  const lng = toNumber(chiTiet?.tam_lng ?? mapData?.longitude, 106.660172);
  const thongTin = chiTiet ?? {
    id: params.id,
    ten: "Khu vực đồi phía Bắc 04",
    loai: "Kê",
    nhom: "grazing" as OLoai,
    mo_ta: "Khu vực chăn thả kết hợp canh tác kê, phù hợp theo dõi độ che phủ và lịch sử sử dụng nông dược.",
    trang_thai: "Đang chăn thả",
    dien_tich_ha: 0.001,
    dien_tich_m2: 10,
    chu_vi_m: 11.9,
    dien_tich_kha_dung_ha: 0.0009,
    vi_tri_ten: mapData?.location_name ?? "Khu trung tâm nông trại",
    tam_lat: lat,
    tam_lng: lng,
    ngay_tao: "23/03/2026",
    ngay_cap_nhat: "23/03/2026 08:30",
    so_ngay_trong_chu_ky: 27,
    dse_ngay: 8,
    tong_thuc_an_kg_dm: 2383,
    toc_do_tang_truong: 15,
    con_lai_ngay_chan_tha: 19,
    polygon: [
      { lat: lat + 0.0006, lng: lng - 0.0004 },
      { lat: lat + 0.00085, lng: lng + 0.0001 },
      { lat: lat + 0.0003, lng: lng + 0.00075 },
      { lat: lat - 0.00035, lng: lng + 0.00055 },
      { lat: lat - 0.00055, lng: lng - 0.0001 },
      { lat: lat - 0.0001, lng: lng - 0.00065 },
    ],
  };

  const chiSo = taoChiSoThamThucVat();
  const nhatKy = taoNhatKyNongDuoc(thongTin.ten);
  const lichSu = taoLichSuVaGhiChu(thongTin.ten);
  const nhomInfo = nhomKhuVucMap[thongTin.nhom];

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
          <section className="area-header-card area-detail-hero">
            <div>
              <p className="area-detail-badge">{nhomInfo.bieu_tuong} {nhomInfo.nhan}</p>
              <h1>{thongTin.ten}</h1>
              <p className="area-detail-subtitle">Trang chi tiết khu vực chuẩn tiếng Việt cho hệ thống KetKat-EcoFarm, mô phỏng bố cục theo ảnh tham chiếu.</p>
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
                <span className="area-detail-pill" style={{ backgroundColor: `${nhomInfo.mau}1a`, color: nhomInfo.mau }}>{thongTin.trang_thai}</span>
              </div>
              <dl className="area-detail-info-list">
                <div><dt>Tên khu vực</dt><dd>{thongTin.ten}</dd></div>
                <div><dt>Trạng thái</dt><dd>{thongTin.trang_thai}</dd></div>
                <div><dt>Loại cây trồng / mục đích</dt><dd>{thongTin.loai}</dd></div>
                <div><dt>Diện tích</dt><dd>{thongTin.dien_tich_ha.toFixed(3)} ha</dd></div>
                <div><dt>Diện tích khả dụng</dt><dd>{thongTin.dien_tich_kha_dung_ha.toFixed(3)} ha</dd></div>
                <div><dt>Chu vi</dt><dd>{thongTin.chu_vi_m.toFixed(1)} m</dd></div>
                <div><dt>Vị trí</dt><dd>{thongTin.vi_tri_ten}</dd></div>
                <div><dt>Tọa độ tâm</dt><dd>{thongTin.tam_lat.toFixed(6)}, {thongTin.tam_lng.toFixed(6)}</dd></div>
                <div><dt>Ngày tạo</dt><dd>{thongTin.ngay_tao}</dd></div>
                <div><dt>Cập nhật gần nhất</dt><dd>{thongTin.ngay_cap_nhat}</dd></div>
                <div className="full"><dt>Mô tả</dt><dd>{thongTin.mo_ta}</dd></div>
              </dl>
            </article>

            <article className="area-detail-card">
              <div className="area-detail-card-head">
                <h2>Vị trí khu vực</h2>
                <span className="area-detail-muted">{thongTin.vi_tri_ten}</span>
              </div>
              <div className="area-detail-map-wrap">
                <MapViewSwitcher
                  lat={thongTin.tam_lat}
                  lng={thongTin.tam_lng}
                  zoom={18}
                  title={`Bản đồ khu vực ${thongTin.ten}`}
                  frameClassName="area-detail-map"
                  polygon={thongTin.polygon}
                  fitToPolygon={thongTin.polygon.length >= 3}
                  hideEcoNote
                />
              </div>
            </article>
          </section>

          <section className="area-detail-card area-detail-pasture">
            <div className="area-detail-card-head">
              <h2>Quản lý thảm thực vật và chăn thả</h2>
              <span className="area-detail-muted">Dữ liệu tổng hợp cho chu kỳ hiện tại</span>
            </div>

            <div className="area-detail-kpis">
              <div><span>Hình thức sử dụng</span><strong>{nhomInfo.nhan}</strong></div>
              <div><span>Loại cây trồng</span><strong>{thongTin.loai}</strong></div>
              <div><span>Số ngày trong chu kỳ</span><strong>{thongTin.so_ngay_trong_chu_ky}</strong></div>
              <div><span>Tải trọng DSE/ngày</span><strong>{thongTin.dse_ngay}</strong></div>
              <div><span>Thức ăn sẵn có</span><strong>{thongTin.tong_thuc_an_kg_dm.toLocaleString("vi-VN")} kg DM/ha</strong></div>
              <div><span>Tăng trưởng thảm thực vật</span><strong>{thongTin.toc_do_tang_truong.toFixed(2)} kg/ha/ngày</strong></div>
              <div><span>Ngày chăn thả còn lại</span><strong>{thongTin.con_lai_ngay_chan_tha}</strong></div>
              <div><span>Diện tích khả dụng</span><strong>{thongTin.dien_tich_kha_dung_ha.toFixed(3)} ha</strong></div>
            </div>

            <div className="area-detail-index-grid">
              {chiSo.map((item) => (
                <article key={item.ma} className="area-index-card">
                  <div className="area-index-head">
                    <div>
                      <p>{item.ten}</p>
                      <strong>{item.ma}</strong>
                    </div>
                    <span style={{ color: item.mau }}>{item.gia_tri.toFixed(2)}</span>
                  </div>
                  <div className="area-index-bar"><span style={{ width: `${Math.min(item.gia_tri * 100, 100)}%`, backgroundColor: item.mau }} /></div>
                  <small>Mức đánh giá: {item.muc}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="area-detail-card">
            <div className="area-detail-card-head">
              <h2>Nhật ký nông dược</h2>
              <span className="area-detail-pill demo">Bản mô phỏng</span>
            </div>
            <div className="area-detail-table-wrap">
              <table className="area-detail-table wide">
                <thead>
                  <tr>
                    <th>Ngày áp dụng</th>
                    <th>Bắt đầu</th>
                    <th>Kết thúc</th>
                    <th>Khu vực</th>
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
                  {nhatKy.map((item, index) => (
                    <tr key={`${item.ngay_ap_dung}-${index}`}>
                      <td>{item.ngay_ap_dung}</td>
                      <td>{item.gio_bat_dau}</td>
                      <td>{item.gio_ket_thuc}</td>
                      <td>{item.khu_vuc}</td>
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
          </section>

          <section className="area-detail-card">
            <div className="area-detail-card-head">
              <div>
                <h2>Lịch sử và ghi chú</h2>
                <p className="area-detail-inline-tabs"><span>Lịch sử</span><span>Ghi chú</span></p>
              </div>
              <span className="area-detail-muted">Theo dõi hoạt động gần nhất trong khu vực</span>
            </div>
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
          </section>
        </div>
      </section>
    </main>
  );
}
