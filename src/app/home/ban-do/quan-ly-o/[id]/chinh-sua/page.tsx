import { db } from "@/lib/db";
import TopbarUserMenu from "@/components/topbar-user-menu";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import AreaEditWorkbench from "./area-edit-workbench";

type DuLieuBanDau = {
  id: string;
  code: string;
  name: string;
  status: "healthy" | "warning" | "critical";
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
  geo: {
    lat: number;
    lng: number;
    polygon: Array<{ lat: number; lng: number }>;
  };
};

const menuItems = [
  { icon: "🏠", ten: "Tổng quan", href: "/home-2" },
  { icon: "🗺️", ten: "Bản đồ nông trại", href: "/home-2/ban-do" },
  { icon: "🧩", ten: "Quản lý khu vực", href: "/home-2/ban-do/quan-ly-o" },
  { icon: "⚙️", ten: "Hồ sơ", href: "/home-2/profile" },
];

async function getDuLieuKhuVuc(ownerId: string, id: string): Promise<DuLieuBanDau | null> {
  try {
    const rs = await db.query(
      `select dc.id, dc.paddock_code, dc.name, dc.boundary_geojson
       from du_lieu.dong_chan_tha dc
       join du_lieu.nong_trai n on n.id = dc.farm_id
       where n.owner_id = $1 and dc.id = $2
       limit 1`,
      [ownerId, id]
    );
    const r = rs.rows[0];
    if (!r) return null;
    const b = r.boundary_geojson ?? {};
    const metadata = b.metadata ?? {};
    const geo = b.geo ?? {};
    const polygon = Array.isArray(geo.polygon)
      ? geo.polygon
          .filter((p: any) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)))
          .map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
      : [];

    return {
      id: String(r.id),
      code: String(r.paddock_code ?? `AREA-${String(r.id).slice(-6)}`),
      name: String(r.name ?? "Khu vực chưa đặt tên"),
      status: (b.status ?? "healthy") as "healthy" | "warning" | "critical",
      metadata: {
        areaType: String(metadata.areaType ?? "cropping"),
        usage: String(metadata.usage ?? "Trồng trọt"),
        soilType: String(metadata.soilType ?? ""),
        waterSource: String(metadata.waterSource ?? ""),
        manager: String(metadata.manager ?? ""),
        plantingStatus: String(metadata.plantingStatus ?? "Đang hoạt động"),
        notes: String(metadata.notes ?? ""),
        areaColor: String(metadata.areaColor ?? metadata.area_color ?? "#2e7d32"),
        thong_so_theo_loai: (metadata.thong_so_theo_loai ?? {}) as Record<string, unknown>,
      },
      geo: {
        lat: Number(geo.lat ?? polygon[0]?.lat ?? 10.762622),
        lng: Number(geo.lng ?? polygon[0]?.lng ?? 106.660172),
        polygon,
      },
    };
  } catch {
    return null;
  }
}

export default async function ChinhSuaKhuVucPage({ params }: { params: { id: string } }) {
  const ownerId = layOwnerIdTuServerCookie();
  const duLieu = ownerId ? await getDuLieuKhuVuc(ownerId, params.id) : null;

  return (
    <main className="dashboard-page area-page">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-left">
          <label htmlFor="dashboardMenuToggleAreaEdit" className="dashboard-menu-btn">☰</label>
          <strong className="dashboard-brand">KetKat-EcoFarm</strong>
        </div>
        <div className="dashboard-toolbar"><span>🔔</span><TopbarUserMenu /></div>
      </header>
      <section className="dashboard-layout dashboard-layout-with-toggle">
        <input id="dashboardMenuToggleAreaEdit" type="checkbox" className="dashboard-menu-toggle" />
        <aside className="dashboard-sidebar dashboard-sidebar-panel">
          {menuItems.map((item, idx) => (
            <a key={item.ten} href={item.href} className={`dashboard-menu-item ${idx === 2 ? "active" : ""}`}>
              <span className="dashboard-menu-icon">{item.icon}</span>
              <span className="dashboard-menu-label">{item.ten}</span>
            </a>
          ))}
        </aside>
        <div className="dashboard-main">
          {!duLieu ? (
            <section className="area-header-card">
              <h1>Không tìm thấy khu vực để chỉnh sửa</h1>
              <div className="area-header-actions"><a href="/home-2/ban-do/quan-ly-o" className="area-link-btn">← Quay lại danh sách</a></div>
            </section>
          ) : (
            <AreaEditWorkbench initialData={duLieu} />
          )}
        </div>
      </section>
    </main>
  );
}
