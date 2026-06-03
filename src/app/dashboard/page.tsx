import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview, type DashboardOverview } from "@/lib/dashboard-overview";
import styles from "./page.module.css";

type Tone = "green" | "blue" | "amber" | "red" | "slate";
type IconName =
  | "activity"
  | "alert"
  | "area"
  | "dashboard"
  | "document"
  | "livestock"
  | "map"
  | "settings"
  | "spark"
  | "task"
  | "users"
  | "water"
  | "zones";

type Recommendation = {
  title: string;
  body: string;
  href?: string;
  label?: string;
  tone: Tone;
};

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

const formatArea = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toLocaleString("vi-VN", {
    maximumFractionDigits: safeValue >= 10 ? 1 : 2,
    minimumFractionDigits: safeValue > 0 && safeValue < 10 ? 1 : 0,
  })} ha`;
};

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();

function formatDate(value: string | null) {
  if (!value) return "Chưa có ngày tạo";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có ngày tạo";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function zoneStatusLabel(status: string | null) {
  const normalized = normalizeText(status);
  if (!normalized) return "Chưa cập nhật";
  if (normalized.includes("active") || normalized.includes("dang hoat dong")) return "Đang hoạt động";
  if (normalized.includes("bao tri") || normalized.includes("maintenance")) return "Bảo trì";
  if (normalized.includes("tam dung") || normalized.includes("inactive")) return "Tạm dừng";
  return status ?? "Chưa cập nhật";
}

function toneClass(tone: Tone) {
  return {
    green: styles.toneGreen,
    blue: styles.toneBlue,
    amber: styles.toneAmber,
    red: styles.toneRed,
    slate: styles.toneSlate,
  }[tone];
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const progressStyle = (value: number) => ({ "--bar-value": `${clampPercent(value)}%` } as CSSProperties);

function calculateDataScore(data: DashboardOverview) {
  const checks = [
    { done: data.metrics.zones > 0, weight: 22 },
    { done: data.metrics.totalAreaHa > 0, weight: 14 },
    { done: data.metrics.waterSources > 0, weight: 13 },
    { done: data.metrics.livestock > 0, weight: 13 },
    { done: data.metrics.assets > 0, weight: 10 },
    { done: data.metrics.members > 1, weight: 8 },
    { done: data.metrics.activeWork > 0, weight: 10 },
    { done: data.isMapShared, weight: 10 },
  ];

  return Math.min(
    100,
    checks.reduce((total, item) => total + (item.done ? item.weight : 0), 0)
  );
}

function buildRecommendations(data: DashboardOverview): Recommendation[] {
  const items: Recommendation[] = [];

  if (!data.access.canWrite) {
    items.push({
      title: "Tài khoản đang ở chế độ chỉ xem",
      body: "Bạn có thể theo dõi dữ liệu nhưng cần quyền biên tập để cập nhật khu vực, vật nuôi và công việc.",
      tone: "slate",
    });
  }

  if (data.metrics.overdueWork > 0) {
    items.push({
      title: "Có công việc quá hạn",
      body: `${formatNumber(data.metrics.overdueWork)} công việc cần được xử lý hoặc cập nhật trạng thái để giảm rủi ro vận hành.`,
      href: "/dashboard/cong-viec",
      label: "Mở công việc",
      tone: "red",
    });
  }

  if (data.metrics.zones === 0) {
    items.push({
      title: "Chưa có khu vực canh tác",
      body: "Hãy vẽ khu vực đầu tiên để bản đồ, vật nuôi, công việc và truy xuất nguồn gốc có điểm neo dữ liệu.",
      href: "/dashboard/khu-vuc/tao-moi",
      label: "Tạo khu vực",
      tone: "green",
    });
  } else if (data.metrics.totalAreaHa <= 0) {
    items.push({
      title: "Khu vực chưa có diện tích",
      body: "Một vài khu vực có thể thiếu hình học hoặc diện tích. Cập nhật lại ranh giới để báo cáo chính xác hơn.",
      href: "/dashboard/khu-vuc",
      label: "Kiểm tra khu vực",
      tone: "amber",
    });
  }

  if (data.metrics.waterSources === 0) {
    items.push({
      title: "Chưa ghi nhận nguồn nước",
      body: "Nguồn nước giúp theo dõi tưới tiêu, chăn nuôi và phân tích rủi ro theo khu vực.",
      href: "/dashboard/map",
      label: "Mở bản đồ",
      tone: "blue",
    });
  }

  if (data.metrics.livestock === 0) {
    items.push({
      title: "Chưa có hồ sơ vật nuôi",
      body: "Thêm nhóm hoặc cá thể vật nuôi để dashboard phản ánh đúng năng lực chăn nuôi hiện tại.",
      href: "/dashboard/vat-nuoi",
      label: "Quản lý vật nuôi",
      tone: "green",
    });
  }

  if (data.metrics.activeWork === 0) {
    items.push({
      title: "Chưa có công việc mở",
      body: "Tạo lịch kiểm tra, chăm sóc hoặc bảo trì để biến dashboard thành bảng điều hành hằng ngày.",
      href: "/dashboard/cong-viec",
      label: "Lập công việc",
      tone: "amber",
    });
  }

  if (!data.isMapShared && data.access.canManageSettings) {
    items.push({
      title: "Bản đồ công khai chưa bật",
      body: "Bật chia sẻ bản đồ khi bạn muốn đối tác hoặc khách hàng xem thông tin trang trại đã chọn.",
      href: "/dashboard/settings",
      label: "Mở cài đặt",
      tone: "blue",
    });
  }

  if (items.length === 0) {
    items.push({
      title: "Dữ liệu cốt lõi đã sẵn sàng",
      body: "Các khối chính đã có dữ liệu. Tiếp tục rà bản đồ và công việc định kỳ để giữ dashboard luôn mới.",
      href: "/dashboard/map",
      label: "Kiểm tra bản đồ",
      tone: "green",
    });
  }

  return items.slice(0, 4);
}

function Icon({ name }: { name: IconName }) {
  switch (name) {
    case "activity":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 13h4l2-6 4 12 2-6h4" />
        </svg>
      );
    case "alert":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4 3 20h18L12 4Z" />
          <path d="M12 9v5M12 17h.01" />
        </svg>
      );
    case "area":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6h14v12H5z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      );
    case "document":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h7l3 3v15H7z" />
          <path d="M14 3v4h4M9 12h6M9 16h4" />
        </svg>
      );
    case "livestock":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 13c0-3 2.4-5.5 5.5-5.5h3C16.6 7.5 19 10 19 13v2c0 2.8-2.2 5-5 5h-4c-2.8 0-5-2.2-5-5v-2Z" />
          <path d="M8 8 6 4M16 8l2-4M9 14h.01M15 14h.01" />
        </svg>
      );
    case "map":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" />
          <path d="M9 4v14M15 6v14" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
          <path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.9-1.1L14.3 3h-4.6l-.3 2.9A7 7 0 0 0 7.5 7l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.1l-2 1.5 2 3.4 2.4-1c.6.5 1.2.8 1.9 1.1l.3 2.9h4.6l.3-2.9c.7-.3 1.3-.6 1.9-1.1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1.1Z" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
          <path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" />
        </svg>
      );
    case "task":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6h14M5 12h14M5 18h14" />
          <path d="m8 6 1.2 1.2L11.5 5M8 12l1.2 1.2 2.3-2.2" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "water":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11Z" />
          <path d="M9 15a3 3 0 0 0 4 2.8" />
        </svg>
      );
    case "zones":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h7v12H4z" />
          <path d="M13 4h7v16h-7z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8.5Z" />
        </svg>
      );
  }
}

export default async function DashboardPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard");

  const data = await getDashboardOverview(ownerId);
  const score = calculateDataScore(data);
  const recommendations = buildRecommendations(data);
  const workHealth =
    data.metrics.activeWork <= 0
      ? 38
      : data.metrics.overdueWork > 0
        ? 100 - (data.metrics.overdueWork / data.metrics.activeWork) * 100
        : 100;
  const mapCoverage = data.metrics.zones > 0 ? (data.metrics.totalAreaHa > 0 ? 100 : 64) : 12;
  const waterCoverage = data.metrics.zones > 0 ? (data.metrics.waterSources / data.metrics.zones) * 100 : 0;
  const livestockCoverage = data.metrics.livestock > 0 ? 100 : 16;

  const kpis = [
    {
      label: "Khu vực",
      value: formatNumber(data.metrics.zones),
      hint: `${formatArea(data.metrics.totalAreaHa)} đã số hóa`,
      icon: "zones" as IconName,
      tone: "green" as Tone,
    },
    {
      label: "Vật nuôi",
      value: formatNumber(data.metrics.livestock),
      hint: data.metrics.livestock > 0 ? "Đang có hồ sơ theo dõi" : "Chưa có hồ sơ",
      icon: "livestock" as IconName,
      tone: "amber" as Tone,
    },
    {
      label: "Nguồn nước",
      value: formatNumber(data.metrics.waterSources),
      hint: data.metrics.waterSources > 0 ? "Đã gắn vào bản đồ" : "Nên bổ sung",
      icon: "water" as IconName,
      tone: "blue" as Tone,
    },
    {
      label: "Công việc mở",
      value: formatNumber(data.metrics.activeWork),
      hint: data.metrics.overdueWork > 0 ? `${formatNumber(data.metrics.overdueWork)} quá hạn` : "Không có quá hạn",
      icon: data.metrics.overdueWork > 0 ? ("alert" as IconName) : ("task" as IconName),
      tone: data.metrics.overdueWork > 0 ? ("red" as Tone) : ("slate" as Tone),
    },
    {
      label: "Kế hoạch chăn thả",
      value: formatNumber(data.metrics.activeGrazingPlans),
      hint: data.metrics.activeGrazingPlans > 0 ? "Đang hoạt động" : "Chưa có kế hoạch",
      icon: "activity" as IconName,
      tone: "green" as Tone,
    },
    {
      label: "Thành viên",
      value: formatNumber(data.metrics.members),
      hint: data.access.roleName ?? "Quyền truy cập",
      icon: "users" as IconName,
      tone: "blue" as Tone,
    },
  ];

  const quickActions = [
    { label: "Bản đồ", href: "/dashboard/map", icon: "map" as IconName, visible: true },
    { label: "Tạo khu vực", href: "/dashboard/khu-vuc/tao-moi", icon: "zones" as IconName, visible: data.access.canWrite },
    { label: "Vật nuôi", href: "/dashboard/vat-nuoi", icon: "livestock" as IconName, visible: true },
    { label: "Công việc", href: "/dashboard/cong-viec", icon: "task" as IconName, visible: true },
    { label: "Cài đặt", href: "/dashboard/settings", icon: "settings" as IconName, visible: data.access.canManageSettings },
  ].filter((item) => item.visible);

  const dashboardTiles = [
    {
      title: "Không gian số",
      label: "Khu vực",
      value: formatNumber(data.metrics.zones),
      meta: `${formatArea(data.metrics.totalAreaHa)} đã quản lý`,
      href: "/dashboard/khu-vuc",
      icon: "zones" as IconName,
      tone: "green" as Tone,
      progress: mapCoverage,
    },
    {
      title: "Chăn nuôi",
      label: "Vật nuôi",
      value: formatNumber(data.metrics.livestock),
      meta: data.metrics.livestock > 0 ? "Có hồ sơ theo dõi" : "Chưa có hồ sơ",
      href: "/dashboard/vat-nuoi",
      icon: "livestock" as IconName,
      tone: "amber" as Tone,
      progress: livestockCoverage,
    },
    {
      title: "Lịch vận hành",
      label: "Công việc",
      value: formatNumber(data.metrics.activeWork),
      meta: data.metrics.overdueWork > 0 ? `${formatNumber(data.metrics.overdueWork)} quá hạn` : "Đúng nhịp",
      href: "/dashboard/cong-viec",
      icon: "task" as IconName,
      tone: data.metrics.overdueWork > 0 ? ("red" as Tone) : ("blue" as Tone),
      progress: workHealth,
    },
    {
      title: "Chăn thả",
      label: "Kế hoạch",
      value: formatNumber(data.metrics.activeGrazingPlans),
      meta: data.metrics.activeGrazingPlans > 0 ? "Đang hoạt động" : "Chưa lập kế hoạch",
      href: "/dashboard/chan-tha",
      icon: "activity" as IconName,
      tone: "slate" as Tone,
      progress: data.metrics.activeGrazingPlans > 0 ? 100 : 22,
    },
  ];

  const mixTotal = Math.max(
    1,
    data.metrics.zones + data.metrics.livestock + data.metrics.assets + data.metrics.waterSources
  );
  const zoneShare = clampPercent((data.metrics.zones / mixTotal) * 100);
  const livestockShare = clampPercent((data.metrics.livestock / mixTotal) * 100);
  const assetShare = clampPercent((data.metrics.assets / mixTotal) * 100);
  const mixStyle = {
    "--mix-zones": `${zoneShare}%`,
    "--mix-livestock": `${Math.min(100, zoneShare + livestockShare)}%`,
    "--mix-assets": `${Math.min(100, zoneShare + livestockShare + assetShare)}%`,
  } as CSSProperties;
  const mixItems = [
    { label: "Khu vực", value: data.metrics.zones, tone: "green" as Tone },
    { label: "Vật nuôi", value: data.metrics.livestock, tone: "amber" as Tone },
    { label: "Tài sản", value: data.metrics.assets, tone: "blue" as Tone },
    { label: "Nguồn nước", value: data.metrics.waterSources, tone: "slate" as Tone },
  ];
  const coverageRows = [
    { label: "Độ phủ dữ liệu", value: score, hint: `${score}%` },
    { label: "Bản đồ khu vực", value: mapCoverage, hint: data.metrics.zones > 0 ? "Đã có vùng quản lý" : "Chưa có vùng" },
    { label: "Nguồn nước", value: waterCoverage, hint: `${formatNumber(data.metrics.waterSources)} nguồn` },
    {
      label: "Công việc đúng hạn",
      value: workHealth,
      hint: data.metrics.overdueWork > 0 ? `${formatNumber(data.metrics.overdueWork)} quá hạn` : "Ổn định",
    },
  ];
  const traceStages = [
    { label: "Bản đồ", done: data.metrics.zones > 0, icon: "map" as IconName },
    { label: "Diện tích", done: data.metrics.totalAreaHa > 0, icon: "area" as IconName },
    { label: "Vật nuôi", done: data.metrics.livestock > 0, icon: "livestock" as IconName },
    { label: "Công việc", done: data.metrics.activeWork > 0, icon: "task" as IconName },
    { label: "Công khai", done: data.isMapShared, icon: "document" as IconName },
  ];

  return (
    <DashboardShell farmName={data.farmName} activePath="/dashboard">
      <div className={styles.page}>
        <section className={styles.header}>
          <div className={styles.titleBlock}>
            <span className={styles.titleIcon}>
              <Icon name="dashboard" />
            </span>
            <div>
              <p className={styles.eyebrow}>Tổng quan vận hành</p>
              <h1>{data.farmName}</h1>
              <div className={styles.metaLine}>
                <span>{data.locationName || "Chưa cập nhật vị trí"}</span>
                <span>Tạo ngày {formatDate(data.createdAt)}</span>
                {data.ownerName && <span>Chủ trang trại: {data.ownerName}</span>}
              </div>
            </div>
          </div>

          <div className={styles.quickActions} aria-label="Thao tác nhanh">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className={styles.quickAction}>
                <Icon name={action.icon} />
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.kpiSection} aria-label="Chỉ số chính">
          <div className={styles.kpiGrid}>
            {kpis.map((item) => (
              <article key={item.label} className={`${styles.kpiCard} ${toneClass(item.tone)}`}>
                <span className={styles.kpiIcon}>
                  <Icon name={item.icon} />
                </span>
                <div>
                  <p>{item.label}</p>
                  <strong>{item.value}</strong>
                  <span>{item.hint}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.dashboardGrid} aria-label="Dashboard vận hành">
          <article className={`${styles.dashboardPanel} ${styles.moduleDashboard}`}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Điều phối tổng quan</p>
                <h2>Bảng điều hành theo mô-đun</h2>
              </div>
            </div>

            <div className={styles.dashboardTiles}>
              {dashboardTiles.map((item) => (
                <Link key={item.title} href={item.href} className={`${styles.dashboardTile} ${toneClass(item.tone)}`}>
                  <span className={styles.dashboardTileIcon}>
                    <Icon name={item.icon} />
                  </span>
                  <span className={styles.dashboardTileText}>
                    <small>{item.label}</small>
                    <strong>{item.value}</strong>
                    <em>{item.meta}</em>
                  </span>
                  <span className={styles.tileProgress} style={progressStyle(item.progress)}>
                    <span />
                  </span>
                </Link>
              ))}
            </div>
          </article>

          <article className={`${styles.dashboardPanel} ${styles.mixPanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Cơ cấu dữ liệu</p>
                <h2>Tài nguyên đã ghi nhận</h2>
              </div>
            </div>

            <div className={styles.mixBody}>
              <div className={styles.donutChart} style={mixStyle}>
                <span>{formatNumber(mixTotal)}</span>
                <small>bản ghi</small>
              </div>
              <div className={styles.mixLegend}>
                {mixItems.map((item) => (
                  <div key={item.label} className={toneClass(item.tone)}>
                    <span />
                    <strong>{item.label}</strong>
                    <em>{formatNumber(item.value)}</em>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className={styles.dashboardPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Độ phủ vận hành</p>
                <h2>Tình trạng dữ liệu chính</h2>
              </div>
            </div>

            <div className={styles.coverageList}>
              {coverageRows.map((item) => (
                <div key={item.label} className={styles.coverageRow}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.hint}</span>
                  </div>
                  <em>{clampPercent(item.value)}%</em>
                  <span className={styles.coverageBar} style={progressStyle(item.value)}>
                    <span />
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className={`${styles.dashboardPanel} ${styles.pipelinePanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Luồng truy xuất</p>
                <h2>Chuỗi dữ liệu trang trại</h2>
              </div>
            </div>

            <div className={styles.pipeline}>
              {traceStages.map((stage) => (
                <div key={stage.label} className={stage.done ? styles.pipelineStageDone : styles.pipelineStage}>
                  <span>
                    <Icon name={stage.icon} />
                  </span>
                  <strong>{stage.label}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className={styles.mainGrid}>
          <article className={styles.mapPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Bản đồ trang trại</p>
                <h2>Không gian vận hành hiện tại</h2>
              </div>
              <div className={styles.mapStatus}>
                {data.isMapShared ? "Đang chia sẻ công khai" : "Chỉ hiển thị nội bộ"}
              </div>
            </div>

            <div className={styles.mapShell}>
              <MapViewSwitcher
                lat={data.latitude}
                lng={data.longitude}
                zoom={17}
                title="Bản đồ tổng quan trang trại"
                frameClassName={styles.mapFrame}
                hideEcoNote
                hideModeTabs
              />
            </div>

            <div className={styles.mapFacts}>
              <div>
                <span>Tọa độ</span>
                <strong>
                  {data.latitude.toFixed(5)}, {data.longitude.toFixed(5)}
                </strong>
              </div>
              <div>
                <span>Tài sản bản đồ</span>
                <strong>{formatNumber(data.metrics.assets)}</strong>
              </div>
              <div>
                <span>Diện tích số hóa</span>
                <strong>{formatArea(data.metrics.totalAreaHa)}</strong>
              </div>
            </div>
          </article>

          <aside className={styles.recommendationPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Việc nên làm tiếp</p>
                <h2>Gợi ý thông minh</h2>
              </div>
            </div>

            <div className={styles.recommendationList}>
              {recommendations.map((item) => {
                const content = (
                  <>
                    <span className={`${styles.recommendationIcon} ${toneClass(item.tone)}`}>
                      <Icon name={item.tone === "red" ? "alert" : "spark"} />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.body}</small>
                      {item.label && <em>{item.label}</em>}
                    </span>
                  </>
                );

                return item.href ? (
                  <Link key={item.title} href={item.href} className={styles.recommendationItem}>
                    {content}
                  </Link>
                ) : (
                  <div key={item.title} className={styles.recommendationItem}>
                    {content}
                  </div>
                );
              })}
            </div>
          </aside>
        </section>

        <section className={styles.detailGrid}>
          <article className={styles.detailPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Khu vực mới cập nhật</p>
                <h2>{formatNumber(data.latestZones.length)} khu vực gần nhất</h2>
              </div>
              <Link href="/dashboard/khu-vuc" className={styles.panelLink}>
                Xem tất cả
              </Link>
            </div>

            <div className={styles.zoneList}>
              {data.latestZones.length > 0 ? (
                data.latestZones.slice(0, 6).map((zone) => (
                  <Link key={zone.id} href={`/dashboard/khu-vuc/${zone.id}`} className={styles.zoneRow}>
                    <span>
                      <strong>{zone.name}</strong>
                      <small>{zoneStatusLabel(zone.status)}</small>
                    </span>
                    <em>{formatArea(zone.areaHa)}</em>
                  </Link>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <Icon name="zones" />
                  <span>Chưa có khu vực nào để hiển thị.</span>
                </div>
              )}
            </div>
          </article>

          <article className={styles.detailPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Nhịp vận hành</p>
                <h2>Tình trạng hệ thống</h2>
              </div>
            </div>

            <div className={styles.healthList}>
              <div className={styles.healthRow}>
                <span className={styles.healthIcon}>
                  <Icon name="document" />
                </span>
                <div>
                  <strong>Dữ liệu bản đồ</strong>
                  <small>{data.metrics.zones > 0 ? "Đã có lớp khu vực để phân tích" : "Chưa có lớp khu vực"}</small>
                </div>
                <em>{data.metrics.zones > 0 ? "Sẵn sàng" : "Thiếu"}</em>
              </div>
              <div className={styles.healthRow}>
                <span className={styles.healthIcon}>
                  <Icon name="task" />
                </span>
                <div>
                  <strong>Công việc</strong>
                  <small>
                    {data.metrics.overdueWork > 0
                      ? `${formatNumber(data.metrics.overdueWork)} việc quá hạn`
                      : `${formatNumber(data.metrics.activeWork)} việc đang mở`}
                  </small>
                </div>
                <em>{data.metrics.overdueWork > 0 ? "Cần xử lý" : "Ổn định"}</em>
              </div>
              <div className={styles.healthRow}>
                <span className={styles.healthIcon}>
                  <Icon name="users" />
                </span>
                <div>
                  <strong>Quyền truy cập</strong>
                  <small>{data.access.roleName ?? "Chưa xác định vai trò"}</small>
                </div>
                <em>{data.access.canWrite ? "Có thể sửa" : "Chỉ xem"}</em>
              </div>
            </div>
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}
