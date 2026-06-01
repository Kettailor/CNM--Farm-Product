import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { CSSProperties } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { loadLivestockAnimalDetail } from "@/lib/livestock-detail";
import { getLivestockEventTypeOption, isLivestockEventType } from "@/lib/livestock-event-types";
import { renderQrSvg } from "@/lib/qr-code";
import styles from "../../page.module.css";

type PageProps = {
  params: { groupId: string; animalId: string };
};

const accentStyle = (color: string): CSSProperties => ({ "--accent": color } as CSSProperties);

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value == null || !Number.isFinite(value)) return "Chưa cập nhật";
  return `${new Intl.NumberFormat("vi-VN").format(value)}${suffix}`;
}

function formatDate(value: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ageLabel(value: string | null) {
  if (!value) return "Chưa cập nhật";
  const start = new Date(value).getTime();
  if (Number.isNaN(start)) return "Chưa cập nhật";
  const months = Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24 * 30.4375)));
  if (months < 1) return "Dưới 1 tháng";
  if (months < 24) return `${months} tháng`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} năm ${rest} tháng` : `${years} năm`;
}

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function statusLabel(status: string | null) {
  const raw = String(status ?? "").trim();
  if (!raw) return "Chưa cập nhật";
  const normalized = normalizeSearch(raw);
  if (normalized.includes("dang hoat dong") || normalized.includes("active")) return "Đang theo dõi";
  if (normalized.includes("theo doi") || normalized.includes("canh bao") || normalized.includes("benh")) return "Cần chú ý";
  if (normalized.includes("ngung") || normalized.includes("inactive")) return "Ngừng theo dõi";
  return raw;
}

function eventTypeLabel(type: string | null) {
  return isLivestockEventType(type) ? getLivestockEventTypeOption(type).label : "Sự kiện";
}

function SmallIcon({ name }: { name: "back" | "qr" | "info" | "growth" | "events" }) {
  switch (name) {
    case "back":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7 5 12l5 5" /><path d="M5 12h14" /></svg>;
    case "qr":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h2v2h-2zM18 14h2v6h-2zM14 18h2v2h-2z" /></svg>;
    case "growth":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16" /><path d="m6 16 4-4 3 2 5-7" /></svg>;
    case "events":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16H7z" /><path d="M10 8h4M10 12h4M10 16h2" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v-6" /><path d="M12 7h.01" /><path d="M5 4h14v16H5z" /></svg>;
  }
}

function FieldGrid({ items }: { items: Array<{ label: string; value: string | null }> }) {
  return (
    <dl className={styles.fieldGrid}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value || "Chưa cập nhật"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function LivestockAnimalDetailPage({ params }: PageProps) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect(`/login?next=/dashboard/vat-nuoi/${params.groupId}/ca-the/${params.animalId}`);

  const detail = await loadLivestockAnimalDetail(ownerId, params.groupId, params.animalId);
  if (!detail) notFound();

  const animal = detail.animal;
  const qrValue = animal.qrCode || animal.code || animal.id;
  const latestUpdate = animal.updatedAt || animal.createdAt;

  return (
    <DashboardShell farmName={detail.farm.name} activePath="/dashboard/vat-nuoi">
      <div className={styles.page}>
        <section className={styles.topBar}>
          <div className={styles.titleBlock}>
            <Link className={styles.backButton} href={`/dashboard/vat-nuoi/${detail.group.id}`}>
              <SmallIcon name="back" />
              Quay lại nhóm
            </Link>
            <div>
              <p className={styles.eyebrow}>Chi tiết cá thể</p>
              <h1>{animal.code || "Cá thể chưa có mã"}</h1>
              <span>{detail.group.name}</span>
            </div>
          </div>
          <div className={styles.sectionActions}>
            <Link className={styles.inlineAction} href={`/dashboard/vat-nuoi/${detail.group.id}/ca-the/${animal.id}/so-kham-benh`}>
              <SmallIcon name="events" />
              Sổ khám bệnh
            </Link>
            <Link className={`${styles.inlineAction} ${styles.secondaryInlineAction}`} href={`/dashboard/vat-nuoi/dieu-tri?groupId=${detail.group.id}`}>
              <SmallIcon name="growth" />
              Ghi điều trị
            </Link>
            <span className={styles.statusPill}>{statusLabel(animal.status)}</span>
          </div>
        </section>

        <section className={styles.heroPanel} style={accentStyle(detail.zone?.color ?? "#2f855a")}>
          <div className={styles.animalQrCard} dangerouslySetInnerHTML={{ __html: renderQrSvg(qrValue, { margin: 4 }) }} />
          <div className={styles.heroContent}>
            <div className={styles.heroTitle}>
              <div>
                <h2>{animal.species || detail.group.species}</h2>
                <p>{animal.breed || detail.group.breed || "Chưa cập nhật giống"} · {animal.identity || animal.qrCode || "Chưa có nhận diện"}</p>
              </div>
              <span className={styles.panelBadge}>{detail.zone?.name || "Chưa gắn khu vực"}</span>
            </div>
            <p className={styles.heroDescription}>{animal.description || "Hồ sơ cá thể đang được theo dõi trong nhóm vật nuôi."}</p>
            <div className={styles.quickFacts}>
              <div><span>Mã QR</span><strong>{animal.qrCode || "Chưa có QR"}</strong></div>
              <div><span>Giới tính</span><strong>{animal.gender || "Chưa cập nhật"}</strong></div>
              <div><span>Giai đoạn</span><strong>{animal.lifeStage || "Chưa cập nhật"}</strong></div>
              <div><span>Tuổi</span><strong>{ageLabel(animal.birthDate)}</strong></div>
              <div><span>Cập nhật</span><strong>{formatDate(latestUpdate)}</strong></div>
            </div>
          </div>
        </section>

        <section className={styles.detailPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Thông tin cơ bản</p>
              <h2><SmallIcon name="info" /> Hồ sơ cá thể</h2>
            </div>
          </div>
          <FieldGrid
            items={[
              { label: "Mã vật nuôi", value: animal.code },
              { label: "Thẻ nhận diện", value: animal.identity },
              { label: "Loài", value: animal.species || detail.group.species },
              { label: "Giống", value: animal.breed || detail.group.breed },
              { label: "Ngày sinh/nhập", value: formatDate(animal.birthDate) },
              { label: "Nguồn gốc", value: animal.origin },
              { label: "Màu lông", value: animal.colouring },
              { label: "Trạng thái sinh sản", value: animal.reproductiveState },
              { label: "Mã mẹ", value: animal.maternityId },
              { label: "Mã bố", value: animal.paternityId },
              { label: "Nhóm", value: `${detail.group.name} (${detail.group.code})` },
              { label: "Mục đích nhóm", value: detail.group.purpose },
            ]}
          />
        </section>

        <section id="so-kham-benh" className={styles.detailPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Sổ khám bệnh</p>
              <h2><SmallIcon name="growth" /> Nhật ký gần đây</h2>
            </div>
            <span className={styles.panelBadge}>{formatNumber(detail.treatments.length)} lần</span>
          </div>
          <div className={styles.sectionActions}>
            <Link className={styles.inlineAction} href={`/dashboard/vat-nuoi/${detail.group.id}/ca-the/${animal.id}/so-kham-benh`}>
              <SmallIcon name="growth" />
              Xem chi tiết
            </Link>
          </div>
          <div className={styles.timeline}>
            {detail.treatments.slice(0, 3).map((treatment) => (
              <article key={treatment.id}>
                <strong>{treatment.name || treatment.type || "Điều trị"}</strong>
                <span>{formatDate(treatment.treatmentDate || treatment.createdAt)}</span>
                <p>
                  {treatment.method || treatment.status || "Đã ghi nhận"}
                </p>
              </article>
            ))}
            {detail.treatments.length === 0 && (
              <article>
                <strong>Chưa có hồ sơ khám bệnh</strong>
                <span>Chưa cập nhật</span>
                <p>Cá thể này chưa có bản ghi điều trị riêng.</p>
              </article>
            )}
          </div>
        </section>

        <section className={styles.detailPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Sự kiện</p>
              <h2><SmallIcon name="events" /> Nhật ký cá thể</h2>
            </div>
            <span className={styles.panelBadge}>{formatNumber(detail.events.length)} sự kiện</span>
          </div>
          <div className={styles.timeline}>
            {detail.events.map((event) => (
              <article key={event.id}>
                <strong>{event.title || eventTypeLabel(event.type)}</strong>
                <span>{formatDate(event.eventDate || event.createdAt)}</span>
                <p>
                  {eventTypeLabel(event.type)}
                  {event.numericValue != null ? ` · ${formatNumber(event.numericValue, event.unit ? ` ${event.unit}` : "")}` : ""}
                  {event.note ? ` · ${event.note}` : ""}
                </p>
              </article>
            ))}
            {detail.events.length === 0 && (
              <article>
                <strong>Tạo hồ sơ cá thể</strong>
                <span>{formatDate(animal.createdAt)}</span>
                <p>{animal.code || "Cá thể"} được ghi nhận trong nhóm {detail.group.name}.</p>
              </article>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
