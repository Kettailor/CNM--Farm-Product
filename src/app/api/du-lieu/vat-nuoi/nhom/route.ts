import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { layOwnerIdTuRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleFarmId } from "@/lib/farm-access";
import { ensureLivestockSchema } from "@/lib/livestock-schema";
import { notifyFarmUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type GroupPayload = {
  groupId?: unknown;
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

function makeAnimalQrCode() {
  return `QR-VN-${randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
}

async function findExistingQrCodes(client: PoolClient, codes: string[]) {
  if (codes.length === 0) return new Set<string>();

  const animalRs = await client.query<{ code: string }>(
    `select ma_qr as code
     from du_lieu.vat_nuoi
     where ma_qr = any($1::text[])`,
    [codes]
  );

  const existing = new Set(animalRs.rows.map((row) => row.code));
  const traceTableRs = await client.query<{ exists: boolean }>(
    `select to_regclass('du_lieu.truy_xuat_san_pham_chuoi_khoi') is not null as exists`
  );

  if (traceTableRs.rows[0]?.exists) {
    const traceRs = await client.query<{ code: string }>(
      `select ma_truy_xuat as code
       from du_lieu.truy_xuat_san_pham_chuoi_khoi
       where ma_truy_xuat = any($1::text[])`,
      [codes]
    );
    for (const row of traceRs.rows) existing.add(row.code);
  }

  return existing;
}

async function makeUniqueAnimalQrCodes(client: PoolClient, count: number) {
  const codes = new Set<string>();

  for (let attempt = 0; codes.size < count && attempt < 8; attempt += 1) {
    while (codes.size < count) codes.add(makeAnimalQrCode());

    const existing = await findExistingQrCodes(client, Array.from(codes));
    for (const code of existing) codes.delete(code);
  }

  if (codes.size < count) {
    throw new Error("QR_CODE_GENERATION_FAILED");
  }

  return Array.from(codes).slice(0, count);
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuRequest(request);
    if (!ownerId) {
      return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
    }

    await ensureLivestockSchema();

    const farmId = await getAccessibleFarmId(ownerId, "write");
    if (!farmId) {
      return NextResponse.json({ message: "Không có quyền thêm nhóm vật nuôi." }, { status: 403 });
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
        `select id from du_lieu.khu_vuc
         where id::text = $1
           and trang_trai_id = $2
           and coalesce(lower(trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
         limit 1`,
        [locationId, farmId]
      );
      if (zoneRs.rowCount === 0) {
        return NextResponse.json({ message: "Khu vực được chọn không thuộc trang trại hiện tại." }, { status: 400 });
      }
    }

    const groupId = randomUUID();
    const groupCode = makeGroupCode(species);
    const healthStatus = cleanString(body.healthStatus, 80) ?? "Đang hoạt động";
    const gender = cleanString(body.gender, 80);
    const lifeStage = cleanString(body.lifeStage, 80);
    const purpose = cleanString(body.purpose, 120);
    const origin = cleanString(body.origin, 120);
    const birthDate = dateOrNull(body.birthDate);
    const maternityId = cleanString(body.maternityId, 120);
    const paternityId = cleanString(body.paternityId, 120);
    const colouring = cleanString(body.colouring, 2000);
    const reproductiveState = cleanString(body.reproductiveState, 120);
    const primaryIdentification = cleanString(body.primaryIdentification, 120) ?? "Mã QR cá thể";
    const animalStatus = healthStatus === "Đang theo dõi" ? "Đang hoạt động" : healthStatus;
    const animalDescription = [
      `Nhóm: ${groupName}`,
      `Loài: ${species}`,
      `Giống: ${breed}`,
      purpose ? `Mục đích: ${purpose}` : null,
      lifeStage ? `Giai đoạn: ${lifeStage}` : null,
      "Quản lý bằng mã QR cá thể",
    ]
      .filter(Boolean)
      .join("; ");
    const animalMetadata = JSON.stringify({
      source: "new-group-wizard",
      individualTracking: true,
      groupSnapshot: {
        groupId,
        groupCode,
        groupName,
        species,
        breed,
        gender,
        lifeStage,
        healthStatus,
        purpose,
        locationId,
        origin,
        birthDate,
        maternityId,
        paternityId,
        primaryIdentification,
        targetLiveWeight: parseNumber(body.targetLiveWeight),
        targetWeightDate: dateOrNull(body.targetWeightDate),
      },
    });

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
          gender,
          lifeStage,
          healthStatus,
          purpose,
          cleanString(body.herdNotes, 2000),
          origin,
          parseNumber(body.price),
          cleanString(body.expenseAccount, 120),
          birthDate,
          cleanString(body.conceptionType, 120),
          parseNumber(body.averageBirthWeight),
          cleanString(body.birthNotes, 2000),
          cleanString(body.healthIssues, 2000),
          maternityId,
          paternityId,
          colouring,
          cleanString(body.eyeColor, 80),
          cleanString(body.earType, 80),
          cleanString(body.hornType, 80),
          cleanString(body.mouth, 80),
          parseNumber(body.bodyConditionScore),
          cleanString(body.traitNotes, 2000),
          primaryIdentification,
          reproductiveState,
          cleanString(body.reproductiveAvailability, 120),
          parseNumber(body.lifetimeAdg),
          parseNumber(body.lifetimeMjDay),
          parseNumber(body.targetLiveWeight),
          dateOrNull(body.targetWeightDate),
          JSON.stringify({ form: body, qrMode: "per-animal" }),
        ]
      );

      const animalCodes = Array.from({ length: headCount }, (_, index) => `${groupCode}-${String(index + 1).padStart(3, "0")}`);
      const qrCodes = await makeUniqueAnimalQrCodes(client, headCount);

      await client.query(
        `insert into du_lieu.vat_nuoi
           (
             trang_trai_id, khu_vuc_id, nhom_vat_nuoi_id, ma_vat_nuoi, ma_qr, the_nhan_dien,
             trang_thai, mo_ta, loai_vat_nuoi, giong, gioi_tinh, giai_doan_sinh_truong,
             ngay_sinh, nguon_goc, ma_me, ma_bo, mau_long, trang_thai_sinh_san, metadata_json
           )
         select
           $1::uuid, $2::uuid, $3::uuid, animal.ma_vat_nuoi, animal.ma_qr, animal.ma_qr,
           $6::text, $7::text, $8::text, $9::text, $10::text, $11::text,
           $12::date, $13::text, $14::text, $15::text, $16::text, $17::text, $18::jsonb
         from unnest($4::text[], $5::text[]) as animal(ma_vat_nuoi, ma_qr)`,
        [
          farmId,
          locationId,
          groupId,
          animalCodes,
          qrCodes,
          animalStatus,
          animalDescription,
          species,
          breed,
          gender,
          lifeStage,
          birthDate,
          origin,
          maternityId,
          paternityId,
          colouring,
          reproductiveState,
          animalMetadata,
        ]
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
      await notifyFarmUsers({
        farmId,
        excludeUserId: ownerId,
        title: "Nhóm vật nuôi mới",
        body: `${groupName} · ${headCount} con`,
        tone: "success",
        module: "Vật nuôi",
        href: `/dashboard/vat-nuoi/${groupId}`,
        metadata: { groupId, groupCode, headCount },
      }).catch(() => undefined);
      return NextResponse.json({
        message: "Đã lưu nhóm vật nuôi.",
        groupId,
        groupCode,
        insertedAnimals: headCount,
        createdQrCodes: qrCodes.length,
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

export async function PUT(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuRequest(request);
    if (!ownerId) {
      return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
    }

    await ensureLivestockSchema();

    const body = (await request.json()) as GroupPayload;
    const groupId = cleanString(body.groupId, 80);
    const groupName = cleanString(body.groupName, 160);
    const breed = cleanString(body.breed, 120);

    if (!groupId) {
      return NextResponse.json({ message: "Thiếu nhóm vật nuôi cần chỉnh sửa." }, { status: 400 });
    }
    if (!groupName) {
      return NextResponse.json({ message: "Vui lòng nhập tên nhóm vật nuôi." }, { status: 400 });
    }
    if (!breed) {
      return NextResponse.json({ message: "Vui lòng nhập giống vật nuôi." }, { status: 400 });
    }

    const farmId = await getAccessibleFarmId(ownerId, "write");
    if (!farmId) {
      return NextResponse.json({ message: "Không có quyền cập nhật nhóm vật nuôi." }, { status: 403 });
    }

    const currentRs = await db.query(
      `select n.id, n.trang_trai_id, n.khu_vuc_id, n.ma_nhom, n.ten_nhom, n.loai_vat_nuoi,
              n.giong, n.gioi_tinh, n.giai_doan_sinh_truong, n.trang_thai_suc_khoe,
              n.muc_dich_san_xuat, n.nguon_goc, n.ngay_sinh, n.ma_me, n.ma_bo,
              n.mau_long, n.trang_thai_sinh_san
       from du_lieu.nhom_vat_nuoi n
       where n.id::text = $1 and n.trang_trai_id::text = $2
       limit 1`,
      [groupId, farmId]
    );

    const current = currentRs.rows[0];
    if (!current) {
      return NextResponse.json({ message: "Không tìm thấy nhóm vật nuôi trong trang trại hiện tại." }, { status: 404 });
    }

    const description = cleanString(body.description, 2000);
    const healthStatus = cleanString(body.healthStatus, 80) ?? cleanString(current.trang_thai_suc_khoe, 80);
    const gender = cleanString(body.gender, 80);
    const lifeStage = cleanString(body.lifeStage, 80);
    const purpose = cleanString(body.purpose, 120);
    const herdNotes = cleanString(body.herdNotes, 2000);
    const origin = cleanString(body.origin, 120);
    const birthDate = dateOrNull(body.birthDate);
    const maternityId = cleanString(body.maternityId, 120);
    const paternityId = cleanString(body.paternityId, 120);
    const colouring = cleanString(body.colouring, 2000);
    const reproductiveState = cleanString(body.reproductiveState, 120);

    const groupSnapshot = JSON.stringify({
      groupId: String(current.id),
      groupCode: cleanString(current.ma_nhom) ?? String(current.id),
      groupName,
      species: cleanString(current.loai_vat_nuoi) ?? "Vật nuôi",
      breed,
      gender,
      lifeStage,
      healthStatus,
      purpose,
      locationId: current.khu_vuc_id ? String(current.khu_vuc_id) : null,
      origin,
      birthDate,
      maternityId,
      paternityId,
      primaryIdentification: "Mã QR cá thể",
      targetLiveWeight: parseNumber(body.targetLiveWeight),
      targetWeightDate: dateOrNull(body.targetWeightDate),
    });

    const client = await db.connect();
    try {
      await client.query("begin");

      await client.query(
        `update du_lieu.nhom_vat_nuoi
            set ten_nhom = $2,
                mo_ta = $3,
                giong = $4,
                gioi_tinh = $5,
                giai_doan_sinh_truong = $6,
                trang_thai_suc_khoe = $7,
                muc_dich_san_xuat = $8,
                ghi_chu_dan = $9,
                nguon_goc = $10,
                gia_tri_mua = $11,
                tai_khoan_chi_phi = $12,
                ngay_sinh = $13,
                kieu_thu_thai = $14,
                trong_luong_so_sinh_kg = $15,
                ghi_chu_sinh = $16,
                van_de_suc_khoe = $17,
                ma_me = $18,
                ma_bo = $19,
                mau_long = $20,
                mau_mat = $21,
                kieu_tai = $22,
                kieu_sung = $23,
                tinh_trang_mieng = $24,
                diem_the_trang = $25,
                ghi_chu_dac_diem = $26,
                trang_thai_sinh_san = $27,
                kha_nang_sinh_san = $28,
                tang_trong_binh_quan_ngay = $29,
                nang_luong_megajoule_ngay = $30,
                trong_luong_muc_tieu_kg = $31,
                ngay_can_muc_tieu = $32,
                updated_at = now()
          where id = $1`,
        [
          current.id,
          groupName,
          description,
          breed,
          gender,
          lifeStage,
          healthStatus,
          purpose,
          herdNotes,
          origin,
          parseNumber(body.price),
          cleanString(body.expenseAccount, 120),
          birthDate,
          cleanString(body.conceptionType, 120),
          parseNumber(body.averageBirthWeight),
          cleanString(body.birthNotes, 2000),
          cleanString(body.healthIssues, 2000),
          maternityId,
          paternityId,
          colouring,
          cleanString(body.eyeColor, 80),
          cleanString(body.earType, 80),
          cleanString(body.hornType, 80),
          cleanString(body.mouth, 80),
          parseNumber(body.bodyConditionScore),
          cleanString(body.traitNotes, 2000),
          reproductiveState,
          cleanString(body.reproductiveAvailability, 120),
          parseNumber(body.lifetimeAdg),
          parseNumber(body.lifetimeMjDay),
          parseNumber(body.targetLiveWeight),
          dateOrNull(body.targetWeightDate),
        ]
      );

      await client.query(
        `update du_lieu.vat_nuoi
            set giong = case when giong is null or giong = $3 then $4 else giong end,
                gioi_tinh = case when gioi_tinh is null or gioi_tinh = $5 then $6 else gioi_tinh end,
                giai_doan_sinh_truong = case when giai_doan_sinh_truong is null or giai_doan_sinh_truong = $7 then $8 else giai_doan_sinh_truong end,
                trang_thai = case when trang_thai is null or trang_thai = $9 then $10 else trang_thai end,
                ngay_sinh = case when ngay_sinh is null or ngay_sinh = $11 then $12 else ngay_sinh end,
                nguon_goc = case when nguon_goc is null or nguon_goc = $13 then $14 else nguon_goc end,
                ma_me = case when ma_me is null or ma_me = $15 then $16 else ma_me end,
                ma_bo = case when ma_bo is null or ma_bo = $17 then $18 else ma_bo end,
                mau_long = case when mau_long is null or mau_long = $19 then $20 else mau_long end,
                trang_thai_sinh_san = case when trang_thai_sinh_san is null or trang_thai_sinh_san = $21 then $22 else trang_thai_sinh_san end,
                metadata_json = jsonb_set(coalesce(metadata_json, '{}'::jsonb), '{groupSnapshot}', $23::jsonb, true),
                updated_at = now()
          where nhom_vat_nuoi_id = $1 and trang_trai_id = $2`,
        [
          current.id,
          current.trang_trai_id,
          cleanString(current.giong, 120),
          breed,
          cleanString(current.gioi_tinh, 80),
          gender,
          cleanString(current.giai_doan_sinh_truong, 80),
          lifeStage,
          cleanString(current.trang_thai_suc_khoe, 80),
          healthStatus,
          current.ngay_sinh,
          birthDate,
          cleanString(current.nguon_goc, 120),
          origin,
          cleanString(current.ma_me, 120),
          maternityId,
          cleanString(current.ma_bo, 120),
          paternityId,
          cleanString(current.mau_long, 2000),
          colouring,
          cleanString(current.trang_thai_sinh_san, 120),
          reproductiveState,
          groupSnapshot,
        ]
      );

      await client.query("commit");
      return NextResponse.json({ message: "Đã cập nhật nhóm vật nuôi.", groupId });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json({ message: "Không thể cập nhật nhóm vật nuôi.", error: String(error) }, { status: 500 });
  }
}
