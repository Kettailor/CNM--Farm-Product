import DashboardShell from "@/components/dashboard-shell";
import DashboardTopActions from "@/components/dashboard-top-actions";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { redirect } from "next/navigation";
import styles from "../page.module.css";

type WaterSourceRow = {
  id: string | number;
  ten_nguon_nuoc?: string | null;
  loai_nguon_nuoc?: string | null;
  trang_thai?: string | null;
  muc_nuoc?: number | string | null;
  chat_luong?: string | null;
  vi_tri?: string | null;
  ghi_chu?: string | null;
  cap_nhat?: string | Date | null;
  hinh_hoc_geojson?: { lat?: number | string; lng?: number | string } | null;
};

type WaterSourceItem = {
  id: string;
  name: string;
  type: string;
  status: string;
  level: number;
  quality: string;
  location: string;
  note: string;
  updatedAt: string;
  accent: string;
  lat?: number;
  lng?: number;
};

const waterAccentPalette = ["#1d4ed8", "#0ea5e9", "#14b8a6", "#22c55e", "#f59e0b", "#ef4444"];
const statusFilters = ["Tất cả", "Tốt", "Cảnh báo", "Đang theo dõi", "Mất kết nối"] as const;
const sampleWaterSources: WaterSourceItem[] = [
  { id: "sample-1", name: "Hồ tưới chính", type: "Ao chứa", status: "Tốt", level: 82, quality: "Độ đục thấp", location: "Khu A - phía Đông", note: "Cấp nước cho khu chăn nuôi và trồng trọt", updatedAt: "04/05/2026 07:45", accent: "#1d4ed8", lat: 10.7641, lng: 106.6621 },
  { id: "sample-2", name: "Giếng khoan số 2", type: "Giếng khoan", status: "Cảnh báo", level: 41, quality: "Cần kiểm tra lọc", location: "Khu trung tâm", note: "Mực nước giảm nhẹ so với tuần trước", updatedAt: "04/05/2026 06:20", accent: "#0ea5e9", lat: 10.7619, lng: 106.6584 },
  { id: "sample-3", name: "Bể dự trữ miền Tây", type: "Bể chứa", status: "Đang theo dõi", level: 67, quality: "Ổn định", location: "Cụm kỹ thuật", note: "Đủ dùng cho 3 ngày vận hành", updatedAt: "03/05/2026 18:10", accent: "#14b8a6", lat: 10.7588, lng: 106.6652 },
  { id: "sample-4", name: "Kênh dẫn số 1", type: "Kênh mương", status: "Tốt", level: 93, quality: "Nước trong", location: "Ranh giới phía Bắc", note: "Đã vệ sinh định kỳ", updatedAt: "03/05/2026 16:40", accent: "#22c55e", lat: 10.7662, lng: 106.6579 },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function normalizeStatus(status: string | null | undefined) {
  const value = String(status ?? "").trim().toLowerCase();
  if (!value) return "Đang theo dõi";
  if (value.includes("good") || value.includes("tot") || value.includes("ổn") || value.includes("binh thuong")) return "Tốt";
  if (value.includes("warning") || value.includes("canh bao")) return "Cảnh báo";
  if (value.includes("offline") || value.includes("mat")) return "Mất kết nối";
  return String(status);
}

function parseLevel(level: unknown) {
  const n = Number(level);
  if (!Number.isFinite(n)) return 68;
  return Math.max(0, Math.min(100, n <= 1 ? n * 100 : n));
}

function matchesFilter(item: WaterSourceItem, q: string, status: string, type: string) {
  const haystack = [item.name, item.type, item.status, item.quality, item.location, item.note].join(" ").toLowerCase();
  const queryOk = q ? haystack.includes(q.toLowerCase()) : true;
  const statusOk = status === "Tất cả" ? true : item.status === status;
  const typeOk = type ? item.type.toLowerCase().includes(type.toLowerCase()) : true;
  return queryOk && statusOk && typeOk;
}

async function loadWaterSources(farmId: string): Promise<WaterSourceItem[]> {
  try {
    const result = await db.query(
      `select id, ten_nguon_nuoc, loai_nguon_nuoc, trang_thai, muc_nuoc, chat_luong, vi_tri, ghi_chu, cap_nhat, hinh_hoc_geojson
       from du_lieu.nguon_nuoc
       where trang_trai_id = $1
       order by cap_nhat desc nulls last, id desc
       limit 100`,
      [farmId]
    );

    return result.rows.map((row: WaterSourceRow, index) => ({
      id: String(row.id),
      name: String(row.ten_nguon_nuoc ?? "Nguồn nước chưa đặt tên"),
      type: String(row.loai_nguon_nuoc ?? "Không xác định"),
      status: normalizeStatus(row.trang_thai),
      level: parseLevel(row.muc_nuoc),
      quality: String(row.chat_luong ?? "Chưa đánh giá"),
      location: String(row.vi_tri ?? "Chưa xác định"),
      note: String(row.ghi_chu ?? "-"),
      updatedAt: row.cap_nhat ? new Date(row.cap_nhat).toLocaleString("vi-VN") : "-",
      accent: waterAccentPalette[index % waterAccentPalette.length],
      lat: Number(row.hinh_hoc_geojson?.lat),
      lng: Number(row.hinh_hoc_geojson?.lng),
    }));
  } catch {
    return [];
  }
}

export default async function NguonNuocPage({ searchParams }: { searchParams?: { q?: string; status?: string; type?: string } }) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/nguon_nuoc");

  const overview = await getDashboardOverview(ownerId);
  if (!overview.farmId) redirect("/register/farm");

  const farmName = overview.farmName;
  const dbSources = await loadWaterSources(overview.farmId);
  const dataSources = dbSources.length > 0 ? dbSources : sampleWaterSources;
  const q = searchParams?.q ?? "";
  const status = searchParams?.status ?? "Tất cả";
  const type = searchParams?.type ?? "";
  const sources = dataSources.filter((item) => matchesFilter(item, q, status, type));
  const activeCount = dataSources.filter((item) => item.status !== "Mất kết nối").length;
  const warningCount = dataSources.filter((item) => item.status === "Cảnh báo").length;
  const avgLevel = dataSources.length > 0 ? Math.round(dataSources.reduce((sum, item) => sum + item.level, 0) / dataSources.length) : 0;
  const latestSource = dataSources[0] ?? null;
  const lat = overview.latitude;
  const lng = overview.longitude;
  const typeSuggestions = Array.from(new Set(dataSources.map((item) => item.type).filter(Boolean))).slice(0, 6);

  return (
    <DashboardShell farmName={farmName} activePath="/dashboard/nguon_nuoc">
      <div className={styles.dashboardWrap}>
        <section className={styles.topBar}>
          <div className={styles.pageTitle}>
            <div className={styles.pageIcon}>◉</div>
            <div>
              <p className={styles.pageEyebrow}>Quản lý nguồn nước</p>
              <h1>{farmName}</h1>
            </div>
          </div>
          <DashboardTopActions />
        </section>

        <section className={styles.heroStrip}>
          <div className={styles.heroHeader}>
            <div>
              <div className={styles.heroLabel}>Theo dõi theo vị trí thực tế</div>
              <p className={styles.heroDesc}>Bản đồ luôn lấy theo tọa độ trang trại từ cơ sở dữ liệu, kèm bộ lọc, tìm kiếm và danh sách nguồn nước đang vận hành.</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="/dashboard/nguon_nuoc/new" className="btn btn-primary">Tạo mới nguồn nước</a>
              <a href="/dashboard/nguon_nuoc" className="btn btn-secondary">Làm mới</a>
            </div>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.heroStat}><span>Tổng nguồn</span><strong>{formatNumber(dataSources.length)}</strong></div>
            <div className={styles.heroStat}><span>Đang hoạt động</span><strong>{formatNumber(activeCount)}</strong></div>
            <div className={styles.heroStat}><span>Cảnh báo</span><strong>{formatNumber(warningCount)}</strong></div>
            <div className={styles.heroStat}><span>Mức trung bình</span><strong>{formatNumber(avgLevel)}%</strong></div>
            <div className={styles.heroStat}><span>Trang trại</span><strong>{formatNumber(overview.metrics.zones || 0)}</strong></div>
            <div className={styles.heroStat}><span>Cảm biến</span><strong>{formatNumber(overview.metrics.sensors || 0)}</strong></div>
          </div>

          <div className={styles.cardGrid}>
            {dataSources.slice(0, 4).map((item) => (
              <article key={item.id} className={styles.moduleCard} style={{ borderTop: `4px solid ${item.accent}` }}>
                <div className={styles.moduleHead}>
                  <div className={styles.moduleIcon}>💧</div>
                  <div>
                    <h3>{item.name}</h3>
                    <span className={styles.demoBadge}>{item.type}</span>
                  </div>
                </div>
                <div className={styles.moduleBody}>
                  <div className={styles.moduleRow}><span className={styles.moduleDot} /><span>Trạng thái</span><strong>{item.status}</strong></div>
                  <div className={styles.moduleRow}><span className={styles.moduleDot} /><span>Mức nước</span><strong>{item.level}%</strong></div>
                  <div className={styles.moduleRow}><span className={styles.moduleDot} /><span>Chất lượng</span><strong>{item.quality}</strong></div>
                </div>
              </article>
            ))}
            {dbSources.length === 0 && (
              <article className={styles.moduleCard}>
                <h3>Chưa có dữ liệu nguồn nước</h3>
                <p className={styles.heroDesc}>Hãy tạo mới để hiển thị thông tin quản lý thực tế từ DB.</p>
              </article>
            )}
          </div>

          <div className={styles.heroMedia}>
            <div className={styles.heroMap}>
              <MapViewSwitcher
                lat={lat}
                lng={lng}
                zoom={17}
                title={farmName}
                frameClassName={styles.heroMapFrame}
              />
            </div>
            <div className={styles.heroCards}>
              <div className={styles.heroMiniPanel}><span>Vị trí tài khoản</span><strong>{overview.locationName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}</strong></div>
              <div className={styles.heroMiniPanel}><span>Nguồn gần nhất</span><strong>{latestSource?.name || "-"}</strong></div>
              <div className={styles.heroMiniPanel}><span>Độ bao phủ dữ liệu</span><strong>{formatNumber(dbSources.filter((item) => item.lat && item.lng).length)}</strong></div>
            </div>
          </div>
        </section>

        <section className={styles.bottomGrid}>
          <article className={styles.bottomCard}>
            <h3>Tìm kiếm & bộ lọc</h3>
            <div className={styles.tinyList}>
              <div className={styles.tinyRow}><span>Từ khóa</span><strong>{q || "Tất cả"}</strong></div>
              <div className={styles.tinyRow}><span>Trạng thái</span><strong>{status}</strong></div>
              <div className={styles.tinyRow}><span>Loại</span><strong>{type || "Tất cả"}</strong></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {statusFilters.map((item) => (
                <a key={item} href={`/dashboard/nguon_nuoc?q=${encodeURIComponent(q)}&status=${encodeURIComponent(item)}&type=${encodeURIComponent(type)}`} className={`btn ${status === item ? "btn-primary" : "btn-secondary"}`}>
                  {item}
                </a>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {typeSuggestions.map((item) => (
                <a key={item} href={`/dashboard/nguon_nuoc?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&type=${encodeURIComponent(item)}`} className="btn btn-secondary">
                  {item}
                </a>
              ))}
            </div>
          </article>

          <article className={styles.bottomCard}>
            <h3>Danh sách nguồn nước</h3>
            <div className={styles.tinyList}>
              {sources.map((item) => (
                <div key={item.id} className={styles.tinyRow}>
                  <span>{item.name}</span>
                  <strong>{item.status}</strong>
                </div>
              ))}
              {sources.length === 0 && <p>Không có nguồn nước phù hợp bộ lọc hiện tại.</p>}
            </div>
          </article>

          <article className={styles.bottomCard}>
            <h3>Thông tin nhanh</h3>
            <div className={styles.tinyList}>
              <div className={styles.tinyRow}><span>Trang trại</span><strong>{farmName}</strong></div>
              <div className={styles.tinyRow}><span>Vị trí hiện tại</span><strong>{overview.locationName || "Chưa cập nhật"}</strong></div>
              <div className={styles.tinyRow}><span>Cập nhật gần nhất</span><strong>{latestSource?.updatedAt || "-"}</strong></div>
            </div>
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}
