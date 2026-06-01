import DashboardShell from "@/components/dashboard-shell";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { redirect } from "next/navigation";
import styles from "./page.module.css";

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export default async function DashboardPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard");

  const data = await getDashboardOverview(ownerId);

  return (
    <DashboardShell farmName={data.farmName} activePath="/dashboard">
      <div className={styles.dashboardWrap}>
        <section className={styles.topBar}>
          <div className={styles.pageTitle}>
            <div className={styles.pageIcon}>◩</div>
            <div>
              <p className={styles.pageEyebrow}>Hệ thống quản lý nông trại</p>
              <h1>{data.farmName}</h1>
            </div>
          </div>
        </section>

        <section className={styles.heroStrip}>
          <div className={styles.heroHeader}>
            <div className={styles.heroLabel}>Quản lý tổng quan</div>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}><span>Trang trại</span><strong>1</strong></div>
              <div className={styles.heroStat}><span>Người dùng</span><strong>0</strong></div>
              <div className={styles.heroStat}><span>Tài sản</span><strong>{formatNumber(data.metrics.assets || 0)}</strong></div>
              <div className={styles.heroStat}><span>Thiết bị di động</span><strong>0</strong></div>
              <div className={styles.heroStat}><span>Khu vực</span><strong>{formatNumber(data.metrics.zones || 0)}</strong></div>
            </div>
          </div>

          <div className={styles.heroMedia}>
            <div className={styles.heroMap}>
              <MapViewSwitcher
                lat={data.latitude}
                lng={data.longitude}
                zoom={17}
                title="Bản đồ quản lý nông trại"
                frameClassName={styles.heroMapFrame}
              />
            </div>
            <div className={styles.heroCards}>
              <div className={styles.heroMiniPanel}>
                <span>Vật nuôi</span>
                <strong>{formatNumber(data.metrics.livestock || 0)}</strong>
              </div>
              <div className={styles.heroMiniPanel}>
                <span>Khu vực</span>
                <strong>{formatNumber(data.metrics.zones || 0)}</strong>
              </div>
              <div className={styles.heroMiniPanel}>
                <span>Nguồn nước</span>
                <strong>{formatNumber(data.metrics.waterSources || 0)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.cardGrid}>
          <article className={styles.moduleCard}>
            <div className={styles.moduleHead}>
              <div className={styles.moduleIcon}>◌</div>
              <div><h3>Vật nuôi</h3></div>
            </div>
            <div className={styles.moduleBody}>
              <div className={styles.moduleRow}><span className={styles.moduleDot} /><span>Tổng số</span><strong>{formatNumber(data.metrics.livestock || 0)}</strong></div>
              <div className={styles.moduleRow}><span className={styles.moduleDot} /><span>Nhóm</span><strong>0</strong></div>
              <div className={styles.moduleRow}><span className={styles.moduleDot} /><span>Đang theo dõi</span><strong>0</strong></div>
              <div className={styles.moduleRow}><span className={styles.moduleDot} /><span>Đã ghi nhận</span><strong>0</strong></div>
            </div>
          </article>

          <article className={styles.moduleCard}>
            <div className={styles.moduleHead}>
              <div className={styles.moduleIcon}>◌</div>
              <div><h3>Khu vực</h3></div>
            </div>
            <div className={styles.moduleBody}>
              {data.latestZones.length > 0 ? data.latestZones.slice(0, 4).map((zone) => (
                <div key={zone.id} className={styles.moduleRow}><span className={styles.moduleDot} /><span>{zone.name}</span><strong>{zone.areaHa.toFixed(2)} ha</strong></div>
              )) : (
                <div className={styles.moduleRow}><span className={styles.moduleDot} /><span>Chưa có khu vực</span><strong>0</strong></div>
              )}
            </div>
          </article>

        </section>

        <section className={styles.bottomGrid}>
          <article className={styles.bottomCard}>
            <h3>Danh sách khu vực gần nhất</h3>
            <div className={styles.tinyList}>
              {data.latestZones.length > 0 ? data.latestZones.slice(0, 5).map((zone) => (
                <div key={zone.id} className={styles.tinyRow}><span>{zone.name}</span><strong>{zone.areaHa.toFixed(2)} ha</strong></div>
              )) : <p>Chưa có dữ liệu khu vực.</p>}
            </div>
          </article>

          <article className={styles.bottomCard}>
            <h3>Trạng thái hệ thống</h3>
            <div className={styles.tinyList}>
              <div className={styles.tinyRow}><span>Tài sản</span><strong>{formatNumber(data.metrics.assets || 0)}</strong></div>
              <div className={styles.tinyRow}><span>Khu vực</span><strong>{formatNumber(data.metrics.zones || 0)}</strong></div>
              <div className={styles.tinyRow}><span>Nguồn nước</span><strong>{formatNumber(data.metrics.waterSources || 0)}</strong></div>
            </div>
          </article>

          <article className={styles.bottomCard}>
            <h3>Đồng bộ dữ liệu</h3>
            <div className={styles.tinyList}>
              <div className={styles.tinyRow}><span>Giá trị thiếu</span><strong>0</strong></div>
              <div className={styles.tinyRow}><span>Giá trị mặc định</span><strong>0</strong></div>
              <div className={styles.tinyRow}><span>Trạng thái</span><strong>Đã kết nối DB</strong></div>
            </div>
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}
