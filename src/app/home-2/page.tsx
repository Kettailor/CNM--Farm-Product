import { db } from "@/lib/db";
import TopbarUserMenu from "@/components/topbar-user-menu";
import MapViewSwitcher from "@/components/map-view-switcher";
import { layOwnerIdTuServerCookie } from "@/lib/auth";

const menuItems = [
  { icon: "🏠", ten: "Tổng quan", href: "/home-2" },
  { icon: "🗺️", ten: "Bản đồ", href: "/home-2/ban-do" },
  { icon: "🧩", ten: "Quản lý ô", href: "/home-2/ban-do/quan-ly-o" },
  { icon: "🐄", ten: "Vật nuôi", href: "#" },
  { icon: "🌧️", ten: "Thời tiết", href: "#" },
  { icon: "⚙️", ten: "Hồ sơ", href: "/home-2/profile" },
];

type FarmMapInfo = { farm_name: string; latitude: number; longitude: number; location_name: string | null };

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

export default async function Home2DashboardPage() {
  const ownerId = layOwnerIdTuServerCookie();
  const mapData = ownerId ? await getLatestFarmMap(ownerId) : null;
  const farmName = mapData?.farm_name || "KetKat-EcoFarm";
  const lat = mapData?.latitude ?? 10.762622;
  const lng = mapData?.longitude ?? 106.660172;

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-left">
          <label htmlFor="dashboardMenuToggleHome" className="dashboard-menu-btn" aria-label="Ẩn hiện menu">☰</label>
          <strong className="dashboard-brand">{farmName}</strong>
        </div>
        <div className="dashboard-toolbar"><span>🔔</span><TopbarUserMenu /></div>
      </header>

      <nav className="dashboard-taskbar">
        <a href="/home-2" className="dashboard-taskbar-item active">Tổng quan</a>
        <a href="/home-2/ban-do" className="dashboard-taskbar-item">Bản đồ</a>
        <a href="/home-2/ban-do/quan-ly-o" className="dashboard-taskbar-item">Quản lý ô</a>
        <a href="#" className="dashboard-taskbar-item">Vật nuôi</a>
        <a href="#" className="dashboard-taskbar-item">Cảnh báo</a>
        <a href="/home-2/profile" className="dashboard-taskbar-item">Hồ sơ</a>
      </nav>

      <section className="dashboard-layout dashboard-layout-with-toggle">
        <input id="dashboardMenuToggleHome" type="checkbox" className="dashboard-menu-toggle" />
        <aside className="dashboard-sidebar dashboard-sidebar-panel">
          {menuItems.map((item, idx) => (
            <a key={item.ten} href={item.href} className={`dashboard-menu-item ${idx === 0 ? "active" : ""}`}>
              <span className="dashboard-menu-icon">{item.icon}</span>
              <span className="dashboard-menu-label">{item.ten}</span>
            </a>
          ))}
        </aside>

        <div className="dashboard-main">
          <section className="dashboard-map-card">
            <div className="dashboard-map-head">
              <span>Bản đồ trang trại</span>
              <span>{mapData?.location_name || `${lat}, ${lng}`}</span>
            </div>
            <MapViewSwitcher
              lat={lat}
              lng={lng}
              zoom={17}
              title="Bản đồ trang trại"
              frameClassName="dashboard-map-frame"
            />
          </section>
        </div>
      </section>
    </main>
  );
}

