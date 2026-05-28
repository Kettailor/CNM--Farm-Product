import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { redirect } from "next/navigation";
import styles from "./page.module.css";

export default async function ZoneDetailPage({ params }: { params: { zoneId: string } }) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/du-lieu/khu-vuc");

  const data = await getDashboardOverview(ownerId);
  const zone = data.latestZones.find((item) => item.id === params.zoneId) ?? null;

  return (
    <DashboardShell farmName={data.farmName} activePath="/du-lieu/khu-vuc">
      <div className={styles.page}>
        <section className={styles.heroCard}>
          <div>
            <p className={styles.kicker}>Chi tiết khu vực</p>
            <div className={styles.heroTitleRow}>
              <h1>{zone?.name ?? "Khu vực không tìm thấy"}</h1>
              <span className={styles.heroBadge}>{zone?.status ?? "Chưa có trạng thái"}</span>
            </div>
            <p className={styles.heroSub}>{zone ? `Diện tích ${zone.areaHa.toFixed(2)} ha` : `Mã khu vực: ${params.zoneId}`}</p>
          </div>
          <div className={styles.heroActions}>
            <a href="/du-lieu/khu-vuc" className={styles.backLink}>Quay lại danh sách</a>
            <a href="/dashboard/map" className={styles.primaryButton}>Mở bản đồ</a>
          </div>
        </section>

        <section className={styles.emptyState}>
          <h1>Trang chi tiết khu vực đã sẵn sàng</h1>
          <p>
            Giao diện này không còn tự chuyển hướng sang chính nó nữa, nên khi mở
            <strong> /du-lieu/khu-vuc </strong>
            hệ thống sẽ hiển thị đúng màn hình quản lý thay vì báo lỗi lấy dữ liệu liên tục.
          </p>
        </section>
      </div>
    </DashboardShell>
  );
}
