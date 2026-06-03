import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { CSSProperties } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { loadLivestockGroupDetail } from "@/lib/livestock-detail";
import { loadLivestockEventSupport } from "@/lib/livestock-event-data";
import { ensureLivestockEventSchema } from "@/lib/livestock-event-schema";
import { LIVESTOCK_EVENT_TYPE_OPTIONS, isLivestockEventType, type LivestockEventType } from "@/lib/livestock-event-types";
import EventForm from "./event-form";
import styles from "./page.module.css";

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

type EventGroupOption = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  count: number;
  zoneName: string | null;
  eventCount: number;
  lastEventAt: string | Date | null;
  updatedAt: string | Date | null;
};

type InitialGroupingAction = "split_group" | "merge_group";

const accentStyle = (color: string): CSSProperties => ({ "--accent": color } as CSSProperties);
const speciesColors = ["#1f7a4a", "#2563eb", "#b45309", "#7c3aed", "#0f766e", "#be123c"];

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeInitialType(value: string | string[] | undefined): LivestockEventType | undefined {
  const raw = singleParam(value);
  return isLivestockEventType(raw) ? raw : undefined;
}

function normalizeInitialGroupingAction(value: string | string[] | undefined): InitialGroupingAction | undefined {
  const raw = singleParam(value);
  if (raw === "tach_nhom" || raw === "split_group") return "split_group";
  if (raw === "ghep_nhom" || raw === "merge_group") return "merge_group";
  return undefined;
}

function eventGroupHref(groupId: string, initialType: LivestockEventType | undefined, initialGroupingAction: InitialGroupingAction | undefined) {
  const params = new URLSearchParams({ groupId });
  if (initialType) params.set("loai", initialType);
  if (initialGroupingAction) params.set("kieu", initialGroupingAction === "split_group" ? "tach_nhom" : "ghep_nhom");
  return `/dashboard/vat-nuoi/su-kien?${params.toString()}`;
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDate(value: string | Date | null) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function speciesColor(species: string, index: number) {
  const normalized = normalizeSearch(species);
  if (normalized.includes("bo") || normalized.includes("trau") || normalized.includes("cattle")) return "#8a5a34";
  if (normalized.includes("de") || normalized.includes("goat")) return "#0f766e";
  if (normalized.includes("heo") || normalized.includes("lon") || normalized.includes("pig")) return "#db2777";
  if (normalized.includes("ga") || normalized.includes("vit") || normalized.includes("chicken") || normalized.includes("duck")) return "#d97706";
  return speciesColors[index % speciesColors.length];
}

function SmallIcon({ name }: { name: "back" | "event" | "journal" | "group" | "animal" }) {
  switch (name) {
    case "back":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7 5 12l5 5" /><path d="M5 12h14" /></svg>;
    case "journal":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16H7z" /><path d="M10 8h4M10 12h4M10 16h2" /></svg>;
    case "group":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 13c0-2.8 2.2-5 5-5s5 2.2 5 5" /><path d="M5 13h14l-1.2 6H6.2L5 13Z" /></svg>;
    case "animal":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17c0-4 3-7 7-7s7 3 7 7" /><path d="M8 10 6 5m10 5 2-5" /><path d="M9 17v3m6-3v3" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16H7z" /><path d="M10 8h4M10 12h4M10 16h2" /></svg>;
  }
}

async function loadEventGroups(farmId: string): Promise<EventGroupOption[]> {
  await ensureLivestockEventSchema();

  const rs = await db.query(
    `select n.id::text,
            n.ten_nhom,
            n.loai_vat_nuoi,
            n.giong,
            n.so_luong,
            n.updated_at,
            k.ten_khu_vuc,
            (select count(*)::int from du_lieu.vat_nuoi v where v.nhom_vat_nuoi_id = n.id) as linked_count,
            (select count(*)::int from du_lieu.su_kien_vat_nuoi s where s.nhom_vat_nuoi_id = n.id) as event_count,
            (select max(s.ngay_su_kien) from du_lieu.su_kien_vat_nuoi s where s.nhom_vat_nuoi_id = n.id) as last_event_at
     from du_lieu.nhom_vat_nuoi n
     left join du_lieu.khu_vuc k on k.id = n.khu_vuc_id and coalesce(lower(k.trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
     where n.trang_trai_id = $1
       and coalesce(lower(n.loai_vat_nuoi), '') not in ('cá', 'ca', 'fish')
     order by n.updated_at desc nulls last, n.created_at desc nulls last, n.id desc`,
    [farmId]
  );

  return rs.rows.map((row) => ({
    id: String(row.id),
    name: cleanText(row.ten_nhom) || "Nhóm vật nuôi chưa đặt tên",
    species: cleanText(row.loai_vat_nuoi) || "Vật nuôi",
    breed: cleanText(row.giong),
    count: Number(row.linked_count ?? row.so_luong ?? 0),
    zoneName: cleanText(row.ten_khu_vuc),
    eventCount: Number(row.event_count ?? 0),
    lastEventAt: row.last_event_at ?? null,
    updatedAt: row.updated_at ?? null,
  }));
}

async function loadCurrentUserName(ownerId: string) {
  try {
    const rs = await db.query<{ name: string | null }>(
      `select coalesce(
          (select nullif(ho_ten, '') from du_lieu.nguoi_dung where id::text = $1 limit 1),
          (select nullif(email, '') from du_lieu.nguoi_dung where id::text = $1 limit 1),
          'Người dùng hiện tại'
        ) as name`,
      [ownerId]
    );
    return cleanText(rs.rows[0]?.name) || "Người dùng hiện tại";
  } catch {
    return "Người dùng hiện tại";
  }
}

export default async function LivestockEventPage({ searchParams }: PageProps) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/vat-nuoi/su-kien");

  const data = await getDashboardOverview(ownerId);
  if (!data.farmId) redirect("/register/farm");
  if (!data.access.canWrite) redirect("/dashboard/vat-nuoi");

  const selectedGroupId = singleParam(searchParams?.groupId);
  const initialType = normalizeInitialType(searchParams?.loai);
  const initialGroupingAction = normalizeInitialGroupingAction(searchParams?.kieu);
  const groups = await loadEventGroups(data.farmId);
  const selectedDetail = selectedGroupId ? await loadLivestockGroupDetail(ownerId, selectedGroupId) : null;
  if (selectedGroupId && !selectedDetail) notFound();

  const eventSupport = selectedDetail ? await loadLivestockEventSupport(selectedDetail.farm.id, selectedDetail.group.id) : null;
  const currentUserName = data.ownerName ?? await loadCurrentUserName(ownerId);
  const totalEvents = groups.reduce((sum, group) => sum + group.eventCount, 0);
  const selectedGroup = selectedDetail?.group;

  return (
    <DashboardShell farmName={data.farmName} activePath="/dashboard/vat-nuoi">
      <div className={styles.page}>
        <section className={styles.topBar}>
          <div className={styles.titleBlock}>
            <span className={styles.titleIcon}><SmallIcon name="event" /></span>
            <div>
              <p className={styles.eyebrow}>Sự kiện vật nuôi</p>
              <h1>Ghi nhận sự kiện</h1>
              <span>{selectedGroup ? `${selectedGroup.name} · ${data.farmName}` : data.farmName}</span>
            </div>
          </div>
          <Link className={styles.backButton} href="/dashboard/vat-nuoi">
            <SmallIcon name="back" />
            Tổng quan vật nuôi
          </Link>
        </section>

        <section className={styles.summaryGrid} aria-label="Tổng quan sự kiện vật nuôi">
          <article>
            <span><SmallIcon name="group" /></span>
            <div>
              <p>Nhóm vật nuôi</p>
              <strong>{formatNumber(groups.length)}</strong>
            </div>
          </article>
          <article>
            <span><SmallIcon name="event" /></span>
            <div>
              <p>Loại sự kiện</p>
              <strong>{formatNumber(LIVESTOCK_EVENT_TYPE_OPTIONS.length)}</strong>
            </div>
          </article>
          <article>
            <span><SmallIcon name="journal" /></span>
            <div>
              <p>Nhật ký sự kiện</p>
              <strong>{formatNumber(totalEvents)}</strong>
            </div>
          </article>
          <article>
            <span><SmallIcon name="animal" /></span>
            <div>
              <p>Gắn cá thể</p>
              <strong>Bắt buộc</strong>
            </div>
          </article>
        </section>

        <section className={styles.eventTypes}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Nhiệm vụ</p>
              <h2>Chọn loại sự kiện cần ghi nhận</h2>
            </div>
            <span className={styles.panelBadge}>Tiếng Việt</span>
          </div>
          <div className={styles.typeGrid}>
            {LIVESTOCK_EVENT_TYPE_OPTIONS.map((option) => (
              <article key={option.value}>
                <strong>{option.label}</strong>
                <p>{option.purpose}</p>
                <small>{option.fields.map((field) => field.label).join(", ")}</small>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.groupPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Phạm vi</p>
              <h2>Chọn nhóm vật nuôi</h2>
            </div>
            <span className={styles.panelBadge}>{formatNumber(groups.length)} nhóm</span>
          </div>

          {groups.length > 0 ? (
            <div className={styles.groupGrid}>
              {groups.map((group, index) => {
                const active = group.id === selectedGroupId;
                return (
                  <Link
                    key={group.id}
                    href={eventGroupHref(group.id, initialType, initialGroupingAction)}
                    className={active ? `${styles.groupCard} ${styles.groupCardActive}` : styles.groupCard}
                    style={accentStyle(speciesColor(group.species, index))}
                  >
                    <div>
                      <strong>{group.name}</strong>
                      <p>{group.species}{group.breed ? ` · ${group.breed}` : ""}</p>
                    </div>
                    <dl>
                      <div><dt>Số lượng</dt><dd>{formatNumber(group.count)} con</dd></div>
                      <div><dt>Khu vực</dt><dd>{group.zoneName || "Chưa gắn"}</dd></div>
                      <div><dt>Sự kiện</dt><dd>{formatNumber(group.eventCount)} lần</dd></div>
                      <div><dt>Gần nhất</dt><dd>{formatDate(group.lastEventAt)}</dd></div>
                    </dl>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>Chưa có nhóm vật nuôi để ghi sự kiện.</div>
          )}
        </section>

        {selectedDetail && eventSupport ? (
          <EventForm
            groupId={selectedDetail.group.id}
            groupName={selectedDetail.group.name}
            animals={selectedDetail.animals.map((animal) => ({ id: animal.id, code: animal.code, qrCode: animal.qrCode, identity: animal.identity, status: animal.status }))}
            zones={eventSupport.zones}
            groupZoneId={selectedDetail.zone?.id ?? ""}
            currentUserName={currentUserName}
            recentEvents={eventSupport.events}
            groupOptions={groups.map((group) => ({
              id: group.id,
              name: group.name,
              species: group.species,
              breed: group.breed,
              count: group.count,
              zoneName: group.zoneName,
            }))}
            initialType={initialType}
            initialGroupingAction={initialGroupingAction}
            closeHref="/dashboard/vat-nuoi/su-kien"
          />
        ) : (
          <section className={styles.emptyEvent}>
            <div>
              <p className={styles.eyebrow}>Nhật ký sự kiện</p>
              <h2>Chọn một nhóm để ghi sự kiện</h2>
              <p>Mỗi sự kiện sẽ lưu kèm các cá thể được chọn để theo dõi lịch sử điều trị, di chuyển, sinh sản và cân nặng về sau.</p>
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
