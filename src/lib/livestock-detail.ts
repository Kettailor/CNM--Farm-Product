import { db } from "@/lib/db";
import { getAccessibleFarmId } from "@/lib/farm-access";
import { ensureLivestockEventSchema } from "@/lib/livestock-event-schema";
import { ensureLivestockSchema } from "@/lib/livestock-schema";
import { ensureLivestockTreatmentSchema } from "@/lib/livestock-treatment-schema";

export type LivestockDetail = {
  farm: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    locationName: string | null;
  };
  group: {
    id: string;
    code: string;
    name: string;
    species: string;
    description: string | null;
    createFrom: string | null;
    breed: string | null;
    headCount: number;
    linkedCount: number;
    gender: string | null;
    lifeStage: string | null;
    healthStatus: string | null;
    purpose: string | null;
    herdNotes: string | null;
    origin: string | null;
    price: number | null;
    expenseAccount: string | null;
    birthDate: string | null;
    conceptionType: string | null;
    averageBirthWeight: number | null;
    birthNotes: string | null;
    healthIssues: string | null;
    maternityId: string | null;
    paternityId: string | null;
    colouring: string | null;
    eyeColor: string | null;
    earType: string | null;
    hornType: string | null;
    mouth: string | null;
    bodyConditionScore: number | null;
    traitNotes: string | null;
    primaryIdentification: string | null;
    reproductiveState: string | null;
    reproductiveAvailability: string | null;
    lifetimeAdg: number | null;
    lifetimeMjDay: number | null;
    targetLiveWeight: number | null;
    targetWeightDate: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  zone: {
    id: string;
    name: string;
    status: string | null;
    areaHa: number;
    color: string;
    polygon: Array<{ lat: number; lng: number }>;
    center: { lat: number; lng: number } | null;
  } | null;
  animals: Array<{
    id: string;
    code: string | null;
    qrCode: string | null;
    identity: string | null;
    status: string | null;
    description: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  events: Array<{
    id: string;
    code: string | null;
    type: string | null;
    title: string | null;
    eventDate: string | null;
    animalCount: number;
    note: string | null;
    createdAt: string | null;
  }>;
  treatments: Array<{
    id: string;
    code: string | null;
    type: string | null;
    name: string | null;
    treatmentDate: string | null;
    treatedCount: number;
    dosage: number | null;
    dosageUnit: string | null;
    method: string | null;
    withdrawalEndDate: string | null;
    nextDueDate: string | null;
    status: string | null;
    note: string | null;
    createdAt: string | null;
  }>;
};

export type LivestockAnimalDetail = {
  farm: LivestockDetail["farm"];
  group: Pick<LivestockDetail["group"], "id" | "code" | "name" | "species" | "breed" | "healthStatus" | "purpose">;
  zone: LivestockDetail["zone"];
  animal: {
    id: string;
    code: string | null;
    qrCode: string | null;
    identity: string | null;
    species: string | null;
    breed: string | null;
    gender: string | null;
    lifeStage: string | null;
    birthDate: string | null;
    origin: string | null;
    maternityId: string | null;
    paternityId: string | null;
    colouring: string | null;
    reproductiveState: string | null;
    status: string | null;
    description: string | null;
    metadata: Record<string, unknown>;
    createdAt: string | null;
    updatedAt: string | null;
  };
  events: Array<{
    id: string;
    code: string | null;
    type: string | null;
    title: string | null;
    eventDate: string | null;
    numericValue: number | null;
    unit: string | null;
    note: string | null;
    createdAt: string | null;
  }>;
  treatments: Array<{
    id: string;
    code: string | null;
    type: string | null;
    name: string | null;
    treatmentDate: string | null;
    dosage: number | null;
    dosageUnit: string | null;
    method: string | null;
    status: string | null;
    note: string | null;
    createdAt: string | null;
  }>;
};

const DEFAULT_COORD = { latitude: 10.762622, longitude: 106.660172 };

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function asIsoDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
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
  const total = polygon.reduce((sum, point) => ({ lat: sum.lat + point.lat, lng: sum.lng + point.lng }), { lat: 0, lng: 0 });
  return { lat: total.lat / polygon.length, lng: total.lng / polygon.length };
}

function isHexColor(value: unknown) {
  return /^#[0-9a-f]{6}$/i.test(String(value ?? "").trim());
}

export async function loadLivestockGroupDetail(ownerId: string, groupId: string): Promise<LivestockDetail | null> {
  await ensureLivestockSchema();
  await ensureLivestockEventSchema();
  await ensureLivestockTreatmentSchema();
  const farmId = await getAccessibleFarmId(ownerId, "read");
  if (!farmId) return null;

  const groupRs = await db.query(
    `select n.id::text, n.trang_trai_id::text, n.khu_vuc_id::text, n.ma_nhom, n.ten_nhom,
            n.loai_vat_nuoi, n.mo_ta, n.cach_tao, n.giong, n.so_luong, n.gioi_tinh,
            n.giai_doan_sinh_truong, n.trang_thai_suc_khoe, n.muc_dich_san_xuat,
            n.ghi_chu_dan, n.nguon_goc, n.gia_tri_mua, n.tai_khoan_chi_phi,
            n.ngay_sinh, n.kieu_thu_thai, n.trong_luong_so_sinh_kg, n.ghi_chu_sinh,
            n.van_de_suc_khoe, n.ma_me, n.ma_bo, n.mau_long, n.mau_mat, n.kieu_tai,
            n.kieu_sung, n.tinh_trang_mieng, n.diem_the_trang, n.ghi_chu_dac_diem,
            n.nhan_dien_chinh, n.trang_thai_sinh_san, n.kha_nang_sinh_san,
            n.tang_trong_binh_quan_ngay, n.nang_luong_megajoule_ngay,
            n.trong_luong_muc_tieu_kg, n.ngay_can_muc_tieu, n.created_at, n.updated_at,
            t.ten_trang_trai, vt.vi_do, vt.kinh_do, vt.ten_dia_diem,
            k.ten_khu_vuc, k.trang_thai as khu_vuc_trang_thai, k.dien_tich_ha, k.hinh_hoc_geojson, k.mau_sac,
            (select count(*)::int from du_lieu.vat_nuoi v where v.nhom_vat_nuoi_id = n.id) as linked_count
     from du_lieu.nhom_vat_nuoi n
     join du_lieu.trang_trai t on t.id = n.trang_trai_id
     left join du_lieu.vi_tri_trang_trai vt on vt.trang_trai_id = t.id
     left join du_lieu.khu_vuc k on k.id = n.khu_vuc_id and coalesce(lower(k.trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
     where n.id::text = $1 and n.trang_trai_id::text = $2
       and coalesce(lower(n.loai_vat_nuoi), '') not in ('cá', 'ca', 'fish')
     limit 1`,
    [groupId, farmId]
  );

  const row = groupRs.rows[0];
  if (!row) return null;

  const [animalRs, eventRs, treatmentRs] = await Promise.all([
    db.query(
      `select id::text, ma_vat_nuoi, ma_qr, the_nhan_dien, trang_thai, mo_ta, created_at, updated_at
       from du_lieu.vat_nuoi
       where nhom_vat_nuoi_id::text = $1
       order by ma_vat_nuoi asc nulls last, created_at asc nulls last, id asc`,
      [groupId]
    ),
    db.query(
      `select id::text, ma_su_kien, loai_su_kien, tieu_de, ngay_su_kien, so_luong_vat_nuoi, ghi_chu, created_at
       from du_lieu.su_kien_vat_nuoi
       where nhom_vat_nuoi_id::text = $1
       order by ngay_su_kien desc nulls last, created_at desc
       limit 12`,
      [groupId]
    ),
    db.query(
      `select id::text, ma_dieu_tri, loai_dieu_tri, ten_dieu_tri, ngay_dieu_tri,
              so_luong_vat_nuoi, lieu_luong_moi_con, don_vi_lieu_luong, phuong_phap,
              ngay_ket_thuc_cach_ly, ngay_nhac_lai, trang_thai, ghi_chu, created_at
       from du_lieu.dieu_tri_vat_nuoi
       where nhom_vat_nuoi_id::text = $1
       order by ngay_dieu_tri desc nulls last, created_at desc
       limit 12`,
      [groupId]
    ),
  ]);

  const polygon = normalizePolygon(row.hinh_hoc_geojson);
  const zoneName = cleanText(row.ten_khu_vuc);

  return {
    farm: {
      id: String(row.trang_trai_id),
      name: cleanText(row.ten_trang_trai) || "KetKat-EcoFarm",
      latitude: Number(row.vi_do ?? DEFAULT_COORD.latitude),
      longitude: Number(row.kinh_do ?? DEFAULT_COORD.longitude),
      locationName: cleanText(row.ten_dia_diem),
    },
    group: {
      id: String(row.id),
      code: cleanText(row.ma_nhom) || String(row.id),
      name: cleanText(row.ten_nhom) || "Nhóm vật nuôi",
      species: cleanText(row.loai_vat_nuoi) || "Vật nuôi",
      description: cleanText(row.mo_ta),
      createFrom: cleanText(row.cach_tao),
      breed: cleanText(row.giong),
      headCount: Number(row.so_luong ?? 0),
      linkedCount: Number(row.linked_count ?? 0),
      gender: cleanText(row.gioi_tinh),
      lifeStage: cleanText(row.giai_doan_sinh_truong),
      healthStatus: cleanText(row.trang_thai_suc_khoe),
      purpose: cleanText(row.muc_dich_san_xuat),
      herdNotes: cleanText(row.ghi_chu_dan),
      origin: cleanText(row.nguon_goc),
      price: row.gia_tri_mua == null ? null : Number(row.gia_tri_mua),
      expenseAccount: cleanText(row.tai_khoan_chi_phi),
      birthDate: asIsoDate(row.ngay_sinh),
      conceptionType: cleanText(row.kieu_thu_thai),
      averageBirthWeight: row.trong_luong_so_sinh_kg == null ? null : Number(row.trong_luong_so_sinh_kg),
      birthNotes: cleanText(row.ghi_chu_sinh),
      healthIssues: cleanText(row.van_de_suc_khoe),
      maternityId: cleanText(row.ma_me),
      paternityId: cleanText(row.ma_bo),
      colouring: cleanText(row.mau_long),
      eyeColor: cleanText(row.mau_mat),
      earType: cleanText(row.kieu_tai),
      hornType: cleanText(row.kieu_sung),
      mouth: cleanText(row.tinh_trang_mieng),
      bodyConditionScore: row.diem_the_trang == null ? null : Number(row.diem_the_trang),
      traitNotes: cleanText(row.ghi_chu_dac_diem),
      primaryIdentification: cleanText(row.nhan_dien_chinh) || "Mã QR cá thể",
      reproductiveState: cleanText(row.trang_thai_sinh_san),
      reproductiveAvailability: cleanText(row.kha_nang_sinh_san),
      lifetimeAdg: row.tang_trong_binh_quan_ngay == null ? null : Number(row.tang_trong_binh_quan_ngay),
      lifetimeMjDay: row.nang_luong_megajoule_ngay == null ? null : Number(row.nang_luong_megajoule_ngay),
      targetLiveWeight: row.trong_luong_muc_tieu_kg == null ? null : Number(row.trong_luong_muc_tieu_kg),
      targetWeightDate: asIsoDate(row.ngay_can_muc_tieu),
      createdAt: asIsoDate(row.created_at),
      updatedAt: asIsoDate(row.updated_at),
    },
    zone: zoneName
      ? {
          id: String(row.khu_vuc_id),
          name: zoneName,
          status: cleanText(row.khu_vuc_trang_thai),
          areaHa: Number(row.dien_tich_ha ?? 0),
          color: isHexColor(row.mau_sac) ? String(row.mau_sac) : "#2f855a",
          polygon,
          center: centerFromPolygon(polygon),
        }
      : null,
    animals: animalRs.rows.map((animal) => ({
      id: String(animal.id),
      code: cleanText(animal.ma_vat_nuoi),
      qrCode: cleanText(animal.ma_qr),
      identity: cleanText(animal.the_nhan_dien),
      status: cleanText(animal.trang_thai),
      description: cleanText(animal.mo_ta),
      createdAt: asIsoDate(animal.created_at),
      updatedAt: asIsoDate(animal.updated_at),
    })),
    events: eventRs.rows.map((event) => ({
      id: String(event.id),
      code: cleanText(event.ma_su_kien),
      type: cleanText(event.loai_su_kien),
      title: cleanText(event.tieu_de),
      eventDate: asIsoDate(event.ngay_su_kien),
      animalCount: Number(event.so_luong_vat_nuoi ?? 0),
      note: cleanText(event.ghi_chu),
      createdAt: asIsoDate(event.created_at),
    })),
    treatments: treatmentRs.rows.map((treatment) => ({
      id: String(treatment.id),
      code: cleanText(treatment.ma_dieu_tri),
      type: cleanText(treatment.loai_dieu_tri),
      name: cleanText(treatment.ten_dieu_tri),
      treatmentDate: asIsoDate(treatment.ngay_dieu_tri),
      treatedCount: Number(treatment.so_luong_vat_nuoi ?? 0),
      dosage: treatment.lieu_luong_moi_con == null ? null : Number(treatment.lieu_luong_moi_con),
      dosageUnit: cleanText(treatment.don_vi_lieu_luong),
      method: cleanText(treatment.phuong_phap),
      withdrawalEndDate: asIsoDate(treatment.ngay_ket_thuc_cach_ly),
      nextDueDate: asIsoDate(treatment.ngay_nhac_lai),
      status: cleanText(treatment.trang_thai),
      note: cleanText(treatment.ghi_chu),
      createdAt: asIsoDate(treatment.created_at),
    })),
  };
}

export async function loadLivestockAnimalDetail(ownerId: string, groupId: string, animalId: string): Promise<LivestockAnimalDetail | null> {
  await ensureLivestockSchema();
  await ensureLivestockEventSchema();
  await ensureLivestockTreatmentSchema();
  const farmId = await getAccessibleFarmId(ownerId, "read");
  if (!farmId) return null;

  const animalRs = await db.query(
    `select v.id::text, v.trang_trai_id::text, v.khu_vuc_id::text, v.nhom_vat_nuoi_id::text,
            v.ma_vat_nuoi, v.ma_qr, v.the_nhan_dien, v.loai_vat_nuoi, v.giong, v.gioi_tinh,
            v.giai_doan_sinh_truong, v.ngay_sinh, v.nguon_goc, v.ma_me, v.ma_bo, v.mau_long,
            v.trang_thai_sinh_san, v.trang_thai, v.mo_ta, v.metadata_json, v.created_at, v.updated_at,
            n.ma_nhom, n.ten_nhom, n.loai_vat_nuoi as nhom_loai_vat_nuoi, n.giong as nhom_giong,
            n.trang_thai_suc_khoe, n.muc_dich_san_xuat,
            t.ten_trang_trai, vt.vi_do, vt.kinh_do, vt.ten_dia_diem,
            k.ten_khu_vuc, k.trang_thai as khu_vuc_trang_thai, k.dien_tich_ha, k.hinh_hoc_geojson, k.mau_sac
     from du_lieu.vat_nuoi v
     join du_lieu.nhom_vat_nuoi n on n.id = v.nhom_vat_nuoi_id
     join du_lieu.trang_trai t on t.id = v.trang_trai_id
     left join du_lieu.vi_tri_trang_trai vt on vt.trang_trai_id = t.id
     left join du_lieu.khu_vuc k on k.id = coalesce(v.khu_vuc_id, n.khu_vuc_id) and coalesce(lower(k.trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
     where v.id::text = $1 and n.id::text = $2 and v.trang_trai_id::text = $3
       and coalesce(lower(coalesce(v.loai_vat_nuoi, n.loai_vat_nuoi)), '') not in ('cá', 'ca', 'fish')
     limit 1`,
    [animalId, groupId, farmId]
  );

  const row = animalRs.rows[0];
  if (!row) return null;

  const [eventRs, treatmentRs] = await Promise.all([
    db.query(
      `select s.id::text, s.ma_su_kien, s.loai_su_kien, s.tieu_de, s.ngay_su_kien,
              coalesce(sc.gia_tri_so, s.gia_tri_so) as gia_tri_so,
              coalesce(sc.don_vi, s.don_vi) as don_vi,
              coalesce(sc.ghi_chu, s.ghi_chu) as ghi_chu,
              s.created_at
       from du_lieu.su_kien_vat_nuoi s
       join du_lieu.su_kien_vat_nuoi_ca_the sc on sc.su_kien_id = s.id
       where sc.vat_nuoi_id::text = $1 and s.trang_trai_id::text = $2
       order by s.ngay_su_kien desc nulls last, s.created_at desc
       limit 12`,
      [animalId, row.trang_trai_id]
    ),
    db.query(
      `select d.id::text, d.ma_dieu_tri, d.loai_dieu_tri, d.ten_dieu_tri, d.ngay_dieu_tri,
              d.lieu_luong_moi_con, d.don_vi_lieu_luong, d.phuong_phap, d.trang_thai, d.ghi_chu, d.created_at
       from du_lieu.dieu_tri_vat_nuoi d
       join du_lieu.dieu_tri_vat_nuoi_ca_the dc on dc.dieu_tri_id = d.id
       where dc.vat_nuoi_id::text = $1 and d.trang_trai_id::text = $2
       order by d.ngay_dieu_tri desc nulls last, d.created_at desc
       limit 12`,
      [animalId, row.trang_trai_id]
    ),
  ]);

  const polygon = normalizePolygon(row.hinh_hoc_geojson);
  const zoneName = cleanText(row.ten_khu_vuc);

  return {
    farm: {
      id: String(row.trang_trai_id),
      name: cleanText(row.ten_trang_trai) || "KetKat-EcoFarm",
      latitude: Number(row.vi_do ?? DEFAULT_COORD.latitude),
      longitude: Number(row.kinh_do ?? DEFAULT_COORD.longitude),
      locationName: cleanText(row.ten_dia_diem),
    },
    group: {
      id: String(row.nhom_vat_nuoi_id),
      code: cleanText(row.ma_nhom) || String(row.nhom_vat_nuoi_id),
      name: cleanText(row.ten_nhom) || "Nhóm vật nuôi",
      species: cleanText(row.nhom_loai_vat_nuoi) || cleanText(row.loai_vat_nuoi) || "Vật nuôi",
      breed: cleanText(row.nhom_giong) || cleanText(row.giong),
      healthStatus: cleanText(row.trang_thai_suc_khoe),
      purpose: cleanText(row.muc_dich_san_xuat),
    },
    zone: zoneName
      ? {
          id: String(row.khu_vuc_id),
          name: zoneName,
          status: cleanText(row.khu_vuc_trang_thai),
          areaHa: Number(row.dien_tich_ha ?? 0),
          color: isHexColor(row.mau_sac) ? String(row.mau_sac) : "#2f855a",
          polygon,
          center: centerFromPolygon(polygon),
        }
      : null,
    animal: {
      id: String(row.id),
      code: cleanText(row.ma_vat_nuoi),
      qrCode: cleanText(row.ma_qr),
      identity: cleanText(row.the_nhan_dien),
      species: cleanText(row.loai_vat_nuoi) || cleanText(row.nhom_loai_vat_nuoi),
      breed: cleanText(row.giong) || cleanText(row.nhom_giong),
      gender: cleanText(row.gioi_tinh),
      lifeStage: cleanText(row.giai_doan_sinh_truong),
      birthDate: asIsoDate(row.ngay_sinh),
      origin: cleanText(row.nguon_goc),
      maternityId: cleanText(row.ma_me),
      paternityId: cleanText(row.ma_bo),
      colouring: cleanText(row.mau_long),
      reproductiveState: cleanText(row.trang_thai_sinh_san),
      status: cleanText(row.trang_thai),
      description: cleanText(row.mo_ta),
      metadata: row.metadata_json && typeof row.metadata_json === "object" ? row.metadata_json : {},
      createdAt: asIsoDate(row.created_at),
      updatedAt: asIsoDate(row.updated_at),
    },
    events: eventRs.rows.map((event) => ({
      id: String(event.id),
      code: cleanText(event.ma_su_kien),
      type: cleanText(event.loai_su_kien),
      title: cleanText(event.tieu_de),
      eventDate: asIsoDate(event.ngay_su_kien),
      numericValue: event.gia_tri_so == null ? null : Number(event.gia_tri_so),
      unit: cleanText(event.don_vi),
      note: cleanText(event.ghi_chu),
      createdAt: asIsoDate(event.created_at),
    })),
    treatments: treatmentRs.rows.map((treatment) => ({
      id: String(treatment.id),
      code: cleanText(treatment.ma_dieu_tri),
      type: cleanText(treatment.loai_dieu_tri),
      name: cleanText(treatment.ten_dieu_tri),
      treatmentDate: asIsoDate(treatment.ngay_dieu_tri),
      dosage: treatment.lieu_luong_moi_con == null ? null : Number(treatment.lieu_luong_moi_con),
      dosageUnit: cleanText(treatment.don_vi_lieu_luong),
      method: cleanText(treatment.phuong_phap),
      status: cleanText(treatment.trang_thai),
      note: cleanText(treatment.ghi_chu),
      createdAt: asIsoDate(treatment.created_at),
    })),
  };
}
