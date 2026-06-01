import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { loadLivestockGroupDetail } from "@/lib/livestock-detail";
import { getLivestockEventTypeOption, isLivestockEventType } from "@/lib/livestock-event-types";
import styles from "../page.module.css";

type PageProps = {
  params: { groupId: string };
};

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value == null || !Number.isFinite(value)) return "Chưa cập nhật";
  return `${new Intl.NumberFormat("vi-VN").format(value)}${suffix}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function eventTypeLabel(type: string | null) {
  return isLivestockEventType(type) ? getLivestockEventTypeOption(type).label : "Sự kiện";
}

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function SmallIcon({ name }: { name: "back" | "treatment" | "events" | "info" }) {
  switch (name) {
    case "back":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7 5 12l5 5" /><path d="M5 12h14" /></svg>;
    case "treatment":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 18 10-10 2 2L8 20H6v-2Z" /><path d="m14 8 2-2 2 2-2 2" /></svg>;
    case "events":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16H7z" /><path d="M10 8h4M10 12h4M10 16h2" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v-6" /><path d="M12 7h.01" /><path d="M5 4h14v16H5z" /></svg>;
  }
}

export default async function GroupMedicalRecordPage({ params }: PageProps) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect(`/login?next=/dashboard/vat-nuoi/${params.groupId}/so-kham-benh`);

  const [detail, overview] = await Promise.all([
    loadLivestockGroupDetail(ownerId, params.groupId),
    getDashboardOverview(ownerId),
  ]);
  if (!detail) notFound();

  const group = detail.group;
  const medicalEvents = detail.events.filter((event) => {
    const value = normalizeSearch(`${event.type ?? ""} ${event.title ?? ""} ${event.note ?? ""}`);
    return value.includes("benh") || value.includes("kham") || value.includes("suc khoe") || value.includes("health") || value.includes("treatment");
  });
  const nextDueCount = detail.treatments.filter((treatment) => treatment.nextDueDate).length;
  const latestTreatment = detail.treatments[0] ?? null;

  return (
    <DashboardShell farmName={detail.farm.name} activePath="/dashboard/vat-nuoi">
      <div className={styles.page}>
        <section className={styles.topBar}>
          <div className={styles.titleBlock}>
            <Link className={styles.backButton} href={`/dashboard/vat-nuoi/${group.id}`}>
              <SmallIcon name="back" />
              Quay lại nhóm
            </Link>
            <div>
              <p className={styles.eyebrow}>Sổ khám bệnh</p>
              <h1>{group.name}</h1>
              <span>{group.code} · {group.species}</span>
            </div>
          </div>
          {overview.access.canWrite && (
            <div className={styles.sectionActions}>
              <Link className={styles.inlineAction} href={`/dashboard/vat-nuoi/dieu-tri?groupId=${group.id}`}>
                <SmallIcon name="treatment" />
                Ghi điều trị
              </Link>
              <Link className={`${styles.inlineAction} ${styles.secondaryInlineAction}`} href={`/dashboard/vat-nuoi/su-kien?groupId=${group.id}`}>
                <SmallIcon name="events" />
                Ghi sự kiện
              </Link>
            </div>
          )}
        </section>

        <section className={styles.statsGrid}>
          <article><span>Bản ghi điều trị</span><strong>{formatNumber(detail.treatments.length)}</strong></article>
          <article><span>Sự kiện sức khỏe</span><strong>{formatNumber(medicalEvents.length)}</strong></article>
          <article><span>Lịch nhắc lại</span><strong>{formatNumber(nextDueCount)}</strong></article>
          <article><span>Lần gần nhất</span><strong>{formatDate(latestTreatment?.treatmentDate || latestTreatment?.createdAt)}</strong></article>
        </section>

        <section className={styles.detailPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Điều trị</p>
              <h2><SmallIcon name="treatment" /> Chi tiết điều trị nhóm</h2>
            </div>
            <span className={styles.panelBadge}>{formatNumber(detail.treatments.length)} bản ghi</span>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Mã hồ sơ</th>
                  <th>Ngày</th>
                  <th>Tên điều trị</th>
                  <th>Số lượng</th>
                  <th>Liều dùng</th>
                  <th>Phương pháp</th>
                  <th>Cách ly</th>
                  <th>Nhắc lại</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {detail.treatments.map((treatment) => (
                  <tr key={treatment.id}>
                    <td>{treatment.code || treatment.id}</td>
                    <td>{formatDate(treatment.treatmentDate || treatment.createdAt)}</td>
                    <td><strong>{treatment.name || treatment.type || "Điều trị"}</strong></td>
                    <td>{formatNumber(treatment.treatedCount, " con")}</td>
                    <td>{treatment.dosage == null ? "Chưa cập nhật" : formatNumber(treatment.dosage, treatment.dosageUnit ? ` ${treatment.dosageUnit}` : "")}</td>
                    <td>{treatment.method || "Chưa cập nhật"}</td>
                    <td>{formatDate(treatment.withdrawalEndDate)}</td>
                    <td>{formatDate(treatment.nextDueDate)}</td>
                    <td>{treatment.status || "Chưa cập nhật"}</td>
                    <td>{treatment.note || "Không có"}</td>
                  </tr>
                ))}
                {detail.treatments.length === 0 && (
                  <tr><td colSpan={10} className={styles.emptyTableCell}>Nhóm này chưa có bản ghi điều trị.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.detailPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Khám bệnh và sức khỏe</p>
              <h2><SmallIcon name="events" /> Sự kiện liên quan</h2>
            </div>
            <span className={styles.panelBadge}>{formatNumber(medicalEvents.length)} sự kiện</span>
          </div>
          <div className={styles.timeline}>
            {medicalEvents.map((event) => (
              <article key={event.id}>
                <strong>{event.title || eventTypeLabel(event.type)}</strong>
                <span>{formatDate(event.eventDate || event.createdAt)}</span>
                <p>{eventTypeLabel(event.type)} · {formatNumber(event.animalCount, " cá thể")}{event.note ? ` · ${event.note}` : ""}</p>
              </article>
            ))}
            {medicalEvents.length === 0 && (
              <article>
                <strong>Chưa có sự kiện sức khỏe</strong>
                <span>Chưa cập nhật</span>
                <p>Các sự kiện khám bệnh, sức khỏe hoặc điều trị sẽ hiển thị tại đây.</p>
              </article>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
