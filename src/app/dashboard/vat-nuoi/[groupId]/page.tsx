import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { CSSProperties } from "react";
import DashboardShell from "@/components/dashboard-shell";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { loadLivestockGroupDetail, type LivestockDetail } from "@/lib/livestock-detail";
import { getLivestockEventTypeOption, isLivestockEventType } from "@/lib/livestock-event-types";
import { renderQrSvg } from "@/lib/qr-code";
import EditGroupForm from "./edit-group-form";
import GroupDetailActions from "./group-detail-actions";
import styles from "./page.module.css";

type PageProps = {
  params: { groupId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

const accentStyle = (color: string): CSSProperties => ({ "--accent": color } as CSSProperties);

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value == null || !Number.isFinite(value)) return "Chưa cập nhật";
  return `${new Intl.NumberFormat("vi-VN").format(value)}${suffix}`;
}

function formatMoney(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "Chưa cập nhật";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
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
  if (normalized.includes("tu vong") || normalized.includes("deceased") || normalized.includes("dead")) return "Đã tử vong";
  if (normalized.includes("dang hoat dong") || normalized.includes("active")) return "Đang theo dõi";
  if (normalized.includes("theo doi") || normalized.includes("canh bao") || normalized.includes("benh")) return "Cần chú ý";
  if (normalized.includes("ngung") || normalized.includes("inactive")) return "Ngừng theo dõi";
  return raw;
}

function isDeceasedStatus(status: string | null) {
  const normalized = normalizeSearch(status);
  return normalized.includes("tu vong") || normalized.includes("deceased") || normalized.includes("dead");
}

function eventTypeLabel(type: string | null) {
  return isLivestockEventType(type) ? getLivestockEventTypeOption(type).label : "Sự kiện";
}

function searchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function AnimalIcon({ species }: { species: string }) {
  const key = normalizeSearch(species);
  if (key.includes("ga") || key.includes("vit")) {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M22 30c0-8 6-14 14-14 7 0 13 5 13 12 0 4-2 8-5 10l-4 3H29c-4 0-7-3-7-7v-4Z" fill="currentColor" opacity="0.16" />
        <path d="m30 16 3-6 3 6m4 1 5-4m-19 4-5-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="m42 30 8 3-8 4Z" fill="currentColor" />
        <circle cx="35" cy="29" r="2.1" fill="currentColor" />
        <path d="M28 45v8m10-8v8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (key.includes("ca")) {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M12 33c8-10 22-14 36-4l6-6v20l-6-6c-14 10-28 6-36-4Z" fill="currentColor" opacity="0.18" />
        <circle cx="24" cy="31" r="2.3" fill="currentColor" />
        <path d="M37 27c-3 4-3 8 0 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M11 28c0-6 5-10 11-10h20c6 0 11 4 11 10v8c0 7-6 12-13 12H24c-7 0-13-5-13-12v-8Z" fill="currentColor" opacity="0.16" />
      <path d="M17 23 9 17m38 6 8-6M24 18l-3-7m19 7 3-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="25" cy="32" r="2.4" fill="currentColor" />
      <circle cx="39" cy="32" r="2.4" fill="currentColor" />
      <path d="M27 39c3 2 7 2 10 0M21 47v7m22-7v7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SmallIcon({ name }: { name: "back" | "qr" | "print" | "info" | "growth" | "animals" | "events" | "map" | "deceased" }) {
  switch (name) {
    case "back":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7 5 12l5 5" /><path d="M5 12h14" /></svg>;
    case "qr":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h2v2h-2zM18 14h2v6h-2zM14 18h2v2h-2z" /></svg>;
    case "print":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V4h10v4" /><path d="M6 17H4v-7h16v7h-2" /><path d="M7 14h10v6H7z" /></svg>;
    case "growth":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16" /><path d="m6 16 4-4 3 2 5-7" /></svg>;
    case "animals":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 13c0-2.8 2.2-5 5-5s5 2.2 5 5" /><path d="M5 13h14l-1.2 6H6.2L5 13Z" /></svg>;
    case "events":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16H7z" /><path d="M10 8h4M10 12h4M10 16h2" /></svg>;
    case "map":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" /><path d="M9 4v14M15 6v14" /></svg>;
    case "deceased":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 3 20h18L12 4Z" /><path d="M12 9v5M12 17h.01" /></svg>;
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

function ProgressSparkline({ detail }: { detail: LivestockDetail }) {
  const start = detail.group.averageBirthWeight ?? 0;
  const target = detail.group.targetLiveWeight ?? Math.max(start, 1);
  const current = target > 0 ? Math.min(target, Math.max(start, target * 0.62)) : start;
  const values = [start, current * 0.38, current * 0.65, current, target].map((value) => Math.max(0, value));
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${20 + index * 65},${122 - (value / max) * 88}`).join(" ");

  return (
    <svg className={styles.sparkline} viewBox="0 0 300 140" role="img" aria-label="Biểu đồ tăng trưởng">
      <path d="M20 122H280M20 94H280M20 66H280M20 38H280" />
      <polyline points={points} />
      {values.map((value, index) => {
        const [x, y] = points.split(" ")[index].split(",");
        return <circle key={`${value}-${index}`} cx={x} cy={y} r="4" />;
      })}
    </svg>
  );
}

export default async function LivestockGroupDetailPage({ params, searchParams }: PageProps) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect(`/login?next=/dashboard/vat-nuoi/${params.groupId}`);

  const [detail, overview] = await Promise.all([
    loadLivestockGroupDetail(ownerId, params.groupId),
    getDashboardOverview(ownerId),
  ]);
  if (!detail) notFound();

  const group = detail.group;
  const zone = detail.zone;
  const action = searchValue(searchParams?.["hanh-dong"]);
  const showDeceasedAnimals = searchValue(searchParams?.["hien-ca-the-tu-vong"]) === "1";
  const showHeader = searchValue(searchParams?.["hien-dau-nhom"]) !== "0";
  const showSummary = searchValue(searchParams?.["hien-tom-tat"]) !== "0";
  const showProfile = searchValue(searchParams?.["hien-ho-so"]) !== "0";
  const showGrowth = searchValue(searchParams?.["hien-tang-truong"]) !== "0";
  const showMedicalRecord = searchValue(searchParams?.["hien-so-kham"]) !== "0";
  const showAnimalsTable = searchValue(searchParams?.["hien-bang-ca-the"]) !== "0";
  const showEvents = searchValue(searchParams?.["hien-nhat-ky"]) !== "0";
  const showMap = searchValue(searchParams?.["hien-ban-do"]) !== "0";
  const visibleAnimals = showDeceasedAnimals ? detail.animals : detail.animals.filter((animal) => !isDeceasedStatus(animal.status));
  const hiddenDeceasedAnimalCount = detail.animals.length - visibleAnimals.length;
  const displayedAnimalCount = detail.animals.length > 0 ? visibleAnimals.length : group.linkedCount || group.headCount;
  const groupDeceased = isDeceasedStatus(group.healthStatus) || (detail.animals.length > 0 && detail.animals.every((animal) => isDeceasedStatus(animal.status)));
  if (!overview.access.canWrite && action) redirect(`/dashboard/vat-nuoi/${group.id}`);
  if (action === "dieu-tri") {
    redirect(`/dashboard/vat-nuoi/dieu-tri?groupId=${group.id}`);
  }
  if (action === "ghi-nhan-su-kien") {
    redirect(`/dashboard/vat-nuoi/su-kien?groupId=${group.id}`);
  }
  if (action === "di-chuyen") {
    redirect(`/dashboard/vat-nuoi/su-kien?groupId=${group.id}&loai=move`);
  }
  if (action === "tach-nhom") {
    redirect(`/dashboard/vat-nuoi/su-kien?groupId=${group.id}&loai=grouping&kieu=tach_nhom`);
  }
  if (action === "ghep-nhom") {
    redirect(`/dashboard/vat-nuoi/su-kien?groupId=${group.id}&loai=grouping&kieu=ghep_nhom`);
  }
  if (action === "cap-nhat-so-luong" || action === "tu-vong") {
    redirect(`/dashboard/vat-nuoi/su-kien?groupId=${group.id}&loai=adjustment`);
  }
  const editOpen = overview.access.canWrite && action === "chinh-sua";
  const qrReadyCount = visibleAnimals.filter((animal) => animal.qrCode).length;
  const latestUpdate = group.updatedAt || group.createdAt;
  const zoneColor = zone?.color ?? "#2f855a";
  const mapObjects = zone?.center
    ? [
        {
          id: `group-${group.id}`,
          label: `${group.name}: ${formatNumber(displayedAnimalCount, " con")}`,
          color: zoneColor,
          kind: "vat_nuoi",
          geometry: { type: "Point" as const, coordinates: [zone.center.lng, zone.center.lat] as [number, number] },
        },
      ]
    : [];

  return (
    <DashboardShell farmName={detail.farm.name} activePath="/dashboard/vat-nuoi">
      <div className={styles.page}>
        <section className={styles.topBar}>
          <div className={styles.titleBlock}>
            <span className={styles.titleIcon}><AnimalIcon species={group.species} /></span>
            <div>
              <p className={styles.eyebrow}>Chi tiết nhóm vật nuôi</p>
              <h1>{group.name}</h1>
              <span>{group.code}</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <GroupDetailActions
              groupId={group.id}
              canWrite={overview.access.canWrite}
              showDeceasedAnimals={showDeceasedAnimals}
            />
          </div>
        </section>

        <EditGroupForm open={editOpen} group={group} />

        {showHeader && <section className={styles.heroPanel} style={accentStyle(zoneColor)}>
          <div className={styles.heroAvatar}>
            <AnimalIcon species={group.species} />
          </div>
          <div className={styles.heroContent}>
            <div className={styles.heroTitle}>
              <div>
                <h2>{group.species}</h2>
                <p>{group.breed || "Chưa cập nhật giống"} · {formatNumber(displayedAnimalCount, " con")}</p>
              </div>
              <span className={`${styles.statusPill} ${groupDeceased ? styles.deceasedPill : ""}`}>{groupDeceased ? "Đã tử vong" : statusLabel(group.healthStatus)}</span>
            </div>
            <p className={styles.heroDescription}>{group.description || group.herdNotes || "Nhóm vật nuôi đang được theo dõi trong hệ thống trang trại."}</p>
            <div className={styles.quickFacts}>
              <div><span>Giống</span><strong>{group.breed || "Chưa cập nhật"}</strong></div>
              <div><span>Giới tính</span><strong>{group.gender || "Chưa cập nhật"}</strong></div>
              <div><span>Giai đoạn</span><strong>{group.lifeStage || "Chưa cập nhật"}</strong></div>
              <div><span>Tuổi nhóm</span><strong>{ageLabel(group.birthDate)}</strong></div>
              <div><span>Khu vực</span><strong>{zone?.name || "Chưa gắn khu vực"}</strong></div>
            </div>
          </div>
        </section>}

        {showSummary && <section className={styles.statsGrid}>
          <article><span>Tổng hồ sơ</span><strong>{formatNumber(displayedAnimalCount)}</strong></article>
          <article><span>Mã QR sẵn sàng</span><strong>{formatNumber(qrReadyCount)}</strong></article>
          <article><span>Khối lượng mục tiêu</span><strong>{formatNumber(group.targetLiveWeight, " kg")}</strong></article>
          <article><span>Cập nhật</span><strong>{formatDate(latestUpdate)}</strong></article>
        </section>}

        {showProfile && <section className={styles.detailPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Thông tin cơ bản</p>
              <h2><SmallIcon name="info" /> Hồ sơ nhóm</h2>
            </div>
          </div>
          <FieldGrid
            items={[
              { label: "Loài", value: group.species },
              { label: "Giống", value: group.breed },
              { label: "Mục đích", value: group.purpose },
              { label: "Nguồn gốc", value: group.origin },
              { label: "Ngày sinh/nhập", value: formatDate(group.birthDate) },
              { label: "Tạo từ", value: group.createFrom },
              { label: "Giá trị mua", value: formatMoney(group.price) },
              { label: "Tài khoản chi phí", value: group.expenseAccount },
              { label: "Mã mẹ", value: group.maternityId },
              { label: "Mã bố", value: group.paternityId },
              { label: "Phương thức quản lý", value: group.primaryIdentification || "Mã QR cá thể" },
              { label: "Trạng thái sinh sản", value: group.reproductiveState },
            ]}
          />
        </section>}

        {showGrowth && <section className={styles.detailPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Tăng trưởng</p>
              <h2><SmallIcon name="growth" /> Hiệu suất và mục tiêu</h2>
            </div>
            <span className={styles.panelBadge}>{formatNumber(group.lifetimeAdg, " kg/ngày")}</span>
          </div>
          <div className={styles.performanceGrid}>
            <ProgressSparkline detail={detail} />
            <FieldGrid
              items={[
                { label: "Khối lượng sơ sinh TB", value: formatNumber(group.averageBirthWeight, " kg") },
                { label: "Năng lượng/ngày", value: formatNumber(group.lifetimeMjDay, " MJ") },
                { label: "Khối lượng mục tiêu", value: formatNumber(group.targetLiveWeight, " kg") },
                { label: "Ngày cần mục tiêu", value: formatDate(group.targetWeightDate) },
                { label: "Điểm thể trạng", value: formatNumber(group.bodyConditionScore) },
                { label: "Vấn đề sức khỏe", value: group.healthIssues },
              ]}
            />
          </div>
        </section>}

        {showMedicalRecord && <section id="so-kham-benh" className={styles.detailPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Sổ khám bệnh</p>
              <h2><SmallIcon name="events" /> Nhật ký gần đây</h2>
            </div>
            <div className={styles.sectionActions}>
              <Link className={styles.inlineAction} href={`/dashboard/vat-nuoi/${group.id}/so-kham-benh`}>
                <SmallIcon name="events" />
                Xem chi tiết
              </Link>
            </div>
          </div>
          <div className={styles.timeline}>
            {detail.treatments.slice(0, 3).map((treatment) => (
              <article key={`medical-treatment-${treatment.id}`}>
                <strong>{treatment.name || treatment.type || "Điều trị"}</strong>
                <span>{formatDate(treatment.treatmentDate || treatment.createdAt)}</span>
                <p>
                  {formatNumber(treatment.treatedCount, " con")}
                  {treatment.method ? ` · ${treatment.method}` : ""}
                </p>
              </article>
            ))}
            {detail.events
              .filter((event) => {
                const value = normalizeSearch(`${event.type ?? ""} ${event.title ?? ""} ${event.note ?? ""}`);
                return value.includes("benh") || value.includes("kham") || value.includes("suc khoe") || value.includes("health") || value.includes("treatment");
              })
              .slice(0, Math.max(0, 3 - detail.treatments.slice(0, 3).length))
              .map((event) => (
                <article key={`medical-event-${event.id}`}>
                  <strong>{event.title || eventTypeLabel(event.type)}</strong>
                  <span>{formatDate(event.eventDate || event.createdAt)}</span>
                  <p>{eventTypeLabel(event.type)} · {formatNumber(event.animalCount, " cá thể")}</p>
                </article>
              ))}
            {detail.treatments.length === 0 && (
              <article>
                <strong>Chưa có hồ sơ khám bệnh</strong>
                <span>Chưa cập nhật</span>
                <p>Nhóm này chưa có bản ghi điều trị hoặc sự kiện sức khỏe.</p>
              </article>
            )}
          </div>
        </section>}

        {showAnimalsTable && <section className={styles.detailPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Động vật trong nhóm</p>
              <h2><SmallIcon name="animals" /> {formatNumber(visibleAnimals.length)} hồ sơ cá thể</h2>
            </div>
            <div className={styles.sectionActions}>
              {hiddenDeceasedAnimalCount > 0 && (
                <Link
                  className={`${styles.inlineAction} ${showDeceasedAnimals ? styles.deceasedInlineAction : styles.secondaryInlineAction}`}
                  href={showDeceasedAnimals ? `/dashboard/vat-nuoi/${group.id}` : `/dashboard/vat-nuoi/${group.id}?hien-ca-the-tu-vong=1`}
                >
                  <SmallIcon name="deceased" />
                  {showDeceasedAnimals ? "Ẩn cá thể tử vong" : "Xem cá thể tử vong"}
                </Link>
              )}
              <Link className={styles.inlineAction} href={`/dashboard/vat-nuoi/${group.id}/qr-pdf`} target="_blank" rel="noopener noreferrer">
                <SmallIcon name="qr" />
                In QR
              </Link>
            </div>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Mã vật nuôi</th>
                  <th>Mã QR</th>
                  <th>Trạng thái</th>
                  <th>Khu vực</th>
                  <th>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {visibleAnimals.map((animal) => {
                  const animalDeceased = isDeceasedStatus(animal.status);
                  return (
                  <tr key={animal.id}>
                    <td>
                      <Link className={styles.animalCellLink} href={`/dashboard/vat-nuoi/${group.id}/ca-the/${animal.id}`}>
                        <strong>{animal.code || "Chưa có mã"}</strong>
                        <span>Xem chi tiết</span>
                      </Link>
                    </td>
                    <td>
                      <Link className={styles.qrCell} href={`/dashboard/vat-nuoi/${group.id}/ca-the/${animal.id}`}>
                        {animal.qrCode ? <span dangerouslySetInnerHTML={{ __html: renderQrSvg(animal.qrCode, { margin: 3 }) }} /> : null}
                        <code>{animal.qrCode || "Chưa có QR"}</code>
                      </Link>
                    </td>
                    <td><span className={`${styles.statusPill} ${animalDeceased ? styles.deceasedPill : ""}`}>{statusLabel(animal.status)}</span></td>
                    <td>{zone?.name || "Chưa gắn khu vực"}</td>
                    <td>{formatDate(animal.updatedAt || animal.createdAt)}</td>
                  </tr>
                );})}
                {visibleAnimals.length === 0 && (
                  <tr>
                    <td colSpan={5} className={styles.emptyTableCell}>{hiddenDeceasedAnimalCount > 0 ? "Các cá thể tử vong đang được ẩn." : "Nhóm này chưa có hồ sơ cá thể."}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>}

        {showEvents && <section className={styles.detailPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Sự kiện nhóm</p>
              <h2><SmallIcon name="events" /> Nhật ký gần đây</h2>
            </div>
          </div>
          <div className={styles.timeline}>
            <article>
              <strong>Tạo nhóm vật nuôi</strong>
              <span>{formatDate(group.createdAt)}</span>
              <p>{group.name} được ghi nhận với {formatNumber(group.headCount, " con")}.</p>
            </article>
            {detail.events.slice(0, 8).map((event) => (
              <article key={`event-${event.id}`}>
                <strong>{event.title || eventTypeLabel(event.type)}</strong>
                <span>{formatDate(event.eventDate || event.createdAt)}</span>
                <p>{eventTypeLabel(event.type)} · {formatNumber(event.animalCount, " cá thể")}{event.note ? ` · ${event.note}` : ""}</p>
              </article>
            ))}
            {detail.events.length === 0 && visibleAnimals.slice(0, 5).map((animal) => (
              <article key={`event-${animal.id}`}>
                <strong>Tạo hồ sơ cá thể</strong>
                <span>{formatDate(animal.createdAt)}</span>
                <p>{animal.code || "Vật nuôi"} được cấp mã QR {animal.qrCode || "chưa có"}.</p>
              </article>
            ))}
          </div>
        </section>}

        {showMap && <section className={styles.detailPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Bản đồ trang trại</p>
              <h2><SmallIcon name="map" /> Vị trí nhóm vật nuôi</h2>
            </div>
            <span className={styles.panelBadge}>{zone?.name || detail.farm.locationName || "Trang trại"}</span>
          </div>
          <div className={styles.mapShell}>
            <MapViewSwitcher
              lat={zone?.center?.lat ?? detail.farm.latitude}
              lng={zone?.center?.lng ?? detail.farm.longitude}
              zoom={16}
              title="Vị trí nhóm vật nuôi"
              initialMode="satellite"
              frameClassName={styles.mapFrame}
              hideEcoNote
              zones={zone && zone.polygon.length >= 3 ? [{ id: zone.id, label: zone.name, color: zone.color, kind: zone.status ?? undefined, polygon: zone.polygon }] : []}
              objects={mapObjects}
              fitToPolygon={Boolean(zone?.polygon.length || mapObjects.length)}
            />
          </div>
        </section>}
      </div>
    </DashboardShell>
  );
}
