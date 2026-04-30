import { db } from "@/lib/db";
import MapViewSwitcher from "@/components/map-view-switcher";
import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";

const isHexColor = (value: unknown) => /^#[0-9a-f]{6}$/i.test(String(value ?? "").trim());
const normalizeText = (v: unknown) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

type KhuLoai = "cropping" | "grazing" | "hay" | "resting" | "nguon_nuoc" | "phuong_tien" | "chan_nuoi" | "dung_cu" | "nha_kho";

type KhuVucBanDo = { id: string; ten: string; loai: string; nhom: KhuLoai; mau: string; tom_tat: string; cap_nhat: string; polygon: Array<{ lat: number; lng: number }> };
type BanDoThongKe = { tai_san: number; cam_bien: number; vat_nuoi: number; khu_vuc: number };
type FarmMapInfo = { farm_name: string; latitude: number; longitude: number; location_name: string | null };

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

async function getLatestFarmMap(ownerId: string): Promise<FarmMapInfo | null> {
  try {
    const result = await db.query(`select f.name as farm_name, l.latitude, l.longitude, l.location_name from du_lieu.nong_trai f join du_lieu.vi_tri_nong_trai l on l.farm_id = f.id where f.owner_id = $1 order by f.created_at desc limit 1`, [ownerId]);
    return (result.rows[0] as FarmMapInfo) || null;
  } catch {
    return null;
  }
}

async function getBanDoThongKe(ownerId: string): Promise<BanDoThongKe> {
  try {
    const [taiSanRs, camBienRs, vatNuoiRs, khuVucRs] = await Promise.all([
      db.query(`select count(*)::int as c from du_lieu.tai_nguyen_nong_trai tn join du_lieu.nong_trai n on n.id = tn.farm_id where n.owner_id = $1`, [ownerId]),
      db.query(`select count(*)::int as c from du_lieu.cam_bien cb join du_lieu.nong_trai_ht nht on nht.id = cb.farm_id join du_lieu.nong_trai n on n.id = nht.id where n.owner_id = $1`, [ownerId]),
      db.query(`select count(*)::int as c from du_lieu.vat_nuoi vn join du_lieu.nong_trai_ht nht on nht.id = vn.farm_id join du_lieu.nong_trai n on n.id = nht.id where n.owner_id = $1`, [ownerId]),
      db.query(`select count(*)::int as c from du_lieu.dong_chan_tha dc join du_lieu.nong_trai n on n.id = dc.farm_id where n.owner_id = $1`, [ownerId]),
    ]);
    return { tai_san: taiSanRs.rows[0]?.c ?? 0, cam_bien: camBienRs.rows[0]?.c ?? 0, vat_nuoi: vatNuoiRs.rows[0]?.c ?? 0, khu_vuc: khuVucRs.rows[0]?.c ?? 0 };
  } catch {
    return { tai_san: 0, cam_bien: 0, vat_nuoi: 0, khu_vuc: 0 };
  }
}

async function getDanhSachKhuVuc(ownerId: string): Promise<KhuVucBanDo[]> {
  try {
    const rs = await db.query(`select dc.id, dc.name, dc.crop_type, dc.status, dc.created_at, dc.boundary_geojson from du_lieu.dong_chan_tha dc join du_lieu.nong_trai n on n.id = dc.farm_id where n.owner_id = $1 order by dc.created_at desc limit 100`, [ownerId]);
    return rs.rows.map((r: any) => {
      const b = r.boundary_geojson ?? {};
      const rawType = normalizeText(b?.metadata?.areaType);
      const kindText = normalizeText([r.crop_type, b?.metadata?.usage, b?.metadata?.notes, b?.metadata?.farmType].join(" "));
      const nhom: KhuLoai = rawType ? detectAreaType(rawType) : detectAreaType(kindText);
      const mau = isHexColor(b?.metadata?.areaColor ?? b?.metadata?.area_color) ? String(b?.metadata?.areaColor ?? b?.metadata?.area_color) : mauMacDinhTheoLoai[nhom];
      const polygon = Array.isArray(b?.geo?.polygon) ? b.geo.polygon.filter((p: any) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))).map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) })) : [];
      return { id: r.id, ten: r.name ?? "Khu vực chưa đặt tên", loai: r.crop_type ?? "Chưa phân loại", nhom, mau, polygon, tom_tat: r.status ? `Trạng thái: ${r.status}` : "Chưa có trạng thái", cap_nhat: r.created_at ? new Date(r.created_at).toLocaleString("vi-VN") : "-" };
    });
  } catch {
    return [];
  }
}

export default async function DashboardMapPage({ searchParams }: { searchParams?: { layer?: string } }) {
  const ownerId = layOwnerIdTuServerCookie();
  const mapData = ownerId ? await getLatestFarmMap(ownerId) : null;
  const [thongKe, khuVuc] = ownerId ? await Promise.all([getBanDoThongKe(ownerId), getDanhSachKhuVuc(ownerId)]) : [{ tai_san: 0, cam_bien: 0, vat_nuoi: 0, khu_vuc: 0 }, []];
  const farmName = mapData?.farm_name || "Trang trại";
  const lat = mapData?.latitude ?? 10.762622;
  const lng = mapData?.longitude ?? 106.660172;
  const layer = searchParams?.layer ?? "all";
  const activeLayer: "all" | KhuLoai = ["all", "cropping", "grazing", "hay", "resting", "nguon_nuoc", "phuong_tien", "chan_nuoi", "dung_cu", "nha_kho"].includes(layer ?? "") ? (layer as "all" | KhuLoai) : "all";
  const filteredKhuVuc = activeLayer === "all" ? khuVuc : khuVuc.filter((item) => item.nhom === activeLayer);
  const zoneOverlays = filteredKhuVuc.filter((item) => item.polygon.length >= 3).map((item) => ({ id: item.id, label: item.ten, color: item.mau, polygon: item.polygon }));
  const filters = [
    ["all", "Tất cả khu vực"], ["cropping", "Trồng trọt"], ["grazing", "Chăn thả"], ["hay", "Cỏ khô"], ["resting", "Nghỉ đất"], ["nguon_nuoc", "Nguồn nước"], ["phuong_tien", "Phương tiện"], ["chan_nuoi", "Chăn nuôi"], ["dung_cu", "Dụng cụ"], ["nha_kho", "Nhà kho"],
  ] as const;

  return (
    <DashboardShell farmName={farmName} activePath="/dashboard/map">
      <div className="page-shell" style={{ padding: 0 }}>
        <section className="card" style={{ padding: 24, display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
            <div>
              <p className="kicker">Bản đồ vận hành</p>
              <h1 className="section-title">Tổ chức lại bản đồ thành một màn hình điều hành rõ ràng.</h1>
              <p className="section-subtitle">Dữ liệu khu vực, lớp lọc và các chỉ số đã được gom vào một bố cục thống nhất để dễ đọc, dễ thao tác hơn.</p>
            </div>
            <a href="/dashboard/zones" className="btn btn-secondary">Quản lý khu vực</a>
          </div>

          <section className="grid-4">
            <article className="card" style={{ padding: 18 }}><span className="muted">Tài sản</span><strong>{thongKe.tai_san}</strong></article>
            <article className="card" style={{ padding: 18 }}><span className="muted">Cảm biến</span><strong>{thongKe.cam_bien}</strong></article>
            <article className="card" style={{ padding: 18 }}><span className="muted">Vật nuôi</span><strong>{thongKe.vat_nuoi}</strong></article>
            <article className="card" style={{ padding: 18 }}><span className="muted">Khu vực</span><strong>{thongKe.khu_vuc}</strong></article>
          </section>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {filters.map(([value, label]) => (
              <a key={value} href={`/dashboard/map?layer=${value}`} className={`btn ${activeLayer === value ? "btn-primary" : "btn-secondary"}`}>
                {label}
              </a>
            ))}
            <span className="muted" style={{ alignSelf: "center", marginLeft: "auto" }}>{mapData?.location_name || `${lat}, ${lng}`}</span>
          </div>

          <div className="card" style={{ padding: 16 }}>
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

        <section className="card" style={{ marginTop: 18, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h2 className="section-title" style={{ fontSize: 24 }}>Danh sách khu vực</h2>
              <p className="section-subtitle" style={{ marginTop: 6 }}>Đồng bộ theo dữ liệu hiện tại trong hệ thống.</p>
            </div>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="grid-4 muted" style={{ fontSize: 13, fontWeight: 700 }}><span>Tên khu vực</span><span>Loại</span><span>Tóm tắt</span><span>Cập nhật</span></div>
            {filteredKhuVuc.map((item) => <div key={item.id} className="card" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, padding: 16, alignItems: "center", borderLeft: `4px solid ${item.mau}` }}><span>{item.ten}</span><span>{item.loai}</span><span className="muted">{item.tom_tat}</span><span className="muted">{item.cap_nhat}</span></div>)}
            {filteredKhuVuc.length === 0 && <p className="muted">Chưa có dữ liệu cho bộ lọc hiện tại.</p>}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
