import { db } from "@/lib/db";
import TopbarUserMenu from "@/components/topbar-user-menu";
import MapViewSwitcher from "@/components/map-view-switcher";
import { layOwnerIdTuServerCookie } from "@/lib/auth";

type FarmMapInfo = {
  farm_name: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
};

type KhuLoai = "cropping" | "grazing" | "hay" | "resting" | "nguon_nuoc" | "phuong_tien" | "chan_nuoi" | "dung_cu" | "nha_kho";

type KhuVucBanDo = {
  id: string;
  ten: string;
  loai: string;
  nhom: KhuLoai;
  mau: string;
  tom_tat: string;
  cap_nhat: string;
  polygon: Array<{ lat: number; lng: number }>;
};

type BanDoThongKe = {
  tai_san: number;
  cam_bien: number;
  vat_nuoi: number;
  khu_vuc: number;
};

const menuItems = [
  { icon: "🏠", ten: "Tổng quan", href: "/home-2" },
  { icon: "🗺️", ten: "Bản đồ nông trại", href: "/home-2/ban-do" },
  { icon: "🧩", ten: "Quản lý khu vực", href: "/home-2/ban-do/quan-ly-o" },
  { icon: "🐄", ten: "Vật nuôi", href: "#" },
  { icon: "🌧️", ten: "Thời tiết", href: "#" },
  { icon: "⚙️", ten: "Hồ sơ", href: "/home-2/profile" },
];

const normalizeTypeText = (v: unknown) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const isHexColor = (value: unknown) => /^#[0-9a-f]{6}$/i.test(String(value ?? "").trim());

const detectAreaType = (raw: string): KhuLoai => {
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

const mauMacDinhTheoLoai: Record<KhuLoai, string> = {
  cropping: "#2e7d32",
  grazing: "#43a047",
  hay: "#c48a00",
  resting: "#8d6e63",
  nguon_nuoc: "#1e88e5",
  phuong_tien: "#546e7a",
  chan_nuoi: "#fb8c00",
  dung_cu: "#8e24aa",
  nha_kho: "#6d4c41",
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

async function getBanDoThongKe(ownerId: string): Promise<BanDoThongKe> {
  try {
    const [taiSanRs, camBienRs, vatNuoiRs, khuVucRs] = await Promise.all([
      db.query(
        `select count(*)::int as c
         from du_lieu.tai_nguyen_nong_trai tn
         join du_lieu.nong_trai n on n.id = tn.farm_id
         where n.owner_id = $1`,
        [ownerId]
      ),
      db.query(
        `select count(*)::int as c
         from du_lieu.cam_bien cb
         join du_lieu.nong_trai_ht nht on nht.id = cb.farm_id
         join du_lieu.nong_trai n on n.id = nht.id
         where n.owner_id = $1`,
        [ownerId]
      ),
      db.query(
        `select count(*)::int as c
         from du_lieu.vat_nuoi vn
         join du_lieu.nong_trai_ht nht on nht.id = vn.farm_id
         join du_lieu.nong_trai n on n.id = nht.id
         where n.owner_id = $1`,
        [ownerId]
      ),
      db.query(
        `select count(*)::int as c
         from du_lieu.dong_chan_tha dc
         join du_lieu.nong_trai n on n.id = dc.farm_id
         where n.owner_id = $1`,
        [ownerId]
      ),
    ]);

    return {
      tai_san: taiSanRs.rows[0]?.c ?? 0,
      cam_bien: camBienRs.rows[0]?.c ?? 0,
      vat_nuoi: vatNuoiRs.rows[0]?.c ?? 0,
      khu_vuc: khuVucRs.rows[0]?.c ?? 0,
    };
  } catch {
    return { tai_san: 0, cam_bien: 0, vat_nuoi: 0, khu_vuc: 0 };
  }
}

async function getDanhSachKhuVuc(ownerId: string): Promise<KhuVucBanDo[]> {
  try {
    const rs = await db.query(
      `select dc.id, dc.name, dc.crop_type, dc.status, dc.created_at, dc.boundary_geojson
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
      const kindText = normalizeTypeText([r.crop_type, b?.metadata?.usage, b?.metadata?.notes, b?.metadata?.farmType].join(" "));
      const nhom: KhuLoai = rawType ? detectAreaType(rawType) : detectAreaType(kindText);
      const mauTuMeta = b?.metadata?.areaColor ?? b?.metadata?.area_color;
      const mau = isHexColor(mauTuMeta) ? String(mauTuMeta) : mauMacDinhTheoLoai[nhom];
      const polygon = Array.isArray(b?.geo?.polygon)
        ? b.geo.polygon
            .filter((p: any) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)))
            .map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
        : [];

      return {
        id: r.id,
        ten: r.name ?? "Khu vực chưa đặt tên",
        loai: r.crop_type ?? "Chưa phân loại",
        nhom,
        mau,
        polygon,
        tom_tat: r.status ? `Trạng thái: ${r.status}` : "Chưa có trạng thái",
        cap_nhat: r.created_at ? new Date(r.created_at).toLocaleString("vi-VN") : "-",
      };
    });
  } catch {
    return [];
  }
}

export default async function BanDoTrangTraiPage({ searchParams }: { searchParams?: { layer?: string } }) {
  const ownerId = layOwnerIdTuServerCookie();
  const mapData = ownerId ? await getLatestFarmMap(ownerId) : null;
  const [thongKe, khuVuc] = ownerId
    ? await Promise.all([getBanDoThongKe(ownerId), getDanhSachKhuVuc(ownerId)])
    : [{ tai_san: 0, cam_bien: 0, vat_nuoi: 0, khu_vuc: 0 }, []];
  const farmName = mapData?.farm_name || "Trang trại";
  const lat = mapData?.latitude ?? 10.762622;
  const lng = mapData?.longitude ?? 106.660172;
  const layer = searchParams?.layer ?? "all";
  const activeLayer: "all" | KhuLoai = ["all", "cropping", "grazing", "hay", "resting", "nguon_nuoc", "phuong_tien", "chan_nuoi", "dung_cu", "nha_kho"].includes(layer ?? "")
    ? (layer as "all" | KhuLoai)
    : "all";
  const filteredKhuVuc = activeLayer === "all" ? khuVuc : khuVuc.filter((item) => item.nhom === activeLayer);
  const zoneOverlays = filteredKhuVuc
    .filter((item) => item.polygon.length >= 3)
    .map((item) => ({ id: item.id, label: item.ten, color: item.mau, polygon: item.polygon }));

  return (
    <main className="dashboard-page farm-map-page">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-left">
          <label htmlFor="dashboardMenuToggleMap" className="dashboard-menu-btn" aria-label="Ẩn hiện menu">☰</label>
          <div>
            <p className="farm-map-eyebrow">Bản đồ trang trại</p>
            <strong className="dashboard-brand">{farmName}</strong>
          </div>
        </div>
        <div className="dashboard-toolbar"><span>🔔</span><TopbarUserMenu /></div>
      </header>

      <nav className="dashboard-taskbar farm-map-nav">
        <a href="/home-2" className="dashboard-taskbar-item">Tổng quan</a>
        <a href="/home-2/ban-do" className="dashboard-taskbar-item active">Bản đồ nông trại</a>
        <a href="/home-2/ban-do/quan-ly-o" className="dashboard-taskbar-item">Quản lý khu vực</a>
        <a href="#" className="dashboard-taskbar-item">Vật nuôi</a>
        <a href="#" className="dashboard-taskbar-item">Cảnh báo</a>
        <a href="/home-2/profile" className="dashboard-taskbar-item">Hồ sơ</a>
      </nav>

      <section className="dashboard-layout dashboard-layout-with-toggle">
        <input id="dashboardMenuToggleMap" type="checkbox" className="dashboard-menu-toggle" />
        <aside className="dashboard-sidebar dashboard-sidebar-panel">
          {menuItems.map((item, idx) => (
            <a key={item.ten} href={item.href} className={`dashboard-menu-item ${idx === 1 ? "active" : ""}`}>
              <span className="dashboard-menu-icon">{item.icon}</span>
              <span className="dashboard-menu-label">{item.ten}</span>
            </a>
          ))}
        </aside>

        <div className="dashboard-main">
          <section className="farm-map-kpis">
            <article className="farm-map-kpi-card">
              <span>Tài sản</span>
              <strong>{thongKe.tai_san}</strong>
            </article>
            <article className="farm-map-kpi-card">
              <span>Cảm biến</span>
              <strong>{thongKe.cam_bien}</strong>
            </article>
            <article className="farm-map-kpi-card">
              <span>Vật nuôi</span>
              <strong>{thongKe.vat_nuoi}</strong>
            </article>
            <article className="farm-map-kpi-card">
              <span>Khu vực</span>
              <strong>{thongKe.khu_vuc}</strong>
            </article>
          </section>

          <section className="farm-map-panel">
            <div className="farm-map-panel-head">
              <div className="farm-map-filters">
                <a href="/home-2/ban-do?layer=all" className={activeLayer === "all" ? "active" : ""}>Tất cả khu vực</a>
                <a href="/home-2/ban-do?layer=cropping" className={activeLayer === "cropping" ? "active" : ""}>Trồng trọt</a>
                <a href="/home-2/ban-do?layer=grazing" className={activeLayer === "grazing" ? "active" : ""}>Chăn thả</a>
                <a href="/home-2/ban-do?layer=hay" className={activeLayer === "hay" ? "active" : ""}>Cỏ khô</a>
                <a href="/home-2/ban-do?layer=resting" className={activeLayer === "resting" ? "active" : ""}>Nghỉ đất</a>
                <a href="/home-2/ban-do?layer=nguon_nuoc" className={activeLayer === "nguon_nuoc" ? "active" : ""}>Nguồn nước</a>
                <a href="/home-2/ban-do?layer=phuong_tien" className={activeLayer === "phuong_tien" ? "active" : ""}>Phương tiện</a>
                <a href="/home-2/ban-do?layer=chan_nuoi" className={activeLayer === "chan_nuoi" ? "active" : ""}>Chăn nuôi</a>
                <a href="/home-2/ban-do?layer=dung_cu" className={activeLayer === "dung_cu" ? "active" : ""}>Dụng cụ</a>
                <a href="/home-2/ban-do?layer=nha_kho" className={activeLayer === "nha_kho" ? "active" : ""}>Nhà kho</a>
              </div>
              <span>{mapData?.location_name || `${lat}, ${lng}`}</span>
            </div>

            <div className="farm-map-canvas-wrap">
              <MapViewSwitcher
                lat={lat}
                lng={lng}
                zoom={17}
                title="Bản đồ khu vực trang trại"
                frameClassName="farm-map-canvas"
                zones={zoneOverlays}
                fitToPolygon={zoneOverlays.length > 0}
              />
            </div>
          </section>

          <section className="farm-map-table-card">
            <div className="farm-map-table-head">
              <h2>Danh sách khu vực đã set trên bản đồ</h2>
              <span>Đồng bộ theo dữ liệu hệ thống</span>
            </div>
            <div className="farm-map-table">
              <div className="row header">
                <span>Tên khu vực</span>
                <span>Loại</span>
                <span>Tóm tắt</span>
                <span>Cập nhật</span>
              </div>
              {filteredKhuVuc.map((item) => (
                <div className="row" key={item.id}>
                  <span>{item.ten}</span>
                  <span>{item.loai}</span>
                  <span>{item.tom_tat}</span>
                  <span>{item.cap_nhat}</span>
                </div>
              ))}
              {filteredKhuVuc.length === 0 && (
                <div className="row">
                  <span>Chưa có dữ liệu</span>
                  <span>-</span>
                  <span>Hiện chưa có khu vực nào trong cơ sở dữ liệu</span>
                  <span>-</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

