import DashboardShell from "@/components/dashboard-shell";
import DashboardTopActions from "@/components/dashboard-top-actions";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import styles from "../page.module.css";

const overviewCards = [
  { title: "Tổng vật nuôi", value: "—", note: "Chưa có số liệu hiển thị" },
  { title: "Hôm nay", value: "—", note: "Chưa phát sinh dữ liệu" },
  { title: "Hôm qua", value: "—", note: "Chưa phát sinh dữ liệu" },
  { title: "Trung bình", value: "—", note: "Chưa phát sinh dữ liệu" },
] as const;

const analysisCards = [
  { title: "Theo loại", detail: "Biểu đồ trống cho đến khi có bản ghi phù hợp" },
  { title: "Theo khung giờ", detail: "Biểu đồ trống cho đến khi có bản ghi phù hợp" },
  { title: "Xu hướng theo ngày", detail: "Biểu đồ trống cho đến khi có bản ghi phù hợp" },
] as const;

const noteItems = [
  "Khu vực này dành cho tổng quan đếm vật nuôi.",
  "Giao diện hiện được giữ ở trạng thái trình bày, chưa gắn số liệu.",
  "Khi cần, có thể nối nguồn dữ liệu hoặc thêm bộ nhập liệu sau.",
] as const;

export default async function DemVatNuoiPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/dem-vat-nuoi");

  return (
    <DashboardShell farmName="Nông trại" activePath="/dashboard/dem-vat-nuoi">
      <div className={styles.dashboardWrap}>
        <section className={styles.topBar}>
          <div className={styles.pageTitle}>
            <div className={styles.pageIcon}>◫</div>
            <div>
              <p className={styles.pageEyebrow}>Đếm vật nuôi</p>
              <h1>Livestock Counting</h1>
            </div>
          </div>
          <DashboardTopActions />
        </section>

        <section className={styles.heroStrip}>
          <div className={styles.heroHeader}>
            <div>
              <div className={styles.heroLabel}>Tổng quan dữ liệu đếm</div>
              <p className={styles.heroDesc}>Bố cục tổng quan dành cho màn hình đếm vật nuôi, hiện chưa gắn dữ liệu hiển thị.</p>
            </div>
            <div className={styles.heroStats}>
              {overviewCards.map((item) => (
                <div key={item.title} className={styles.heroStat}>
                  <span>{item.title}</span>
                  <strong>{item.value}</strong>
                  <small>{item.note}</small>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.countChartArea}>
            <div className={styles.countChartMain}>
              <div className={styles.chartHeader}>
                <div>
                  <p>Daily Metrics</p>
                  <h2>Xu hướng đếm theo ngày</h2>
                </div>
                <span className={styles.demoBadge}>Chưa có dữ liệu</span>
              </div>
              <div className={styles.emptyChartState}>
                <div className={styles.emptyChartIcon}>∿</div>
                <p>Biểu đồ sẽ xuất hiện khi có nguồn dữ liệu được kết nối.</p>
              </div>
            </div>

            <div className={styles.countChartSide}>
              {analysisCards.map((item) => (
                <div key={item.title} className={styles.chartCardMini}>
                  <h4>{item.title}</h4>
                  <div className={styles.emptyMiniState}>{item.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.summaryStrip}>
            <div className={styles.summaryCard}>
              <span>Bò</span>
              <strong>—</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Dê</span>
              <strong>—</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Cừu</span>
              <strong>—</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Heo</span>
              <strong>—</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Gà</span>
              <strong>—</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Vịt</span>
              <strong>—</strong>
            </div>
          </div>
        </section>

        <section className={styles.bottomGrid}>
          <article className={styles.bottomCard}>
            <h3>Nhật ký đếm gần nhất</h3>
            <div className={styles.emptyTableState}>Chưa có bản ghi để hiển thị.</div>
          </article>

          <article className={styles.bottomCard}>
            <h3>Ghi chú dữ liệu</h3>
            <div className={styles.tinyList}>
              {noteItems.map((note) => (
                <div key={note} className={styles.tinyRow}>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}
