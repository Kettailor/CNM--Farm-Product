import { db } from "@/lib/db";
import { cookies } from "next/headers";
import TopbarUserMenu from "@/components/topbar-user-menu";
import AreaEditorWorkbench from "./area-editor-workbench";

type FarmMapInfo = {
  farm_name: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  farm_area_hectare: number | null;
};

const menuItems = [
  { icon: "🏠", ten: "Tổng quan", href: "/home-2" },
  { icon: "🗺️", ten: "Bản đồ nông trại", href: "/home-2/ban-do" },
  { icon: "🧩", ten: "Quản lý khu vực", href: "/home-2/ban-do/quan-ly-o" },
  { icon: "🐄", ten: "Vật nuôi", href: "#" },
  { icon: "⚙️", ten: "Profile", href: "/home-2/profile" },
];

async function getLatestFarmMap(ownerId: string): Promise<FarmMapInfo | null> {
  try {
    const result = await db.query(
      `select f.name as farm_name, f.farm_area_hectare, l.latitude, l.longitude, l.location_name
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

export default async function TaoOMoiPage() {
  const ownerId = cookies().get("ownerId")?.value;
  const mapData = ownerId ? await getLatestFarmMap(ownerId) : null;
  const farmName = mapData?.farm_name || "Trang trại";
  const lat = Number(mapData?.latitude ?? 10.762622);
  const lng = Number(mapData?.longitude ?? 106.660172);
  const farmArea = Number(mapData?.farm_area_hectare ?? 0);
  const areaNumber = Number.isFinite(farmArea) ? farmArea : 0;
  const zoomLevel = areaNumber >= 300 ? 11 : areaNumber >= 80 ? 12 : areaNumber >= 20 ? 13 : 15;
  const boundaryScale = areaNumber > 0 ? Math.min(1.18, Math.max(0.52, 0.52 + Math.log10(areaNumber + 1) * 0.28)) : 0.52;

  return (
    <main className="dashboard-page area-page">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-left">
          <label htmlFor="dashboardMenuToggleCreateArea" className="dashboard-menu-btn">☰</label>
          <strong className="dashboard-brand">{farmName}</strong>
        </div>
        <div className="dashboard-toolbar"><span>🔔</span><TopbarUserMenu /></div>
      </header>

      <nav className="dashboard-taskbar">
        <a href="/home-2" className="dashboard-taskbar-item">Tổng quan</a>
        <a href="/home-2/ban-do" className="dashboard-taskbar-item">Bản đồ nông trại</a>
        <a href="/home-2/ban-do/quan-ly-o" className="dashboard-taskbar-item active">Quản lý khu vực</a>
        <a href="#" className="dashboard-taskbar-item">Cảnh báo</a>
      </nav>

      <section className="dashboard-layout dashboard-layout-with-toggle">
        <input id="dashboardMenuToggleCreateArea" type="checkbox" className="dashboard-menu-toggle" />
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
            <h1>Tạo khu vực mới trên bản đồ vệ tinh</h1>
            <div className="area-header-actions">
              <a href="/home-2/ban-do/quan-ly-o" className="area-link-btn">← Danh sách khu vực</a>
              <button type="submit" form="area-create-form" className="primary">Lưu khu vực</button>
            </div>
          </section>

          <AreaEditorWorkbench
            lat={lat}
            lng={lng}
            zoomLevel={zoomLevel}
            boundaryScale={boundaryScale}
            farmArea={areaNumber}
          />
        </div>
      </section>
    </main>
  );
}

