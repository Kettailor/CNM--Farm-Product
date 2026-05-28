import { db } from "@/lib/db";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

const isHexColor = (value: unknown) => /^#[0-9a-f]{6}$/i.test(String(value ?? "").trim());
const normalizeText = (v: unknown) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

type KhuLoai = "cropping" | "grazing" | "hay" | "resting" | "nguon_nuoc" | "phuong_tien" | "chan_nuoi" | "dung_cu" | "nha_kho";

type KhuVucBanDo = { id: string; ten: string; loai: string; nhom: KhuLoai; mau: string; tom_tat: string; cap_nhat: string; polygon: Array<{ lat: number; lng: number }> };
type BanDoThongKe = { tai_san: number; cam_bien: number; vat_nuoi: number; khu_vuc: number };
type FarmMapInfo = { farm_name: string; latitude: number; longitude: number; location_name: string | null };
type MapObjectRow = { id: string | number; ten_doi_tuong?: string | null; loai_doi_tuong?: string | null; hinh_hoc_geojson?: { lat?: number | string; lng?: number | string; coordinates?: [number, number] | number[]; geo?: { lat?: number | string; lng?: number | string; coordinates?: [number, number] | number[] } } | null };
type KhuVucRow = { id: string | number; ten_khu_vuc?: string | null; crop_type?: string | null; status?: string | null; created_at?: string | Date | null; hinh_hoc_geojson?: { metadata?: { areaType?: string; usage?: string; notes?: string; farmType?: string; areaColor?: string; area_color?: string }; geo?: { polygon?: Array<{ lat?: number | string; lng?: number | string }> } } | null };

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
    const result = await db.query(
      `select t.ten_trang_trai as farm_name, v.vi_do as latitude, v.kinh_do as longitude, v.ten_dia_diem as location_name
       from du_lieu.trang_trai t
       left join du_lieu.vi_tri_trang_trai v on v.trang_trai_id = t.id
       where t.chu_so_huu_id = $1
       order by t.created_at desc
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
      db.query(`select count(*)::int as c from du_lieu.tai_san_rao ts join du_lieu.trang_trai t on t.id = ts.trang_trai_id where t.chu_so_huu_id = $1`, [ownerId]),
      db.query(`select count(*)::int as c from du_lieu.doi_tuong_ban_do dt join du_lieu.trang_trai t on t.id = dt.trang_trai_id where t.chu_so_huu_id = $1 and dt.loai_doi_tuong = 'sensor'`, [ownerId]),
      db.query(`select count(*)::int as c from du_lieu.vat_nuoi vn join du_lieu.trang_trai t on t.id = vn.trang_trai_id where t.chu_so_huu_id = $1`, [ownerId]),
      db.query(`select count(*)::int as c from du_lieu.khu_vuc kv join du_lieu.trang_trai t on t.id = kv.trang_trai_id where t.chu_so_huu_id = $1`, [ownerId]),
    ]);
    return { tai_san: taiSanRs.rows[0]?.c ?? 0, cam_bien: camBienRs.rows[0]?.c ?? 0, vat_nuoi: vatNuoiRs.rows[0]?.c ?? 0, khu_vuc: khuVucRs.rows[0]?.c ?? 0 };
  } catch {
    return { tai_san: 0, cam_bien: 0, vat_nuoi: 0, khu_vuc: 0 };
  }
}

async function getMapObjects(ownerId: string) {
  try {
    const rs = await db.query(
      `select dt.id, dt.ten_doi_tuong, dt.loai_doi_tuong, dt.hinh_hoc_geojson, dt.metadata_json
       from du_lieu.doi_tuong_ban_do dt
       join du_lieu.trang_trai t on t.id = dt.trang_trai_id
       where t.chu_so_huu_id = $1
       order by dt.created_at desc
       limit 200`,
      [ownerId]
    );
    return rs.rows.flatMap((r: MapObjectRow) => {
      const geo = r.hinh_hoc_geojson ?? {};
      const point = Array.isArray(geo.coordinates) ? geo.coordinates : Array.isArray(geo.geo?.coordinates) ? geo.geo.coordinates : null;
      const lat = Number(geo.lat ?? geo.geo?.lat ?? point?.[1] ?? NaN);
      const lng = Number(geo.lng ?? geo.geo?.lng ?? point?.[0] ?? NaN);
      const isPoint = Number.isFinite(lat) && Number.isFinite(lng);
      return isPoint
        ? [{ id: String(r.id), label: String(r.ten_doi_tuong ?? r.loai_doi_tuong), color: "#2563eb", kind: String(r.loai_doi_tuong), geometry: { type: "Point" as const, coordinates: [lng, lat] as [number, number] } }]
        : [];
    });
  } catch {
    return [];
  }
}

async function getDanhSachKhuVuc(ownerId: string): Promise<KhuVucBanDo[]> {
  try {
    const rs = await db.query(
      `select kv.id, kv.ten_khu_vuc as name, loai.ten as crop_type, kv.trang_thai as status, kv.created_at, kv.hinh_hoc_geojson
       from du_lieu.khu_vuc kv
       join du_lieu.trang_trai t on t.id = kv.trang_trai_id
       left join du_lieu.danh_muc_loai_khu_vuc loai on loai.id = kv.loai_khu_vuc_id
       where t.chu_so_huu_id = $1
       order by kv.created_at desc
       limit 100`,
      [ownerId]
    );
    return rs.rows.map((r: KhuVucRow) => {
      const b = r.hinh_hoc_geojson ?? {};
      const rawType = normalizeText(b?.metadata?.areaType);
      const kindText = normalizeText([r.crop_type, b?.metadata?.usage, b?.metadata?.notes, b?.metadata?.farmType].join(" "));
      const nhom: KhuLoai = rawType ? detectAreaType(rawType) : detectAreaType(kindText);
      const mau = isHexColor(b?.metadata?.areaColor ?? b?.metadata?.area_color) ? String(b?.metadata?.areaColor ?? b?.metadata?.area_color) : mauMacDinhTheoLoai[nhom];
      const polygon = Array.isArray(b?.geo?.polygon) ? b.geo.polygon.filter((p): p is { lat?: number | string; lng?: number | string } => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))).map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) })) : [];
      return { id: String(r.id), ten: r.ten_khu_vuc ?? "Khu vực chưa đặt tên", loai: r.crop_type ?? "Chưa phân loại", nhom, mau, polygon, tom_tat: r.status ? `Trạng thái: ${r.status}` : "Chưa có trạng thái", cap_nhat: r.created_at ? new Date(r.created_at).toLocaleString("vi-VN") : "-" };
    });
  } catch {
    return [];
  }
}

export default async function DashboardMapPage({ searchParams }: { searchParams?: { layer?: string } }) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/map");

  const mapData = await getLatestFarmMap(ownerId);
  const [thongKe, khuVuc, mapObjects] = ownerId ? await Promise.all([getBanDoThongKe(ownerId), getDanhSachKhuVuc(ownerId), getMapObjects(ownerId)]) : [{ tai_san: 0, cam_bien: 0, vat_nuoi: 0, khu_vuc: 0 }, [], []];
  const farmName = mapData?.farm_name || "Trang trại";
  const lat = mapData?.latitude ?? 10.762622;
  const lng = mapData?.longitude ?? 106.660172;
  const layer = searchParams?.layer ?? "all";
  const activeLayer: "all" | KhuLoai = ["all", "cropping", "grazing", "hay", "resting", "nguon_nuoc", "phuong_tien", "chan_nuoi", "dung_cu", "nha_kho"].includes(layer ?? "") ? (layer as "all" | KhuLoai) : "all";
  const filteredKhuVuc = activeLayer === "all" ? khuVuc : khuVuc.filter((item) => item.nhom === activeLayer);
  const zoneOverlays = filteredKhuVuc.filter((item) => item.polygon.length >= 3).map((item) => ({ id: item.id, label: item.ten, color: item.mau, polygon: item.polygon, kind: item.nhom }));
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
            <a href="/dashboard/khu-vuc" className="btn btn-secondary">Quản lý khu vực</a>
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
              objects={mapObjects}
              fitToPolygon={zoneOverlays.length > 0 || mapObjects.length > 0}
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
