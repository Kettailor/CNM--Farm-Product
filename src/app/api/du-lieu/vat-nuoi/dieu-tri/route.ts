import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { layOwnerIdTuRequest, layOwnerIdTuServerCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleFarmId } from "@/lib/farm-access";
import { ensureLivestockTreatmentSchema } from "@/lib/livestock-treatment-schema";
import {
  getLivestockTreatmentTypeOption,
  isLivestockTreatmentType,
  type LivestockTreatmentType,
} from "@/lib/livestock-treatment-types";
import { isWarehouseType, type WarehouseType } from "@/lib/warehouse-types";

export const dynamic = "force-dynamic";

type TreatmentPayload = {
  groupId?: unknown;
  type?: unknown;
  name?: unknown;
  warehouseItemId?: unknown;
  animalIds?: unknown;
  treatedCount?: unknown;
  treatmentDate?: unknown;
  dosePerAnimal?: unknown;
  doseUnit?: unknown;
  totalQuantity?: unknown;
  batchLot?: unknown;
  method?: unknown;
  performedBy?: unknown;
  withdrawalDays?: unknown;
  esiDays?: unknown;
  nextDueDate?: unknown;
  note?: unknown;
  metadata?: unknown;
  attachmentImages?: unknown;
};

type GroupRow = {
  id: string;
  trang_trai_id: string;
  so_luong: number | string | null;
};

type WarehouseItemRow = {
  id: string;
  ma_vat_tu: string | null;
  ten_vat_tu: string | null;
  loai_kho: string | null;
  so_luong: number | string | null;
  don_vi: string | null;
  nguong_toi_thieu: number | string | null;
  han_su_dung: string | Date | null;
  trang_thai: string | null;
  metadata_json: Record<string, unknown> | null;
};

const TYPE_PREFIX: Record<LivestockTreatmentType, string> = {
  footrot: "FTR",
  vaccination: "VAC",
  supplement: "SUP",
  dehorn: "DHR",
  parasite: "PAR",
  dry_off: "DRY",
  custom: "CUS",
};

function cleanString(value: unknown, max = 240) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function parseNumber(value: unknown, fallback = 0) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const normalized = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseNonNegativeInt(value: unknown, fallback = 0) {
  const parsed = Math.floor(parseNumber(value, fallback));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function dateOrNull(value: unknown) {
  const raw = cleanString(value, 20);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function dbDateOnly(value: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function isExpiredDate(value: string | Date | null, treatmentDate: string) {
  const expiryDate = dbDateOnly(value);
  return Boolean(expiryDate && expiryDate < treatmentDate);
}

function addDays(value: string | null, days: number | null) {
  if (!value || days == null) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function cleanMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string | number | null>>((result, [key, entry]) => {
    const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 60);
    if (!safeKey) return result;
    if (typeof entry === "number") {
      result[safeKey] = Number.isFinite(entry) ? entry : null;
      return result;
    }
    result[safeKey] = cleanString(entry, 500);
    return result;
  }, {});
}

function cleanAttachmentImages(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 4).flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const source = entry as Record<string, unknown>;
    const name = cleanString(source.name, 180) ?? "anh-dieu-tri";
    const type = cleanString(source.type, 80) ?? "";
    const dataUrl = typeof source.dataUrl === "string" ? source.dataUrl.trim() : "";
    const size = parseNonNegativeInt(source.size, 0);

    if (!type.startsWith("image/")) return [];
    if (size > 3 * 1024 * 1024) return [];
    if (dataUrl.length > 4_300_000) return [];
    if (!dataUrl.startsWith(`data:${type};base64,`)) return [];

    return [{ name, type, size, dataUrl }];
  });
}

function normalizeAnimalIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => cleanString(item, 80))
        .filter((item): item is string => Boolean(item))
    )
  );
}

function makeTreatmentCode(type: LivestockTreatmentType) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `DT-${TYPE_PREFIX[type]}-${today}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function numberFromDb(value: number | string | null) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function batchLotFromItem(item: WarehouseItemRow) {
  const metadata = item.metadata_json ?? {};
  return (
    cleanString(metadata.batchCode, 120) ??
    cleanString(metadata.productBatch, 120) ??
    cleanString(metadata.traceCode, 120) ??
    null
  );
}

async function loadOwnedGroup(client: PoolClient, farmId: string, groupId: string) {
  const groupRs = await client.query<GroupRow>(
    `select n.id::text, n.trang_trai_id::text, n.so_luong
     from du_lieu.nhom_vat_nuoi n
     where n.id::text = $1 and n.trang_trai_id::text = $2
     limit 1`,
    [groupId, farmId]
  );
  return groupRs.rows[0] ?? null;
}

async function loadSelectedAnimalIds(client: PoolClient, farmId: string, groupId: string, animalIds: string[]) {
  if (animalIds.length === 0) return [];

  const animalRs = await client.query<{ id: string }>(
    `select id::text
     from du_lieu.vat_nuoi
     where trang_trai_id = $1 and nhom_vat_nuoi_id::text = $2 and id::text = any($3::text[])`,
    [farmId, groupId, animalIds]
  );
  return animalRs.rows.map((row) => row.id);
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
    const farmId = await getAccessibleFarmId(ownerId, "write");
    if (!farmId) return NextResponse.json({ message: "Không có quyền ghi điều trị vật nuôi." }, { status: 403 });

    await ensureLivestockTreatmentSchema();

    const body = (await request.json()) as TreatmentPayload;
    const groupId = cleanString(body.groupId, 80);
    if (!groupId) return NextResponse.json({ message: "Vui lòng chọn nhóm vật nuôi cần điều trị." }, { status: 400 });

    const treatmentType: LivestockTreatmentType = isLivestockTreatmentType(body.type) ? body.type : "custom";
    const typeOption = getLivestockTreatmentTypeOption(treatmentType);
    const warehouseItemId = cleanString(body.warehouseItemId, 80);
    if (!warehouseItemId) return NextResponse.json({ message: "Vui lòng chọn vật tư điều trị từ kho." }, { status: 400 });

    const client = await db.connect();
    try {
      await client.query("begin");

      const group = await loadOwnedGroup(client, farmId, groupId);
      if (!group) {
        await client.query("rollback");
        return NextResponse.json({ message: "Không tìm thấy nhóm vật nuôi hoặc không có quyền ghi điều trị." }, { status: 404 });
      }

      const itemRs = await client.query<WarehouseItemRow>(
        `select id::text, ma_vat_tu, ten_vat_tu, loai_kho, so_luong, don_vi, nguong_toi_thieu,
                han_su_dung, trang_thai, metadata_json
         from du_lieu.kho_vat_tu
         where id::text = $1 and trang_trai_id = $2
         for update`,
        [warehouseItemId, group.trang_trai_id]
      );
      const item = itemRs.rows[0];
      if (!item) {
        await client.query("rollback");
        return NextResponse.json({ message: "Không tìm thấy vật tư kho để ghi điều trị." }, { status: 404 });
      }

      const itemType: WarehouseType = isWarehouseType(item.loai_kho) ? item.loai_kho : "hoa_chat";
      if (!typeOption.allowedWarehouseTypes.includes(itemType)) {
        await client.query("rollback");
        return NextResponse.json({ message: "Vật tư kho không phù hợp với loại điều trị đã chọn." }, { status: 400 });
      }

      const treatmentDate = dateOrNull(body.treatmentDate) ?? new Date().toISOString().slice(0, 10);
      const itemStatus = cleanString(item.trang_thai, 80);
      if (itemStatus === "da_huy" || itemStatus === "ngung_su_dung") {
        await client.query("rollback");
        return NextResponse.json({ message: "Vật tư kho đã ngừng sử dụng hoặc đã hủy." }, { status: 400 });
      }
      if (itemStatus === "het_han" || isExpiredDate(item.han_su_dung, treatmentDate)) {
        await client.query("rollback");
        return NextResponse.json({ message: "Vật tư điều trị đã hết hạn, không thể ghi điều trị." }, { status: 400 });
      }

      const requestedAnimalIds = normalizeAnimalIds(body.animalIds);
      if (requestedAnimalIds.length === 0) {
        await client.query("rollback");
        return NextResponse.json({ message: "Vui lòng chọn ít nhất một vật nuôi trong đàn để ghi điều trị." }, { status: 400 });
      }

      const selectedAnimalIds = await loadSelectedAnimalIds(client, group.trang_trai_id, groupId, requestedAnimalIds);
      if (selectedAnimalIds.length !== requestedAnimalIds.length) {
        await client.query("rollback");
        return NextResponse.json({ message: "Danh sách vật nuôi điều trị không hợp lệ hoặc không thuộc đàn này." }, { status: 400 });
      }

      const treatedCount = selectedAnimalIds.length;
      if (treatedCount < 1) {
        await client.query("rollback");
        return NextResponse.json({ message: "Số lượng vật nuôi được điều trị phải lớn hơn 0." }, { status: 400 });
      }

      const dosePerAnimal = Math.max(0, parseNumber(body.dosePerAnimal, 0));
      const totalQuantity = dosePerAnimal > 0 ? dosePerAnimal * treatedCount : 0;
      const shouldDeductInventory = itemType !== "cong_cu";
      if (shouldDeductInventory && totalQuantity <= 0) {
        await client.query("rollback");
        return NextResponse.json({ message: "Vui lòng nhập lượng vật tư dùng để trừ kho." }, { status: 400 });
      }

      const stockBefore = numberFromDb(item.so_luong);
      const stockAfter = shouldDeductInventory ? stockBefore - totalQuantity : stockBefore;
      if (shouldDeductInventory && stockAfter < 0) {
        await client.query("rollback");
        return NextResponse.json({ message: "Tồn kho không đủ cho lần điều trị này." }, { status: 400 });
      }

      const withdrawalDays = body.withdrawalDays == null || cleanString(body.withdrawalDays, 20) == null ? null : parseNonNegativeInt(body.withdrawalDays, 0);
      const esiDays = body.esiDays == null || cleanString(body.esiDays, 20) == null ? null : parseNonNegativeInt(body.esiDays, 0);
      const treatmentId = randomUUID();
      const treatmentCode = makeTreatmentCode(treatmentType);
      const treatmentName =
        cleanString(body.name, 180) ??
        `${typeOption.shortLabel} - ${cleanString(item.ten_vat_tu, 180) ?? cleanString(item.ma_vat_tu, 80) ?? "vật tư kho"}`;
      const batchLot = cleanString(body.batchLot, 120) ?? batchLotFromItem(item);
      const doseUnit = cleanString(body.doseUnit, 40) ?? typeOption.defaultDoseUnit;
      const inventoryUnit = cleanString(item.don_vi, 40) ?? "đơn vị";
      const method = cleanString(body.method, 180) ?? typeOption.defaultMethod;
      const targetScope = "ca_the";
      const attachmentImages = cleanAttachmentImages(body.attachmentImages);
      const metadata = {
        ...cleanMetadata(body.metadata),
        inventoryConsumed: shouldDeductInventory ? "yes" : "no",
        ...(attachmentImages.length > 0 ? { attachments: attachmentImages } : {}),
      };

      await client.query(
        `insert into du_lieu.dieu_tri_vat_nuoi (
          id, trang_trai_id, nhom_vat_nuoi_id, kho_vat_tu_id, ma_dieu_tri, loai_dieu_tri,
          ten_dieu_tri, ngay_dieu_tri, pham_vi_dieu_tri, so_luong_vat_nuoi,
          lieu_luong_moi_con, don_vi_lieu_luong, tong_luong_dung, don_vi_ton_kho,
          lo_san_xuat, phuong_phap, nguoi_thuc_hien, thoi_gian_ngung_su_dung_ngay,
          thoi_gian_esi_ngay, ngay_ket_thuc_cach_ly, ngay_nhac_lai, trang_thai, ghi_chu, metadata_json
        )
        values (
          $1,$2,$3::uuid,$4::uuid,$5,$6,
          $7,$8,$9,$10,
          $11,$12,$13,$14,
          $15,$16,$17,$18,
          $19,$20,$21,'hoan_tat',$22,$23::jsonb
        )`,
        [
          treatmentId,
          group.trang_trai_id,
          groupId,
          warehouseItemId,
          treatmentCode,
          treatmentType,
          treatmentName,
          treatmentDate,
          targetScope,
          treatedCount,
          dosePerAnimal,
          doseUnit,
          totalQuantity,
          inventoryUnit,
          batchLot,
          method,
          cleanString(body.performedBy, 120),
          withdrawalDays,
          esiDays,
          addDays(treatmentDate, withdrawalDays),
          dateOrNull(body.nextDueDate),
          cleanString(body.note, 1600),
          JSON.stringify(metadata),
        ]
      );

      if (selectedAnimalIds.length > 0) {
        await client.query(
          `insert into du_lieu.dieu_tri_vat_nuoi_ca_the (dieu_tri_id, vat_nuoi_id)
           select $1::uuid, animal_id::uuid
           from unnest($2::text[]) as selected(animal_id)`,
          [treatmentId, selectedAnimalIds]
        );
      }

      if (shouldDeductInventory) {
        const minimumQuantity = numberFromDb(item.nguong_toi_thieu);
        const nextStatus = stockAfter <= 0 ? "can_kiem_tra" : stockAfter <= minimumQuantity ? "sap_het" : "binh_thuong";
        await client.query(
          `update du_lieu.kho_vat_tu
              set so_luong = $1,
                  trang_thai = $2,
                  updated_at = now()
            where id::text = $3 and trang_trai_id = $4`,
          [stockAfter, nextStatus, warehouseItemId, group.trang_trai_id]
        );

        await client.query(
          `insert into du_lieu.kho_vat_tu_giao_dich (
             trang_trai_id, kho_vat_tu_id, loai_giao_dich, nguon_nghiep_vu, nguon_ban_ghi_id,
             so_luong, so_luong_truoc, so_luong_sau, don_vi, ghi_chu, metadata_json
           )
           values ($1, $2::uuid, 'xuat_dieu_tri', 'dieu_tri_vat_nuoi', $3::uuid, $4, $5, $6, $7, $8, $9::jsonb)`,
          [
            group.trang_trai_id,
            warehouseItemId,
            treatmentId,
            totalQuantity,
            stockBefore,
            stockAfter,
            inventoryUnit,
            `Điều trị ${treatmentName}`,
            JSON.stringify({ treatmentType, treatmentCode, groupId }),
          ]
        );
      }

      await client.query(
        `update du_lieu.nhom_vat_nuoi
            set trang_thai_suc_khoe = 'Đang theo dõi',
                updated_at = now()
          where id::text = $1 and trang_trai_id = $2`,
        [groupId, group.trang_trai_id]
      );

      if (selectedAnimalIds.length > 0) {
        await client.query(
          `update du_lieu.vat_nuoi
              set trang_thai = 'Đang theo dõi',
                  updated_at = now()
            where id::text = any($1::text[]) and trang_trai_id = $2`,
          [selectedAnimalIds, group.trang_trai_id]
        );
      }

      await client.query("commit");
      return NextResponse.json({
        message: "Đã ghi nhận điều trị và cập nhật tồn kho.",
        treatmentId,
        treatmentCode,
        remainingQuantity: stockAfter,
        inventoryDeducted: shouldDeductInventory,
      });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json({ message: "Không thể ghi nhận điều trị.", error: String(error) }, { status: 500 });
  }
}
