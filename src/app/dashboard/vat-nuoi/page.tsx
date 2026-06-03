import DashboardShell from "@/components/dashboard-shell";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import Link from "next/link";
import LivestockPageTools from "./livestock-page-tools";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { ensureLivestockSchema } from "@/lib/livestock-schema";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import styles from "./page.module.css";

type SpeciesIcon = "cow" | "goat" | "sheep" | "pig" | "chicken" | "duck" | "buffalo" | "other";

type AnimalRow = {
  id: string;
  code: string | null;
  qrCode: string | null;
  identity: string | null;
  species: string | null;
  breed: string | null;
  status: string | null;
  description: string | null;
  groupId: string | null;
  zoneId: string | null;
  zoneName: string | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
};

type AnimalGroupRow = {
  id: string;
  name: string;
  species: string;
  description: string | null;
  createFrom: string | null;
  breed: string | null;
  headCount: number;
  linkedCount: number;
  deceasedCount: number;
  healthStatus: string | null;
  gender: string | null;
  lifeStage: string | null;
  purpose: string | null;
  locationId: string | null;
  zoneName: string | null;
  herdNotes: string | null;
  origin: string | null;
  price: string | null;
  expenseAccount: string | null;
  birthDate: string | null;
  conceptionType: string | null;
  averageBirthWeight: string | null;
  birthNotes: string | null;
  healthIssues: string | null;
  maternityId: string | null;
  paternityId: string | null;
  colouring: string | null;
  eyeColor: string | null;
  earType: string | null;
  hornType: string | null;
  mouth: string | null;
  bodyConditionScore: string | null;
  traitNotes: string | null;
  primaryIdentification: string | null;
  reproductiveState: string | null;
  reproductiveAvailability: string | null;
  lifetimeAdg: string | null;
  lifetimeMjDay: string | null;
  targetLiveWeight: string | null;
  targetWeightDate: string | null;
  updatedAt: string | Date | null;
  createdAt: string | Date | null;
};

type FarmZone = {
  id: string;
  name: string;
  status: string | null;
  areaHa: number;
  polygon: Array<{ lat: number; lng: number }>;
  center: { lat: number; lng: number } | null;
  color: string;
  animalCount: number;
  latestCount: number | null;
  latestCountAt: string | Date | null;
};

type CountSummary = {
  latestTotal: number;
  countedZones: number;
  records: number;
  latestCountedAt: string | Date | null;
};

type AlertSummary = {
  total: number;
  open: number;
};

type AnimalGroup = {
  key: string;
  href?: string;
  label: string;
  icon: SpeciesIcon;
  color: string;
  count: number;
  activeCount: number;
  deceased: boolean;
  deceasedCount: number;
  zones: string[];
  statusLabel: string;
  updatedAt: string | Date | null;
};

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

const speciesCatalog: Array<{ label: string; icon: SpeciesIcon; color: string; keywords: string[] }> = [
  { label: "Bò", icon: "cow", color: "#8a5a34", keywords: ["bo", "cow", "cattle"] },
  { label: "Trâu", icon: "buffalo", color: "#475569", keywords: ["trau", "buffalo"] },
  { label: "Dê", icon: "goat", color: "#0f766e", keywords: ["de", "goat"] },
  { label: "Cừu", icon: "sheep", color: "#64748b", keywords: ["cuu", "sheep"] },
  { label: "Heo", icon: "pig", color: "#db2777", keywords: ["heo", "lon", "pig"] },
  { label: "Gà", icon: "chicken", color: "#d97706", keywords: ["ga", "chicken"] },
  { label: "Vịt", icon: "duck", color: "#0284c7", keywords: ["vit", "duck"] },
];

const zonePalette = ["#2f855a", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#4d7c0f"];

const accentStyle = (color: string): CSSProperties => ({ "--accent": color } as CSSProperties);

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function makeKey(value: string) {
  return normalizeSearch(value).replace(/[^a-z0-9]+/g, "-") || "chua-phan-loai";
}

function isHexColor(value: unknown) {
  return /^#[0-9a-f]{6}$/i.test(String(value ?? "").trim());
}

function formatDate(value: string | Date | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dateInputValue(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value as string | Date);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function statusLabel(status: string | null) {
  const raw = cleanText(status);
  if (!raw) return "Chưa cập nhật";
  const normalized = normalizeSearch(raw);
  if (normalized.includes("tu vong") || normalized.includes("deceased") || normalized.includes("dead")) return "Đã tử vong";
  if (normalized.includes("dang hoat dong") || normalized.includes("active")) return "Đang theo dõi";
  if (normalized.includes("theo doi") || normalized.includes("canh bao") || normalized.includes("benh")) return "Cần chú ý";
  if (normalized.includes("ngung") || normalized.includes("inactive")) return "Ngừng theo dõi";
  return raw;
}

function searchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isActiveStatus(status: string | null) {
  const normalized = normalizeSearch(status);
  return normalized.includes("dang hoat dong") || normalized.includes("active");
}

function isDeceasedStatus(status: string | null) {
  const normalized = normalizeSearch(status);
  return normalized.includes("tu vong") || normalized.includes("deceased") || normalized.includes("dead");
}

function resolveSpecies(row: AnimalRow) {
  const haystack = normalizeSearch([row.species, row.breed, row.identity, row.description, row.code].filter(Boolean).join(" "));
  const matched = speciesCatalog.find((item) => item.keywords.some((keyword) => haystack.includes(keyword)));
  if (matched) return matched;

  const fallbackLabel = cleanText(row.identity) || cleanText(row.description) || "Chưa phân loại";
  return { label: fallbackLabel, icon: "other" as SpeciesIcon, color: "#64748b", keywords: [] };
}

function resolveSpeciesFromText(value: string | null) {
  const haystack = normalizeSearch(value);
  const matched = speciesCatalog.find((item) => item.keywords.some((keyword) => haystack.includes(keyword)));
  if (matched) return matched;

  const fallbackLabel = cleanText(value) || "Chưa phân loại";
  return { label: fallbackLabel, icon: "other" as SpeciesIcon, color: "#64748b", keywords: [] };
}

function normalizePolygon(raw: unknown): Array<{ lat: number; lng: number }> {
  const geometry = raw as
    | {
        geo?: { polygon?: unknown; coordinates?: unknown };
        polygon?: unknown;
        coordinates?: unknown;
      }
    | null
    | undefined;

  const directPolygon = geometry?.geo?.polygon ?? geometry?.polygon;
  if (Array.isArray(directPolygon)) {
    return directPolygon
      .map((point) => {
        if (!point || typeof point !== "object") return null;
        const lat = Number((point as { lat?: number | string }).lat);
        const lng = Number((point as { lng?: number | string }).lng);
        return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
      })
      .filter((value): value is { lat: number; lng: number } => Boolean(value));
  }

  const coordinates = geometry?.geo?.coordinates ?? geometry?.coordinates;
  const coordinateRoot = Array.isArray(coordinates) ? coordinates : [];
  const maybeFirst = coordinateRoot[0];
  const firstRing = Array.isArray(maybeFirst) && Array.isArray(maybeFirst[0]) ? maybeFirst : coordinateRoot;
  if (!Array.isArray(firstRing)) return [];

  return firstRing
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const lng = Number(point[0]);
      const lat = Number(point[1]);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    })
    .filter((value): value is { lat: number; lng: number } => Boolean(value));
}

function centerFromPolygon(polygon: Array<{ lat: number; lng: number }>) {
  if (polygon.length === 0) return null;
  const total = polygon.reduce(
    (sum, point) => ({ lat: sum.lat + point.lat, lng: sum.lng + point.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: total.lat / polygon.length, lng: total.lng / polygon.length };
}

function zoneColor(index: number, color: unknown, status: string | null) {
  if (isHexColor(color)) return String(color);
  const normalized = normalizeSearch(status);
  if (normalized.includes("ngung") || normalized.includes("inactive")) return "#94a3b8";
  if (normalized.includes("bao tri") || normalized.includes("maintenance")) return "#ea580c";
  return zonePalette[index % zonePalette.length];
}

function buildLegacyAnimalGroups(animals: AnimalRow[], includeDeceased: boolean): AnimalGroup[] {
  const groups = new Map<string, AnimalGroup & { statusCounts: Map<string, number> }>();

  for (const animal of includeDeceased ? animals : animals.filter((item) => !isDeceasedStatus(item.status))) {
    const species = resolveSpecies(animal);
    const key = makeKey(species.label);
    const deceased = isDeceasedStatus(animal.status);
    const current =
      groups.get(key) ??
      ({
        key,
        label: species.label,
        icon: species.icon,
        color: species.color,
        count: 0,
        activeCount: 0,
        deceased: false,
        deceasedCount: 0,
        zones: [],
        statusLabel: "Chưa cập nhật",
        updatedAt: null,
        statusCounts: new Map<string, number>(),
      } satisfies AnimalGroup & { statusCounts: Map<string, number> });

    current.count += 1;
    if (isActiveStatus(animal.status)) current.activeCount += 1;
    if (deceased) current.deceasedCount += 1;
    current.deceased = current.count > 0 && current.deceasedCount >= current.count;

    const zoneName = cleanText(animal.zoneName) || "Chưa gắn khu vực";
    if (!current.zones.includes(zoneName)) current.zones.push(zoneName);

    const label = statusLabel(animal.status);
    current.statusCounts.set(label, (current.statusCounts.get(label) ?? 0) + 1);

    const updatedAt = animal.updatedAt || animal.createdAt;
    if (updatedAt && (!current.updatedAt || new Date(updatedAt).getTime() > new Date(current.updatedAt).getTime())) {
      current.updatedAt = updatedAt;
    }

    groups.set(key, current);
  }

  return Array.from(groups.values())
    .map(({ statusCounts, ...group }) => {
      const mainStatus = group.deceased ? "Đã tử vong" : Array.from(statusCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Chưa cập nhật";
      return { ...group, statusLabel: mainStatus };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));
}

function buildAnimalGroups(animals: AnimalRow[] = [], savedGroups: AnimalGroupRow[] = [], includeDeceasedGroups = false, includeDeceasedAnimals = includeDeceasedGroups): AnimalGroup[] {
  const explicitGroups: AnimalGroup[] = savedGroups.map((group) => {
    const species = resolveSpeciesFromText(group.species);
    const count = group.linkedCount || group.headCount;
    const deceased = count > 0 && (group.deceasedCount >= count || isDeceasedStatus(group.healthStatus));
    const visibleCount = includeDeceasedAnimals || (deceased && includeDeceasedGroups) ? count : Math.max(count - group.deceasedCount, 0);
    return {
      key: `nhom-${group.id}`,
      href: `/dashboard/vat-nuoi/${group.id}`,
      label: group.name,
      icon: species.icon,
      color: species.color,
      count: visibleCount,
      activeCount: deceased ? 0 : visibleCount,
      deceased,
      deceasedCount: group.deceasedCount,
      zones: [cleanText(group.zoneName) || "Chưa gắn khu vực"],
      statusLabel: deceased ? "Đã tử vong" : statusLabel(group.healthStatus),
      updatedAt: group.updatedAt || group.createdAt,
    };
  }).filter((group) => includeDeceasedGroups || !group.deceased);

  const groupedAnimalIds = new Set(savedGroups.map((group) => group.id));
  const legacyAnimals = animals.filter((animal) => !animal.groupId || !groupedAnimalIds.has(animal.groupId));
  return [...explicitGroups, ...buildLegacyAnimalGroups(legacyAnimals, includeDeceasedAnimals)].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));
}

async function loadLivestockData(farmId: string) {
  await ensureLivestockSchema();

  const [animalRs, groupRs, zoneRs, countRs, alertRs] = await Promise.all([
    db.query(
      `select v.id::text, v.ma_vat_nuoi, v.ma_qr, v.the_nhan_dien, v.loai_vat_nuoi, v.giong, v.trang_thai, v.mo_ta,
              v.nhom_vat_nuoi_id::text,
              v.khu_vuc_id::text, v.created_at, v.updated_at, k.ten_khu_vuc
       from du_lieu.vat_nuoi v
       left join du_lieu.nhom_vat_nuoi n on n.id = v.nhom_vat_nuoi_id
       left join du_lieu.khu_vuc k on k.id = v.khu_vuc_id and coalesce(lower(k.trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
       where v.trang_trai_id = $1
         and coalesce(lower(coalesce(v.loai_vat_nuoi, n.loai_vat_nuoi)), '') not in ('cá', 'ca', 'fish')
       order by v.updated_at desc nulls last, v.created_at desc nulls last, v.id desc`,
      [farmId]
    ),
    db.query(
      `select n.id::text, n.ten_nhom, n.loai_vat_nuoi, n.mo_ta, n.cach_tao, n.giong, n.so_luong,
              n.gioi_tinh, n.giai_doan_sinh_truong, n.trang_thai_suc_khoe,
              n.muc_dich_san_xuat, n.khu_vuc_id::text, n.ghi_chu_dan, n.nguon_goc,
              n.gia_tri_mua, n.tai_khoan_chi_phi, n.ngay_sinh, n.kieu_thu_thai,
              n.trong_luong_so_sinh_kg, n.ghi_chu_sinh, n.van_de_suc_khoe,
              n.ma_me, n.ma_bo, n.mau_long, n.mau_mat, n.kieu_tai, n.kieu_sung,
              n.tinh_trang_mieng, n.diem_the_trang, n.ghi_chu_dac_diem,
              n.nhan_dien_chinh, n.trang_thai_sinh_san, n.kha_nang_sinh_san,
              n.tang_trong_binh_quan_ngay, n.nang_luong_megajoule_ngay,
              n.trong_luong_muc_tieu_kg, n.ngay_can_muc_tieu,
              n.created_at, n.updated_at, k.ten_khu_vuc,
              (select count(*)::int from du_lieu.vat_nuoi v where v.nhom_vat_nuoi_id = n.id) as linked_count,
              (select count(*)::int
                 from du_lieu.vat_nuoi v
                where v.nhom_vat_nuoi_id = n.id
                  and (
                    coalesce(lower(v.trang_thai), '') in ('đã tử vong', 'da tu vong', 'deceased', 'dead')
                    or coalesce(v.metadata_json, '{}'::jsonb) ? 'lastDeathEventId'
                  )) as deceased_count
       from du_lieu.nhom_vat_nuoi n
       left join du_lieu.khu_vuc k on k.id = n.khu_vuc_id and coalesce(lower(k.trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
       where n.trang_trai_id = $1
         and coalesce(lower(n.loai_vat_nuoi), '') not in ('cá', 'ca', 'fish')
       order by n.updated_at desc nulls last, n.created_at desc nulls last, n.id desc`,
      [farmId]
    ),
    db.query(
      `select k.id::text, k.ten_khu_vuc, k.trang_thai, coalesce(k.dien_tich_ha, 0)::float8 as dien_tich_ha,
              k.hinh_hoc_geojson, k.mau_sac,
              (select count(*)::int
                from du_lieu.vat_nuoi v
                left join du_lieu.nhom_vat_nuoi n on n.id = v.nhom_vat_nuoi_id
               where v.khu_vuc_id = k.id
                  and coalesce(lower(coalesce(v.loai_vat_nuoi, n.loai_vat_nuoi)), '') not in ('cá', 'ca', 'fish')) as animal_count,
              (select d.so_luong from du_lieu.dem_dong_vat d where d.khu_vuc_id = k.id order by d.created_at desc limit 1) as latest_count,
              (select d.created_at from du_lieu.dem_dong_vat d where d.khu_vuc_id = k.id order by d.created_at desc limit 1) as latest_count_at
       from du_lieu.khu_vuc k
       where k.trang_trai_id = $1
         and coalesce(lower(k.trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
       order by animal_count desc, k.created_at desc nulls last, k.id desc`,
      [farmId]
    ),
    db.query(
      `select coalesce(sum(latest.so_luong), 0)::int as latest_total,
              count(latest.khu_vuc_id)::int as counted_zones,
              max(latest.created_at) as latest_counted_at,
              (select count(*)::int
               from du_lieu.dem_dong_vat d
               join du_lieu.khu_vuc k on k.id = d.khu_vuc_id
               where k.trang_trai_id = $1
                 and coalesce(lower(k.trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')) as records
       from (
         select distinct on (d.khu_vuc_id) d.khu_vuc_id, d.so_luong, d.created_at
         from du_lieu.dem_dong_vat d
         join du_lieu.khu_vuc k on k.id = d.khu_vuc_id
         where k.trang_trai_id = $1
           and coalesce(lower(k.trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
         order by d.khu_vuc_id, d.created_at desc
       ) latest`,
      [farmId]
    ),
    db.query(
      `select count(*)::int as total,
              count(*) filter (
                where coalesce(lower(trang_thai), '') not in ('da xu ly', 'đã xử lý', 'closed', 'done', 'resolved')
              )::int as open
       from du_lieu.canh_bao
       where khu_vuc_id in (
         select id from du_lieu.khu_vuc
         where trang_trai_id = $1
           and coalesce(lower(trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
       )`,
      [farmId]
    ),
  ]);

  const animals: AnimalRow[] = animalRs.rows.map((row) => ({
    id: String(row.id),
    code: cleanText(row.ma_vat_nuoi),
    qrCode: cleanText(row.ma_qr),
    identity: cleanText(row.the_nhan_dien),
    species: cleanText(row.loai_vat_nuoi),
    breed: cleanText(row.giong),
    status: cleanText(row.trang_thai),
    description: cleanText(row.mo_ta),
    groupId: cleanText(row.nhom_vat_nuoi_id),
    zoneId: cleanText(row.khu_vuc_id),
    zoneName: cleanText(row.ten_khu_vuc),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }));

  const savedGroups: AnimalGroupRow[] = groupRs.rows.map((row) => ({
    id: String(row.id),
    name: cleanText(row.ten_nhom) || "Nhóm vật nuôi chưa đặt tên",
    species: cleanText(row.loai_vat_nuoi) || "Chưa phân loại",
    description: cleanText(row.mo_ta),
    createFrom: cleanText(row.cach_tao),
    breed: cleanText(row.giong),
    headCount: Number(row.so_luong ?? 0),
    linkedCount: Number(row.linked_count ?? 0),
    deceasedCount: Number(row.deceased_count ?? 0),
    healthStatus: cleanText(row.trang_thai_suc_khoe),
    gender: cleanText(row.gioi_tinh),
    lifeStage: cleanText(row.giai_doan_sinh_truong),
    purpose: cleanText(row.muc_dich_san_xuat),
    locationId: cleanText(row.khu_vuc_id),
    zoneName: cleanText(row.ten_khu_vuc),
    herdNotes: cleanText(row.ghi_chu_dan),
    origin: cleanText(row.nguon_goc),
    price: cleanText(row.gia_tri_mua),
    expenseAccount: cleanText(row.tai_khoan_chi_phi),
    birthDate: dateInputValue(row.ngay_sinh),
    conceptionType: cleanText(row.kieu_thu_thai),
    averageBirthWeight: cleanText(row.trong_luong_so_sinh_kg),
    birthNotes: cleanText(row.ghi_chu_sinh),
    healthIssues: cleanText(row.van_de_suc_khoe),
    maternityId: cleanText(row.ma_me),
    paternityId: cleanText(row.ma_bo),
    colouring: cleanText(row.mau_long),
    eyeColor: cleanText(row.mau_mat),
    earType: cleanText(row.kieu_tai),
    hornType: cleanText(row.kieu_sung),
    mouth: cleanText(row.tinh_trang_mieng),
    bodyConditionScore: cleanText(row.diem_the_trang),
    traitNotes: cleanText(row.ghi_chu_dac_diem),
    primaryIdentification: cleanText(row.nhan_dien_chinh),
    reproductiveState: cleanText(row.trang_thai_sinh_san),
    reproductiveAvailability: cleanText(row.kha_nang_sinh_san),
    lifetimeAdg: cleanText(row.tang_trong_binh_quan_ngay),
    lifetimeMjDay: cleanText(row.nang_luong_megajoule_ngay),
    targetLiveWeight: cleanText(row.trong_luong_muc_tieu_kg),
    targetWeightDate: dateInputValue(row.ngay_can_muc_tieu),
    updatedAt: row.updated_at ?? null,
    createdAt: row.created_at ?? null,
  }));

  const zones: FarmZone[] = zoneRs.rows.map((row, index) => {
    const polygon = normalizePolygon(row.hinh_hoc_geojson);
    return {
      id: String(row.id),
      name: cleanText(row.ten_khu_vuc) || "Khu vực chưa đặt tên",
      status: cleanText(row.trang_thai),
      areaHa: Number(row.dien_tich_ha ?? 0),
      polygon,
      center: centerFromPolygon(polygon),
      color: zoneColor(index, row.mau_sac, cleanText(row.trang_thai)),
      animalCount: Number(row.animal_count ?? 0),
      latestCount: row.latest_count == null ? null : Number(row.latest_count),
      latestCountAt: row.latest_count_at ?? null,
    };
  });

  const countSummary: CountSummary = {
    latestTotal: Number(countRs.rows[0]?.latest_total ?? 0),
    countedZones: Number(countRs.rows[0]?.counted_zones ?? 0),
    records: Number(countRs.rows[0]?.records ?? 0),
    latestCountedAt: countRs.rows[0]?.latest_counted_at ?? null,
  };

  const alertSummary: AlertSummary = {
    total: Number(alertRs.rows[0]?.total ?? 0),
    open: Number(alertRs.rows[0]?.open ?? 0),
  };

  return { animals, savedGroups, zones, countSummary, alertSummary };
}

function AnimalIcon({ type }: { type: SpeciesIcon }) {
  switch (type) {
    case "cow":
    case "buffalo":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M11 28c0-6 5-10 11-10h20c6 0 11 4 11 10v8c0 7-6 12-13 12H24c-7 0-13-5-13-12v-8Z" fill="currentColor" opacity="0.16" />
          <path d="M17 23 9 17m38 6 8-6M24 18l-3-7m19 7 3-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="25" cy="32" r="2.4" fill="currentColor" />
          <circle cx="39" cy="32" r="2.4" fill="currentColor" />
          <path d="M27 39c3 2 7 2 10 0M21 47v7m22-7v7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "goat":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M18 29c3-8 9-12 17-12s13 4 16 12l-3 6c-2 4-6 7-11 7h-5c-5 0-9-3-11-7l-3-6Z" fill="currentColor" opacity="0.16" />
          <path d="m22 22-6-8m31 8 6-8M28 39c3 2 9 2 12 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="28" cy="31" r="2.2" fill="currentColor" />
          <circle cx="40" cy="31" r="2.2" fill="currentColor" />
          <path d="M22 45v8m22-8v8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "sheep":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M18 29a9 9 0 0 1 9-9h10a9 9 0 0 1 9 9v7a9 9 0 0 1-9 9H27a9 9 0 0 1-9-9v-7Z" fill="currentColor" opacity="0.16" />
          <path d="M20 25c-3-4-3-8 1-11m23 11c3-4 3-8-1-11M27 38c3 2 7 2 10 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="26" cy="31" r="2.3" fill="currentColor" />
          <circle cx="38" cy="31" r="2.3" fill="currentColor" />
          <path d="M24 46v8m16-8v8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "pig":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M14 31c0-7 6-13 13-13h10c7 0 13 6 13 13v4c0 7-6 13-13 13H27c-7 0-13-6-13-13v-4Z" fill="currentColor" opacity="0.16" />
          <path d="m22 22-5-7m25 7 5-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="32" cy="38" rx="6" ry="4" fill="currentColor" opacity="0.28" />
          <circle cx="27" cy="32" r="2.2" fill="currentColor" />
          <circle cx="37" cy="32" r="2.2" fill="currentColor" />
          <path d="M23 47v7m18-7v7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "chicken":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M22 30c0-8 6-14 14-14 7 0 13 5 13 12 0 4-2 8-5 10l-4 3H29c-4 0-7-3-7-7v-4Z" fill="currentColor" opacity="0.16" />
          <path d="m30 16 3-6 3 6m4 1 5-4m-19 4-5-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="m42 30 8 3-8 4Z" fill="currentColor" />
          <circle cx="35" cy="29" r="2.1" fill="currentColor" />
          <path d="M28 45v8m10-8v8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "duck":
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M18 35c0-6 5-11 11-11h7c7 0 13 6 13 13v2c0 7-6 13-13 13h-7c-6 0-11-5-11-11v-6Z" fill="currentColor" opacity="0.16" />
          <path d="M36 25c3-4 7-6 11-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M44 34h9l-4 5h-7Z" fill="currentColor" />
          <circle cx="31" cy="31" r="2.2" fill="currentColor" />
          <path d="M24 47v7m12-7v7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M14 34c0-8 6-14 14-14h8c8 0 14 6 14 14s-6 14-14 14h-8c-8 0-14-6-14-14Z" fill="currentColor" opacity="0.16" />
          <circle cx="26" cy="32" r="2.3" fill="currentColor" />
          <circle cx="38" cy="32" r="2.3" fill="currentColor" />
          <path d="M28 39c2 1 6 1 8 0M23 48v6m18-6v6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
  }
}

function SmallIcon({ name }: { name: "list" | "map" | "alert" | "count" | "stable" }) {
  switch (name) {
    case "map":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" /><path d="M9 4v14M15 6v14" /></svg>;
    case "alert":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 3 20h18L12 4Z" /><path d="M12 9v5M12 17h.01" /></svg>;
    case "count":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M7 6v12m10-12v12M5 18h14" /><path d="M9 10h6M9 14h4" /></svg>;
    case "stable":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-7h6v7" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" /></svg>;
  }
}

export default async function VatNuoiPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/vat-nuoi");

  const data = await getDashboardOverview(ownerId);
  if (!data.farmId) redirect("/register/farm");
  if (searchValue(searchParams?.["hanh-dong"]) === "dieu-tri") redirect("/dashboard/vat-nuoi/dieu-tri");
  if (searchValue(searchParams?.["hanh-dong"]) === "ghi-nhan-su-kien") redirect("/dashboard/vat-nuoi/su-kien");
  const showDeceasedGroups = searchValue(searchParams?.["hien-nhom-tu-vong"]) === "1";
  const showDeceasedAnimals = searchValue(searchParams?.["hien-ca-the-tu-vong"]) === "1";
  const showSummary = searchValue(searchParams?.["hien-tom-tat"]) !== "0";
  const showGroupCards = searchValue(searchParams?.["hien-the-nhom"]) !== "0";
  const showGroupsTable = searchValue(searchParams?.["hien-bang-nhom"]) !== "0";
  const showMap = searchValue(searchParams?.["hien-ban-do"]) !== "0";

  const { animals, savedGroups, zones, countSummary, alertSummary } = await loadLivestockData(data.farmId);
  const includeDeceasedAnimals = showDeceasedGroups || showDeceasedAnimals;
  const visibleAnimals = includeDeceasedAnimals ? animals : animals.filter((animal) => !isDeceasedStatus(animal.status));
  const groups = buildAnimalGroups(animals, savedGroups, showDeceasedGroups, includeDeceasedAnimals);
  const deceasedGroupCount = buildAnimalGroups(animals, savedGroups, true).filter((group) => group.deceased).length;
  const activeAnimals = visibleAnimals.filter((animal) => isActiveStatus(animal.status)).length;
  const linkedAnimals = visibleAnimals.filter((animal) => animal.zoneId).length;
  const locationZones = zones.filter((zone) => zone.animalCount > 0 || Number(zone.latestCount ?? 0) > 0);
  const mapZones = (locationZones.length > 0 ? locationZones : zones).filter((zone) => zone.polygon.length >= 3);
  const mapObjects = locationZones
    .filter((zone) => zone.center)
    .map((zone) => ({
      id: `zone-${zone.id}`,
      label: `${zone.name}: ${formatNumber(zone.animalCount || zone.latestCount || 0)} con`,
      color: zone.color,
      kind: "vat_nuoi",
      geometry: { type: "Point" as const, coordinates: [zone.center!.lng, zone.center!.lat] as [number, number] },
    }));
  const recordedAnimalOptions = visibleAnimals.filter((animal) => !animal.groupId && !isDeceasedStatus(animal.status));
  const copyGroupOptions = savedGroups.filter((group) => !isDeceasedStatus(group.healthStatus));

  const statCards = [
    { label: "Tổng vật nuôi", value: formatNumber(visibleAnimals.length), icon: "stable" as const },
    { label: "Nhóm ghi nhận", value: formatNumber(groups.length), icon: "list" as const },
    { label: "Đang theo dõi", value: formatNumber(activeAnimals), icon: "stable" as const },
    { label: "Có khu vực", value: `${formatNumber(linkedAnimals)}/${formatNumber(animals.length)}`, icon: "map" as const },
    { label: "Số đếm mới nhất", value: formatNumber(countSummary.latestTotal), icon: "count" as const },
    { label: "Cảnh báo mở", value: formatNumber(alertSummary.open), icon: "alert" as const },
  ];

  return (
    <DashboardShell farmName={data.farmName} activePath="/dashboard/vat-nuoi">
      <div className={styles.page}>
        <section className={styles.topBar}>
          <div className={styles.titleBlock}>
            <div className={styles.titleIcon}><AnimalIcon type="cow" /></div>
            <div>
              <p className={styles.eyebrow}>Quản lý vật nuôi</p>
              <h1>Tổng quan vật nuôi</h1>
              <span>{data.farmName}</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <LivestockPageTools
              zones={zones.map((zone) => ({ id: zone.id, name: zone.name }))}
              recordedAnimals={recordedAnimalOptions}
              copyGroups={copyGroupOptions}
              canWrite={data.access.canWrite}
              showDeceasedGroups={showDeceasedGroups}
              showDeceasedAnimals={showDeceasedAnimals}
            />
          </div>
        </section>

        {showSummary && <section className={styles.statsGrid} aria-label="Chỉ số vật nuôi">
          {statCards.map((item) => (
            <article key={item.label} className={styles.statCard}>
              <span className={styles.statIcon}><SmallIcon name={item.icon} /></span>
              <div>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </div>
            </article>
          ))}
        </section>}

        {showGroupCards && <section className={styles.speciesSection}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Nhóm vật nuôi</p>
              <h2>{formatNumber(visibleAnimals.length)} hồ sơ vật nuôi · {formatNumber(groups.length)} nhóm</h2>
            </div>
            {deceasedGroupCount > 0 && <div className={styles.panelBadge}>{showDeceasedGroups ? `Đang hiện ${formatNumber(deceasedGroupCount)} nhóm tử vong` : `Đã ẩn ${formatNumber(deceasedGroupCount)} nhóm tử vong`}</div>}
          </div>

          {groups.length > 0 ? (
            <div className={styles.speciesGrid}>
              {groups.map((group) => (
                <Link key={group.key} href={group.href ?? "/dashboard/vat-nuoi"} className={`${styles.speciesCard} ${styles.speciesCardLink}`} style={accentStyle(group.color)}>
                  <div className={styles.speciesHead}>
                    <span className={styles.speciesIcon}><AnimalIcon type={group.icon} /></span>
                    <div>
                      <h3>{group.label}</h3>
                      <p><span className={`${styles.statusPill} ${group.deceased ? styles.deceasedPill : ""}`}>{group.statusLabel}</span></p>
                    </div>
                  </div>
                  <div className={styles.speciesCount}>{formatNumber(group.count)}</div>
                  <div className={styles.speciesMeta}>
                    <span>{formatNumber(group.activeCount)} đang theo dõi</span>
                    <span>{group.zones.length > 1 ? `${group.zones.length} khu vực` : group.zones[0]}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>Chưa có hồ sơ vật nuôi trong cơ sở dữ liệu của trang trại này.</div>
          )}
        </section>}

        {showGroupsTable && <section className={styles.tablePanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Bảng quản lý</p>
              <h2>Nhóm vật nuôi đang ghi nhận</h2>
            </div>
          </div>

          {groups.length > 0 ? (
            <div className={styles.tableScroll}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Nhóm</th>
                    <th>Số lượng</th>
                    <th>Đang theo dõi</th>
                    <th>Khu vực</th>
                    <th>Trạng thái</th>
                    <th>Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.key}>
                      <td>
                        <Link href={group.href ?? "/dashboard/vat-nuoi"} className={styles.tableName} style={accentStyle(group.color)}>
                          <span className={styles.tableDot} />
                          {group.label}
                        </Link>
                      </td>
                      <td>{formatNumber(group.count)}</td>
                      <td>{formatNumber(group.activeCount)}</td>
                      <td>{group.zones.join(", ")}</td>
                      <td><span className={`${styles.statusPill} ${group.deceased ? styles.deceasedPill : ""}`}>{group.statusLabel}</span></td>
                      <td>{formatDate(group.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>Chưa có nhóm vật nuôi để hiển thị.</div>
          )}
        </section>}

        {showMap && <section className={styles.mapPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Vị trí vật nuôi</p>
              <h2>Bản đồ khu vực chăn nuôi</h2>
            </div>
            <div className={styles.panelBadge}>{formatNumber(locationZones.length)} khu vực có dữ liệu vật nuôi hoặc bản ghi đếm</div>
          </div>

          <div className={styles.mapShell}>
            <MapViewSwitcher
              lat={data.latitude}
              lng={data.longitude}
              zoom={16}
              title="Bản đồ khu vực vật nuôi"
              initialMode="satellite"
              frameClassName={styles.mapFrame}
              hideModeTabs={false}
              hideEcoNote
              zones={mapZones.map((zone) => ({
                id: zone.id,
                label: `${zone.name} (${formatNumber(zone.animalCount || zone.latestCount || 0)})`,
                color: zone.color,
                kind: zone.status ?? undefined,
                polygon: zone.polygon,
              }))}
              objects={mapObjects}
              fitToPolygon={mapZones.length > 0 || mapObjects.length > 0}
            />
          </div>

          <div className={styles.mapNote}>
            {locationZones.length > 0
              ? "Bản đồ ưu tiên các khu vực có vật nuôi được gắn khu vực hoặc có bản ghi đếm mới nhất."
              : "Chưa có vị trí vật nuôi được gắn trực tiếp; bản đồ đang hiển thị các khu vực hiện có của trang trại."}
          </div>
        </section>}
      </div>
    </DashboardShell>
  );
}
