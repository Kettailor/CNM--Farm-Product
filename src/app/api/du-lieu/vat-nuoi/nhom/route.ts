import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { layOwnerIdTuRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureLivestockSchema } from "@/lib/livestock-schema";

export const dynamic = "force-dynamic";

type TagPayload = {
  type?: unknown;
  label?: unknown;
  color?: unknown;
  location?: unknown;
};

type GroupPayload = {
  species?: unknown;
  groupName?: unknown;
  description?: unknown;
  createFrom?: unknown;
  breed?: unknown;
  headCount?: unknown;
  gender?: unknown;
  lifeStage?: unknown;
  healthStatus?: unknown;
  purpose?: unknown;
  locationId?: unknown;
  herdNotes?: unknown;
  origin?: unknown;
  price?: unknown;
  expenseAccount?: unknown;
  birthDate?: unknown;
  conceptionType?: unknown;
  averageBirthWeight?: unknown;
  birthNotes?: unknown;
  healthIssues?: unknown;
  maternityId?: unknown;
  paternityId?: unknown;
  colouring?: unknown;
  eyeColor?: unknown;
  earType?: unknown;
  hornType?: unknown;
  mouth?: unknown;
  bodyConditionScore?: unknown;
  traitNotes?: unknown;
  primaryIdentification?: unknown;
  tags?: TagPayload[];
  reproductiveState?: unknown;
  reproductiveAvailability?: unknown;
  lifetimeAdg?: unknown;
  lifetimeMjDay?: unknown;
  targetLiveWeight?: unknown;
  targetWeightDate?: unknown;
};

const SPECIES = new Set(["Bò", "Trâu", "Dê", "Cừu", "Heo", "Gà", "Vịt", "Cá"]);

function cleanString(value: unknown, max = 240) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function parsePositiveInt(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[^\d]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

function parseNumber(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOrNull(value: unknown) {
  const raw = cleanString(value, 20);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function makeGroupCode(species: string) {
  const prefix =
    {
      Bò: "BO",
      Trâu: "TRAU",
      Dê: "DE",
      Cừu: "CUU",
      Heo: "HEO",
      Gà: "GA",
      Vịt: "VIT",
      Cá: "CA",
    }[species] ?? "VN";
  return `NVN-${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function normalizeTags(tags: TagPayload[] | undefined) {
  if (!Array.isArray(tags)) return [];
  return tags
    .slice(0, 12)
    .map((tag) => ({
      type: cleanString(tag?.type, 80),
      label: cleanString(tag?.label, 120),
      color: cleanString(tag?.color, 60),
      location: cleanString(tag?.location, 80),
    }))
    .filter((tag) => tag.type || tag.label || tag.color || tag.location);
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuRequest(request);
    if (!ownerId) {
      return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
    }

    await ensureLivestockSchema();

    const farmRs = await db.query(
      `select id
       from du_lieu.trang_trai
       where chu_so_huu_id = $1
       order by created_at desc
       limit 1`,
      [ownerId]
    );
    const farmId = farmRs.rows[0]?.id as string | undefined;
    if (!farmId) {
      return NextResponse.json({ message: "Chưa có trang trại để thêm nhóm vật nuôi." }, { status: 404 });
    }

    const body = (await request.json()) as GroupPayload;
    const species = cleanString(body.species, 40);
    const groupName = cleanString(body.groupName, 160);
    const breed = cleanString(body.breed, 120);
    const headCount = parsePositiveInt(body.headCount);

    if (!species || !SPECIES.has(species)) {
      return NextResponse.json({ message: "Vui lòng chọn loài vật nuôi hợp lệ." }, { status: 400 });
    }
    if (!groupName) {
      return NextResponse.json({ message: "Vui lòng nhập tên nhóm vật nuôi." }, { status: 400 });
    }
    if (!breed) {
      return NextResponse.json({ message: "Vui lòng chọn giống vật nuôi." }, { status: 400 });
    }
    if (!headCount || headCount < 1 || headCount > 1000) {
      return NextResponse.json({ message: "Số lượng đầu con phải nằm trong khoảng 1 đến 1000." }, { status: 400 });
    }

    const locationId = cleanString(body.locationId, 80);
    if (locationId) {
      const zoneRs = await db.query(
        `select id from du_lieu.khu_vuc where id::text = $1 and trang_trai_id = $2 limit 1`,
        [locationId, farmId]
      );
      if (zoneRs.rowCount === 0) {
        return NextResponse.json({ message: "Khu vực được chọn không thuộc trang trại hiện tại." }, { status: 400 });
      }
    }

    const tags = normalizeTags(body.tags);
    const groupId = randomUUID();
    const groupCode = makeGroupCode(species);
    const healthStatus = cleanString(body.healthStatus, 80) ?? "Đang hoạt động";
    const animalStatus = healthStatus === "Đang theo dõi" ? "Đang hoạt động" : healthStatus;
    const animalDescription = [
      `Nhóm: ${groupName}`,
      `Loài: ${species}`,
      `Giống: ${breed}`,
      cleanString(body.purpose, 120) ? `Mục đích: ${cleanString(body.purpose, 120)}` : null,
      cleanString(body.lifeStage, 80) ? `Giai đoạn: ${cleanString(body.lifeStage, 80)}` : null,
    ]
      .filter(Boolean)
      .join("; ");

    const client = await db.connect();
    try {
      await client.query("begin");

      await client.query(
        `insert into du_lieu.nhom_vat_nuoi (
          id, trang_trai_id, khu_vuc_id, ma_nhom, ten_nhom, loai_vat_nuoi, mo_ta, cach_tao,
          giong, so_luong, gioi_tinh, giai_doan_sinh_truong, trang_thai_suc_khoe,
          muc_dich_san_xuat, ghi_chu_dan, nguon_goc, gia_tri_mua, tai_khoan_chi_phi,
          ngay_sinh, kieu_thu_thai, trong_luong_so_sinh_kg, ghi_chu_sinh, van_de_suc_khoe,
          ma_me, ma_bo, mau_long, mau_mat, kieu_tai, kieu_sung, tinh_trang_mieng,
          diem_the_trang, ghi_chu_dac_diem, nhan_dien_chinh, trang_thai_sinh_san,
          kha_nang_sinh_san, tang_trong_binh_quan_ngay, nang_luong_megajoule_ngay,
          trong_luong_muc_tieu_kg, ngay_can_muc_tieu, metadata_json
        )
        values (
          $1,$2,$3,$4,$5,$6,$7,$8,
          $9,$10,$11,$12,$13,
          $14,$15,$16,$17,$18,
          $19,$20,$21,$22,$23,
          $24,$25,$26,$27,$28,$29,$30,
          $31,$32,$33,$34,
          $35,$36,$37,
          $38,$39,$40
        )`,
        [
          groupId,
          farmId,
          locationId,
          groupCode,
          groupName,
          species,
          cleanString(body.description, 2000),
          cleanString(body.createFrom, 120),
          breed,
          headCount,
          cleanString(body.gender, 80),
          cleanString(body.lifeStage, 80),
          healthStatus,
          cleanString(body.purpose, 120),
          cleanString(body.herdNotes, 2000),
          cleanString(body.origin, 120),
          parseNumber(body.price),
          cleanString(body.expenseAccount, 120),
          dateOrNull(body.birthDate),
          cleanString(body.conceptionType, 120),
          parseNumber(body.averageBirthWeight),
          cleanString(body.birthNotes, 2000),
          cleanString(body.healthIssues, 2000),
          cleanString(body.maternityId, 120),
          cleanString(body.paternityId, 120),
          cleanString(body.colouring, 2000),
          cleanString(body.eyeColor, 80),
          cleanString(body.earType, 80),
          cleanString(body.hornType, 80),
          cleanString(body.mouth, 80),
          parseNumber(body.bodyConditionScore),
          cleanString(body.traitNotes, 2000),
          cleanString(body.primaryIdentification, 120),
          cleanString(body.reproductiveState, 120),
          cleanString(body.reproductiveAvailability, 120),
          parseNumber(body.lifetimeAdg),
          parseNumber(body.lifetimeMjDay),
          parseNumber(body.targetLiveWeight),
          dateOrNull(body.targetWeightDate),
          JSON.stringify({ form: body, tags }),
        ]
      );

      for (const [index, tag] of tags.entries()) {
        await client.query(
          `insert into du_lieu.nhan_dien_nhom_vat_nuoi
             (nhom_vat_nuoi_id, loai_the, ma_nhan_dien, mau_sac, vi_tri, la_chinh)
           values ($1,$2,$3,$4,$5,$6)`,
          [groupId, tag.type, tag.label, tag.color, tag.location, index === 0]
        );
      }

      await client.query(
        `insert into du_lieu.vat_nuoi
           (trang_trai_id, khu_vuc_id, nhom_vat_nuoi_id, ma_vat_nuoi, the_nhan_dien, trang_thai, mo_ta)
         select $1::uuid, $2::uuid, $3::uuid, concat($4::text, '-', lpad(seq::text, 3, '0')), $5::text, $6::text, $7::text
         from generate_series(1, $8::int) as seq`,
        [farmId, locationId, groupId, groupCode, `${species} - ${groupName}`, animalStatus, animalDescription, headCount]
      );

      if (locationId) {
        await client.query(
          `insert into du_lieu.dem_dong_vat (khu_vuc_id, so_luong)
           select $1::uuid, count(*)::int
           from du_lieu.vat_nuoi
           where khu_vuc_id = $1::uuid and trang_trai_id = $2`,
          [locationId, farmId]
        );
      }

      await client.query("commit");
      return NextResponse.json({
        message: "Đã lưu nhóm vật nuôi.",
        groupId,
        groupCode,
        insertedAnimals: headCount,
      });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json({ message: "Không thể lưu nhóm vật nuôi.", error: String(error) }, { status: 500 });
  }
}
