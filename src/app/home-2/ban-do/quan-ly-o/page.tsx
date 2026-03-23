import { db } from "@/lib/db";
import { cookies } from "next/headers";
import TopbarUserMenu from "@/components/topbar-user-menu";
import MapViewSwitcher from "@/components/map-view-switcher";

type FarmMapInfo = {
  farm_name: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
};

type OLoai = "cropping" | "grazing" | "hay" | "resting" | "nguon_nuoc" | "phuong_tien" | "chan_nuoi" | "dung_cu" | "nha_kho";

type OQuanLy = {
  id: string;
  ten: string;
  loai: string;
  nhom: OLoai;
  dac_tinh: string;
  suc_chua: string;
  mau: string;
  areaHa: number;
  centerLat: number;
  centerLng: number;
  icon: string;
  pointCount: number;
  createdAt: string;
  polygon: Array<{ lat: number; lng: number }>;
};

const menuItems = [
  { icon: "🏠", ten: "Tổng quan", href: "/home-2" },
  { icon: "🗺️", ten: "Bản đồ nông trại", href: "/home-2/ban-do" },
  { icon: "🧩", ten: "Quản lý khu vực", href: "/home-2/ban-do/quan-ly-o" },
  { icon: "🐄", ten: "Vật nuôi", href: "#" },
  { icon: "⚙️", ten: "Hồ sơ", href: "/home-2/profile" },
];

const normalizeTypeText = (v: unknown) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const detectAreaType = (raw: string): OLoai => {
  if (raw.includes("cropping") || raw.includes("trong trot") || raw.includes("cay trong")) return "cropping";
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

async function getDanhSachO(ownerId: string): Promise<OQuanLy[]> {
  try {
    const rs = await db.query(
      `select dc.id, dc.name, dc.crop_type, dc.grazing_status, dc.status, dc.area_ha, dc.created_at, dc.boundary_geojson
       from du_lieu.dong_chan_tha dc
       join du_lieu.nong_trai n on n.id = dc.farm_id
       where n.owner_id = $1
       order by dc.created_at desc
       limit 100`,
      [ownerId]
    );

    return rs.rows.map((r: any) => {
      const b = r.boundary_geojson ?? {};
      const rawType = normalizeTypeText(b?.metadata?.areaType);
      const typeText = normalizeTypeText([b?.metadata?.usage, r.crop_type, b?.metadata?.notes, b?.metadata?.farmType].join(" "));
      const nhom: OLoai = rawType ? detectAreaType(rawType) : detectAreaType(typeText);
      const mapColor: Record<OLoai, string> = { cropping: "cropping", grazing: "grazing", hay: "hay", resting: "resting", nguon_nuoc: "nuoc", phuong_tien: "phuong-tien", chan_nuoi: "chan-nuoi", dung_cu: "dung-cu", nha_kho: "nha-kho" };
      const mapIcon: Record<OLoai, string> = { cropping: "🌱", grazing: "🐄", hay: "🌾", resting: "🟫", nguon_nuoc: "💧", phuong_tien: "🚜", chan_nuoi: "🐄", dung_cu: "🧰", nha_kho: "🏚️" };

      return {
        id: r.id,
        ten: r.name ?? "Ô chưa đặt tên",
        loai: r.crop_type ?? "Chưa phân loại",
        nhom,
        dac_tinh: r.grazing_status ?? "Chưa cập nhật",
        suc_chua: r.status ?? "-",
        mau: mapColor[nhom],
        areaHa: Number(r.area_ha ?? b?.metadata?.areaHecta ?? 0),
        centerLat: Number(b?.geo?.lat ?? 10.762622),
        centerLng: Number(b?.geo?.lng ?? 106.660172),
        icon: mapIcon[nhom],
        pointCount: Array.isArray(b?.geo?.polygon) ? b.geo.polygon.length : 0,
        createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString("vi-VN") : "-",
        polygon: Array.isArray(b?.geo?.polygon)
          ? b.geo.polygon.filter((p: any) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))).map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
          : [],
      };
    });
  } catch {
    return [];
  }
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

export default async function QuanLyOPage({ searchParams }: { searchParams?: { layer?: string } }) {
  const ownerId = cookies().get("ownerId")?.value;
  const mapData = ownerId ? await getLatestFarmMap(ownerId) : null;
  const dsO = ownerId ? await getDanhSachO(ownerId) : [];
  const farmName = mapData?.farm_name || "Trang trại";
  const lat = mapData?.latitude ?? 10.762622;
  const lng = mapData?.longitude ?? 106.660172;
  const layer = searchParams?.layer ?? "all";
  const activeLayer: "all" | OLoai = ["all", "cropping", "grazing", "hay", "resting", "nguon_nuoc", "phuong_tien", "chan_nuoi", "dung_cu", "nha_kho"].includes(layer ?? "")
    ? (layer as "all" | OLoai)
    : "all";
  const dsOHienThi = activeLayer === "all" ? dsO : dsO.filter((o) => o.nhom === activeLayer);
  const zoneColorByType: Record<OLoai, string> = { cropping: "#2e7d32", grazing: "#43a047", hay: "#c48a00", resting: "#8d6e63", nguon_nuoc: "#1e88e5", phuong_tien: "#546e7a", chan_nuoi: "#fb8c00", dung_cu: "#8e24aa", nha_kho: "#6d4c41" };
  const zoneOverlays = dsOHienThi
    .filter((o) => o.polygon.length >= 3)
    .map((o) => ({ id: o.id, label: o.ten, color: zoneColorByType[o.nhom], polygon: o.polygon }));

  return (
    <main className="dashboard-page area-page">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-left">
          <label htmlFor="dashboardMenuToggleArea" className="dashboard-menu-btn">☰</label>
          <strong className="dashboard-brand">{farmName}</strong>
        </div>
        <div className="dashboard-toolbar"><span>🔔</span><TopbarUserMenu /></div>
      </header>

      <nav className="dashboard-taskbar">
        <a href="/home-2" className="dashboard-taskbar-item">Tổng quan</a>
        <a href="/home-2/ban-do" className="dashboard-taskbar-item">Bản đồ nông trại</a>
        <a href="/home-2/ban-do/quan-ly-o" className="dashboard-taskbar-item active">Quản lý khu vực</a>
        <a href="#" className="dashboard-taskbar-item">Cảnh báo</a>
        <a href="/home-2/profile" className="dashboard-taskbar-item">Hồ sơ</a>
      </nav>

      <section className="dashboard-layout dashboard-layout-with-toggle">
        <input id="dashboardMenuToggleArea" type="checkbox" className="dashboard-menu-toggle" />
        <aside className="dashboard-sidebar dashboard-sidebar-panel">
          {menuItems.map((item, idx) => (
            <a key={item.ten} href={item.href} className={`dashboard-menu-item ${idx === 2 ? "active" : ""}`}>
              <span className="dashboard-menu-icon">{item.icon}</span>
              <span className="dashboard-menu-label">{item.ten}</span>
            </a>
          ))}
        </aside>

        <div className="dashboard-main">
          <section className="area-header-card">
            <div>
              <h1>Tổng quan quản lý khu vực</h1>
              <p className="area-detail-subtitle">Toàn bộ giao diện sử dụng tiếng Việt và thương hiệu KetKat-EcoFarm.</p>
            </div>
            <div className="area-header-actions">
              <a href="/home-2/ban-do" className="area-link-btn">← Quay lại</a>
              <a href="/home-2/ban-do/quan-ly-o/tao-o" className="area-link-btn primary">+ Tạo ô mới</a>
            </div>
          </section>

          <section className="area-tabs">
            <a href="/home-2/ban-do/quan-ly-o?layer=all" className={activeLayer === "all" ? "active" : ""}>Tất cả khu vực</a>
            <a href="/home-2/ban-do/quan-ly-o?layer=cropping" className={activeLayer === "cropping" ? "active" : ""}>Trồng trọt</a>
            <a href="/home-2/ban-do/quan-ly-o?layer=grazing" className={activeLayer === "grazing" ? "active" : ""}>Chăn thả</a>
            <a href="/home-2/ban-do/quan-ly-o?layer=hay" className={activeLayer === "hay" ? "active" : ""}>Cỏ khô</a>
            <a href="/home-2/ban-do/quan-ly-o?layer=resting" className={activeLayer === "resting" ? "active" : ""}>Nghỉ đất</a>
            <a href="/home-2/ban-do/quan-ly-o?layer=nguon_nuoc" className={activeLayer === "nguon_nuoc" ? "active" : ""}>Nguồn nước</a>
            <a href="/home-2/ban-do/quan-ly-o?layer=phuong_tien" className={activeLayer === "phuong_tien" ? "active" : ""}>Phương tiện</a>
            <a href="/home-2/ban-do/quan-ly-o?layer=chan_nuoi" className={activeLayer === "chan_nuoi" ? "active" : ""}>Chăn nuôi</a>
            <a href="/home-2/ban-do/quan-ly-o?layer=dung_cu" className={activeLayer === "dung_cu" ? "active" : ""}>Dụng cụ</a>
            <a href="/home-2/ban-do/quan-ly-o?layer=nha_kho" className={activeLayer === "nha_kho" ? "active" : ""}>Nhà kho</a>
          </section>

          <section className="area-grid">
            {dsOHienThi.map((o) => (
              <article className={`area-card area-card-${o.mau}`} key={o.id}>
                <h3>{o.icon} {o.ten}</h3>
                <p>Loại khu vực: {o.loai}</p>
                <p>Đặc tính: {o.dac_tinh}</p>
                <p>Trạng thái: {o.suc_chua}</p>
                <p>Diện tích: {o.areaHa.toFixed(3)} ha</p>
                <p>Tọa độ tâm: {o.centerLat.toFixed(6)}, {o.centerLng.toFixed(6)}</p>
                <p>Số đỉnh: {o.pointCount} · Tạo ngày: {o.createdAt}</p>
                <div className="area-card-actions"><a href={`/home-2/ban-do/quan-ly-o/${o.id}`} className="area-link-btn primary">Xem chi tiết</a></div>
                <div className="area-thumb-map-wrap">
                  <MapViewSwitcher
                    lat={o.centerLat}
                    lng={o.centerLng}
                    zoom={17}
                    title={`Bản đồ cắt theo ${o.ten}`}
                    frameClassName="area-thumb-map"
                    polygon={o.polygon}
                    fitToPolygon={o.polygon.length >= 3}
                    hideModeTabs
                    hideEcoNote
                  />
                </div>
              </article>
            ))}
            {dsOHienThi.length === 0 && <p>Chưa có ô nào trong bộ lọc hiện tại.</p>}
          </section>

          <section className="area-overview-map">
            <div className="area-overview-head">
              <h2>Bản đồ phân khu trang trại (vệ tinh)</h2>
              <span>{mapData?.location_name || `${lat}, ${lng}`}</span>
            </div>
            <p className="area-farm-note">Bản đồ cố định kích thước và luôn hiển thị ô đã tạo theo bộ lọc lớp.</p>
            <div className="area-overview-map-wrap fixed">
              <MapViewSwitcher
                lat={lat}
                lng={lng}
                zoom={15}
                title="Bản đồ tổng quan các ô"
                frameClassName="area-overview-canvas"
                zones={zoneOverlays}
                fitToPolygon={zoneOverlays.length > 0}
              />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

