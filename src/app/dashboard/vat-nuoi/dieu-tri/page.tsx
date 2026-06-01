import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { CSSProperties } from "react";
import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { ensureLivestockSchema } from "@/lib/livestock-schema";
import { loadLivestockGroupDetail } from "@/lib/livestock-detail";
import { loadLivestockTreatmentSupport } from "@/lib/livestock-treatment-data";
import { ensureLivestockTreatmentSchema } from "@/lib/livestock-treatment-schema";
import { LIVESTOCK_TREATMENT_TYPE_OPTIONS } from "@/lib/livestock-treatment-types";
import TreatmentForm from "../[groupId]/treatment-form";
import styles from "./page.module.css";

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

type TreatmentGroupOption = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  count: number;
  healthStatus: string | null;
  zoneName: string | null;
  treatmentCount: number;
  lastTreatmentAt: string | Date | null;
  updatedAt: string | Date | null;
};

type TreatmentUserOption = {
  id: string;
  name: string;
  email: string | null;
};

const accentStyle = (color: string): CSSProperties => ({ "--accent": color } as CSSProperties);

const speciesColors = ["#1f7a4a", "#2563eb", "#b45309", "#7c3aed", "#0f766e", "#be123c"];

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

function statusLabel(status: string | null) {
  const raw = cleanText(status);
  if (!raw) return "Chưa cập nhật";
  const normalized = normalizeSearch(raw);
  if (normalized.includes("dang hoat dong") || normalized.includes("active")) return "Đang theo dõi";
  if (normalized.includes("theo doi") || normalized.includes("canh bao") || normalized.includes("benh")) return "Cần chú ý";
  if (normalized.includes("ngung") || normalized.includes("inactive")) return "Ngừng theo dõi";
  return raw;
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
  if (normalized.includes("ca") || normalized.includes("fish")) return "#2563eb";
  return speciesColors[index % speciesColors.length];
}

function SmallIcon({ name }: { name: "back" | "treatment" | "journal" | "inventory" | "group" }) {
  switch (name) {
    case "back":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7 5 12l5 5" /><path d="M5 12h14" /></svg>;
    case "journal":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16H7z" /><path d="M10 8h4M10 12h4M10 16h2" /></svg>;
    case "inventory":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4z" /><path d="m4 7 3-3h10l3 3" /><path d="M9 12h6" /></svg>;
    case "group":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 13c0-2.8 2.2-5 5-5s5 2.2 5 5" /><path d="M5 13h14l-1.2 6H6.2L5 13Z" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 18 10-10 2 2L8 20H6v-2Z" /><path d="m14 8 2-2 2 2-2 2" /></svg>;
  }
}

async function loadTreatmentGroups(farmId: string): Promise<TreatmentGroupOption[]> {
  await Promise.all([ensureLivestockSchema(), ensureLivestockTreatmentSchema()]);

  const rs = await db.query(
    `select n.id::text,
            n.ten_nhom,
            n.loai_vat_nuoi,
            n.giong,
            n.so_luong,
            n.trang_thai_suc_khoe,
            n.updated_at,
            k.ten_khu_vuc,
            (select count(*)::int from du_lieu.vat_nuoi v where v.nhom_vat_nuoi_id = n.id) as linked_count,
            (select count(*)::int from du_lieu.dieu_tri_vat_nuoi d where d.nhom_vat_nuoi_id = n.id) as treatment_count,
            (select max(d.ngay_dieu_tri) from du_lieu.dieu_tri_vat_nuoi d where d.nhom_vat_nuoi_id = n.id) as last_treatment_at
     from du_lieu.nhom_vat_nuoi n
     left join du_lieu.khu_vuc k on k.id = n.khu_vuc_id and coalesce(lower(k.trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
     where n.trang_trai_id = $1
     order by n.updated_at desc nulls last, n.created_at desc nulls last, n.id desc`,
    [farmId]
  );

  return rs.rows.map((row) => ({
    id: String(row.id),
    name: cleanText(row.ten_nhom) || "Nhóm vật nuôi chưa đặt tên",
    species: cleanText(row.loai_vat_nuoi) || "Vật nuôi",
    breed: cleanText(row.giong),
    count: Number(row.linked_count ?? row.so_luong ?? 0),
    healthStatus: cleanText(row.trang_thai_suc_khoe),
    zoneName: cleanText(row.ten_khu_vuc),
    treatmentCount: Number(row.treatment_count ?? 0),
    lastTreatmentAt: row.last_treatment_at ?? null,
    updatedAt: row.updated_at ?? null,
  }));
}

async function loadFarmUsers(farmId: string, ownerId: string): Promise<TreatmentUserOption[]> {
  const result = await db.query<{ id: string; name: string | null; email: string | null; sort_order: number }>(
    `select u.id::text,
            coalesce(nullif(u.ho_ten, ''), nullif(u.email, ''), 'Người dùng') as name,
            u.email,
            case when u.id::text = $2 then 0 else 1 end as sort_order
     from du_lieu.nguoi_dung u
     where u.id::text = $2
        or exists (
          select 1
          from du_lieu.thanh_vien_trang_trai tv
          where tv.trang_trai_id = $1
            and tv.nguoi_dung_id = u.id
            and coalesce(lower(tv.trang_thai), '') not in ('inactive', 'disabled', 'da_huy', 'da huy', 'đã hủy', 'cancelled')
        )
     order by sort_order asc, name asc`,
    [farmId, ownerId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name ?? row.email ?? "Người dùng",
    email: row.email,
  }));
}

export default async function LivestockTreatmentPage({ searchParams }: PageProps) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/vat-nuoi/dieu-tri");

  const data = await getDashboardOverview(ownerId);
  if (!data.farmId) redirect("/register/farm");
  if (!data.access.canWrite) redirect("/dashboard/vat-nuoi");

  const selectedGroupId = singleParam(searchParams?.groupId);
  const [groups, responsibleUsers] = await Promise.all([
    loadTreatmentGroups(data.farmId),
    loadFarmUsers(data.farmId, ownerId),
  ]);
  const selectedDetail = selectedGroupId ? await loadLivestockGroupDetail(ownerId, selectedGroupId) : null;
  if (selectedGroupId && !selectedDetail) notFound();

  const treatmentSupport = selectedDetail ? await loadLivestockTreatmentSupport(selectedDetail.farm.id, selectedDetail.group.id) : null;
  const totalTreatments = groups.reduce((sum, group) => sum + group.treatmentCount, 0);
  const selectedGroup = selectedDetail?.group;

  return (
    <DashboardShell farmName={data.farmName} activePath="/dashboard/vat-nuoi">
      <div className={styles.page}>
        <section className={styles.topBar}>
          <div className={styles.titleBlock}>
            <span className={styles.titleIcon}><SmallIcon name="treatment" /></span>
            <div>
              <p className={styles.eyebrow}>Điều trị vật nuôi</p>
              <h1>Quản lý điều trị</h1>
              <span>{selectedGroup ? `${selectedGroup.name} · ${data.farmName}` : data.farmName}</span>
            </div>
          </div>
          <Link className={styles.backButton} href="/dashboard/vat-nuoi">
            <SmallIcon name="back" />
            Tổng quan vật nuôi
          </Link>
        </section>

        <section className={styles.summaryGrid} aria-label="Tổng quan điều trị">
          <article>
            <span><SmallIcon name="group" /></span>
            <div>
              <p>Nhóm vật nuôi</p>
              <strong>{formatNumber(groups.length)}</strong>
            </div>
          </article>
          <article>
            <span><SmallIcon name="treatment" /></span>
            <div>
              <p>Loại điều trị</p>
              <strong>{formatNumber(LIVESTOCK_TREATMENT_TYPE_OPTIONS.length)}</strong>
            </div>
          </article>
          <article>
            <span><SmallIcon name="journal" /></span>
            <div>
              <p>Nhật ký điều trị</p>
              <strong>{formatNumber(totalTreatments)}</strong>
            </div>
          </article>
          <article>
            <span><SmallIcon name="inventory" /></span>
            <div>
              <p>Gắn vật tư kho</p>
              <strong>Bắt buộc</strong>
            </div>
          </article>
        </section>

        <section className={styles.treatmentTypes}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Điều trị gì</p>
              <h2>Loại điều trị và thông tin cần ghi nhận</h2>
            </div>
            <span className={styles.panelBadge}>Vật tư lấy từ kho</span>
          </div>
          <div className={styles.typeGrid}>
            {LIVESTOCK_TREATMENT_TYPE_OPTIONS.map((option) => (
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
              <p className={styles.eyebrow}>Phạm vi điều trị</p>
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
                    href={`/dashboard/vat-nuoi/dieu-tri?groupId=${group.id}`}
                    className={active ? `${styles.groupCard} ${styles.groupCardActive}` : styles.groupCard}
                    style={accentStyle(speciesColor(group.species, index))}
                  >
                    <div>
                      <strong>{group.name}</strong>
                      <p>{group.species}{group.breed ? ` · ${group.breed}` : ""}</p>
                    </div>
                    <dl>
                      <div><dt>Số lượng</dt><dd>{formatNumber(group.count)} con</dd></div>
                      <div><dt>Sức khỏe</dt><dd>{statusLabel(group.healthStatus)}</dd></div>
                      <div><dt>Khu vực</dt><dd>{group.zoneName || "Chưa gắn"}</dd></div>
                      <div><dt>Nhật ký</dt><dd>{formatNumber(group.treatmentCount)} lần · {formatDate(group.lastTreatmentAt)}</dd></div>
                    </dl>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>Chưa có nhóm vật nuôi để ghi điều trị.</div>
          )}
        </section>

        {selectedDetail && treatmentSupport ? (
          <TreatmentForm
            groupId={selectedDetail.group.id}
            groupName={selectedDetail.group.name}
            headCount={selectedDetail.group.linkedCount || selectedDetail.group.headCount}
            animals={selectedDetail.animals.map((animal) => ({ id: animal.id, code: animal.code, qrCode: animal.qrCode, identity: animal.identity, status: animal.status }))}
            warehouseItems={treatmentSupport.warehouseItems}
            recentTreatments={treatmentSupport.treatments}
            responsibleUsers={responsibleUsers}
            successHref={`/dashboard/vat-nuoi/${selectedDetail.group.id}`}
            closeHref="/dashboard/vat-nuoi/dieu-tri"
          />
        ) : (
          <section className={styles.emptyTreatment}>
            <div>
              <p className={styles.eyebrow}>Nhật ký điều trị</p>
              <h2>Chọn một nhóm để ghi điều trị và xem lịch sử</h2>
              <p>Biểu mẫu sẽ tự thay đổi trường nhập theo loại điều trị và chỉ cho chọn vật tư phù hợp từ kho.</p>
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
