import DashboardShell from "@/components/dashboard-shell";
import MapViewSwitcher from "@/components/map-view-switcher";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import styles from "./page.module.css";

const normalizeText = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const isHexColor = (value: unknown) => /^#[0-9a-f]{6}$/i.test(String(value ?? "").trim());

type OLoai = "cropping" | "grazing" | "hay" | "resting" | "nguon_nuoc" | "phuong_tien" | "chan_nuoi" | "dung_cu" | "nha_kho";

type OQuanLy = {
  id: string;
  ten: string;
  loai: string;
  nhom: OLoai;
  dac_tinh: string;
  suc_chua: string;
  colorHex: string;
  areaHa: number;
  icon: string;
  pointCount: number;
  createdAt: string;
  polygon: Array<{ lat: number; lng: number }>;
  biHuy: boolean;
};

type FarmMapInfo = { farm_name: string; latitude: number; longitude: number; location_name: string | null };

const zoneColorByType: Record<OLoai, string> = {
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
      const rawType = normalizeText(b?.metadata?.areaType);
      const typeText = normalizeText([b?.metadata?.usage, r.crop_type, b?.metadata?.notes, b?.metadata?.farmType].join(" "));
      const nhom: OLoai = rawType ? detectAreaType(rawType) : detectAreaType(typeText);
      const mapIcon: Record<OLoai, string> = {
        cropping: "🌱",
        grazing: "🐄",
        hay: "🌾",
        resting: "🟫",
        nguon_nuoc: "💧",
        phuong_tien: "🚜",
        chan_nuoi: "🐄",
        dung_cu: "🧰",
        nha_kho: "🏚️",
      };
      const colorValue = b?.metadata?.areaColor ?? b?.metadata?.area_color;
      const colorHex = isHexColor(colorValue) ? String(colorValue) : zoneColorByType[nhom];
      const biHuy = String(r.status ?? "").toLowerCase() === "cancelled" || String(b?.status ?? "").toLowerCase() === "cancelled";
      const polygon = Array.isArray(b?.geo?.polygon)
        ? b.geo.polygon.filter((p: any) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))).map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
        : [];

      return {
        id: r.id,
        ten: r.name ?? "Ô chưa đặt tên",
        loai: r.crop_type ?? "Chưa phân loại",
        nhom,
        dac_tinh: r.grazing_status ?? "Chưa cập nhật",
        suc_chua: biHuy ? "Đã hủy" : r.status ?? "-",
        areaHa: Number(r.area_ha ?? b?.metadata?.areaHecta ?? 0),
        icon: mapIcon[nhom],
        pointCount: polygon.length,
        createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString("vi-VN") : "-",
        polygon,
        colorHex,
        biHuy,
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

export default async function DashboardZonesPage({ searchParams }: { searchParams?: { layer?: string; trang_thai?: string } }) {
  const ownerId = layOwnerIdTuServerCookie();
  const mapData = ownerId ? await getLatestFarmMap(ownerId) : null;
  const dsO = ownerId ? await getDanhSachO(ownerId) : [];
  const farmName = mapData?.farm_name || "Trang trại";
  const lat = mapData?.latitude ?? 10.762622;
  const lng = mapData?.longitude ?? 106.660172;
  const layer = searchParams?.layer ?? "all";
  const trangThai = searchParams?.trang_thai ?? "hoat_dong";
  const activeLayer: "all" | OLoai = ["all", "cropping", "grazing", "hay", "resting", "nguon_nuoc", "phuong_tien", "chan_nuoi", "dung_cu", "nha_kho"].includes(layer ?? "") ? (layer as "all" | OLoai) : "all";
  const activeStatus: "hoat_dong" | "huy" | "tat_ca" = ["hoat_dong", "huy", "tat_ca"].includes(trangThai) ? (trangThai as "hoat_dong" | "huy" | "tat_ca") : "hoat_dong";
  const dsTheoTrangThai = activeStatus === "tat_ca" ? dsO : dsO.filter((o) => (activeStatus === "huy" ? o.biHuy : !o.biHuy));
  const dsOHienThi = activeLayer === "all" ? dsTheoTrangThai : dsTheoTrangThai.filter((o) => o.nhom === activeLayer);
  const dsHuy = dsO.filter((o) => o.biHuy);
  const zoneOverlays = dsOHienThi.filter((o) => !o.biHuy && o.polygon.length >= 3).map((o) => ({ id: o.id, label: o.ten, color: o.colorHex, polygon: o.polygon }));
  const layerFilters = [["all", "Tất cả"], ["cropping", "Trồng trọt"], ["grazing", "Chăn thả"], ["hay", "Cỏ khô"], ["resting", "Nghỉ đất"], ["nguon_nuoc", "Nguồn nước"], ["phuong_tien", "Phương tiện"], ["chan_nuoi", "Chăn nuôi"], ["dung_cu", "Dụng cụ"], ["nha_kho", "Nhà kho"]] as const;
const statusFilters = [["hoat_dong", "Đang hoạt động"], ["huy", "Đã hủy"], ["tat_ca", "Tất cả trạng thái"]] as const;
const zoneTypeLabel: Record<OLoai, string> = {
  cropping: "Trồng trọt",
  grazing: "Chăn thả",
  hay: "Cỏ khô",
  resting: "Nghỉ đất",
  nguon_nuoc: "Nguồn nước",
  phuong_tien: "Phương tiện",
  chan_nuoi: "Chăn nuôi",
  dung_cu: "Dụng cụ",
  nha_kho: "Nhà kho",
};

  return (
    <DashboardShell farmName={farmName} activePath="/dashboard/zones">
      <div className={styles.page}>
        <section className={styles.topHero}>
          <div className={styles.heroCopy}>
            <p className={styles.sectionLabel}>Quản lý khu vực</p>
            <div className={styles.heroTitleRow}>
              <div>
                <h1 className={styles.heroTitle}>Khu vực chăn nuôi</h1>
                <p className={styles.heroSub}>Theo dõi khu vực bằng bản đồ thực tế, dữ liệu lấy trực tiếp từ cơ sở dữ liệu.</p>
              </div>
              <div className={styles.topIcons}>
                <span>◌</span>
                <span>◌</span>
                <span>◌</span>
                <span>TK</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.filterBar}>
          <div className={styles.filterGroup}>
            {layerFilters.map(([value, label]) => (
              <a key={value} href={`/dashboard/zones?layer=${value}&trang_thai=${activeStatus}`} className={`${styles.filterChip} ${activeLayer === value ? styles.filterChipActive : ""}`}>
                {label}
              </a>
            ))}
          </div>
          <div className={styles.filterGroup}>
            {statusFilters.map(([value, label]) => (
              <a key={value} href={`/dashboard/zones?layer=${activeLayer}&trang_thai=${value}`} className={`${styles.filterChip} ${activeStatus === value ? styles.filterChipActive : ""}`}>
                {label}
              </a>
            ))}
          </div>
        </section>

        <section className={styles.previewGrid}>
          {dsOHienThi.slice(0, 9).map((o) => (
            <article key={o.id} className={styles.previewCard} style={{ borderColor: o.colorHex }}>
              <div className={styles.previewMapWrap}>
                <MapViewSwitcher
                  lat={lat}
                  lng={lng}
                  zoom={17}
                  title={`Bản đồ khu vực ${o.ten}`}
                  frameClassName={styles.previewMap}
                  zones={[{ id: o.id, label: o.ten, color: o.colorHex, polygon: o.polygon }]}
                  fitToPolygon={o.polygon.length >= 3}
                  hideModeTabs
                  hideEcoNote
                  lockMap
                />
                <div className={styles.previewMapBadge} style={{ background: o.colorHex }}>
                  {zoneTypeLabel[o.nhom]}
                </div>
              </div>
              <div className={styles.previewCardTop}>
                <div className={styles.previewCardTitle}>
                  <h3>{o.ten}</h3>
                  <p>{zoneTypeLabel[o.nhom]} · {o.loai}</p>
                </div>
              </div>
              <div className={styles.previewCardBody}>
                <div>
                  <span>Đặc tính</span>
                  <strong>{o.dac_tinh}</strong>
                </div>
                <div>
                  <span>Diện tích</span>
                  <strong>{o.areaHa.toFixed(2)} ha</strong>
                </div>
                <div>
                  <span>Số đỉnh</span>
                  <strong>{o.pointCount}</strong>
                </div>
                <div>
                  <span>Ngày tạo</span>
                  <strong>{o.createdAt}</strong>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.mapSection}>
          <div className={styles.mapHeader}>
            <div>
              <p className={styles.sectionLabel}>Bản đồ tổng quan</p>
              <h2>Hiển thị toàn bộ khu vực đang có</h2>
            </div>
            <div className={styles.mapHeaderActions}>
              <span className={styles.statusPill}>Dữ liệu thật</span>
              <span className={styles.statusPillActive}>Bản đồ</span>
              <span className={styles.statusPill}>Tọa độ</span>
              <span className={styles.statusPillMuted}>CSDL</span>
            </div>
          </div>
          <MapViewSwitcher lat={lat} lng={lng} zoom={15} title="Bản đồ tổng quan khu vực" frameClassName={styles.mapFrame} zones={zoneOverlays} fitToPolygon={zoneOverlays.length > 0} />
        </section>
      </div>
    </DashboardShell>
  );
}
