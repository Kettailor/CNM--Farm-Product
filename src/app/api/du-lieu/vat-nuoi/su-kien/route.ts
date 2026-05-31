import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { layOwnerIdTuRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureLivestockEventSchema } from "@/lib/livestock-event-schema";
import { getLivestockEventTypeOption, isLivestockEventType, type LivestockEventType } from "@/lib/livestock-event-types";

export const dynamic = "force-dynamic";

type EventPayload = {
  groupId?: unknown;
  type?: unknown;
  title?: unknown;
  eventDate?: unknown;
  animalIds?: unknown;
  animalWeights?: unknown;
  sourceZoneId?: unknown;
  destinationZoneId?: unknown;
  numericValue?: unknown;
  unit?: unknown;
  performedBy?: unknown;
  followUpDate?: unknown;
  note?: unknown;
  metadata?: unknown;
};

type GroupRow = {
  id: string;
  trang_trai_id: string;
  khu_vuc_id: string | null;
  so_luong: number | string | null;
  linked_count: number | string | null;
};

const EVENT_PREFIX: Record<LivestockEventType, string> = {
  adjustment: "DC",
  reproduction: "SS",
  health: "SK",
  move: "DV",
  weight: "CN",
  grouping: "PN",
};

const MOVE_TYPES = [
  "move_group_to_new_paddock",
  "entry_to_on_farm_location",
  "between_on_farm_locations",
  "exit_to_holding",
  "temporary_agistment",
  "transport_dispatch",
] as const;

type MovementType = (typeof MOVE_TYPES)[number];

const FARM_DESTINATION_MOVE_TYPES: MovementType[] = [
  "move_group_to_new_paddock",
  "entry_to_on_farm_location",
  "between_on_farm_locations",
];

const MOVE_REQUIRED_METADATA: Partial<Record<MovementType, { key: string; label: string }[]>> = {
  exit_to_holding: [{ key: "destinationHolding", label: "cơ sở/mã đăng ký nhận" }],
  temporary_agistment: [{ key: "agistmentLocation", label: "nơi gửi nuôi/chăn thả tạm" }],
  transport_dispatch: [{ key: "dispatchDestination", label: "điểm đến/lệnh điều phối" }],
};

const ADJUSTMENT_TYPES = ["add_animals", "archive_animals", "archive_group", "remove_animals"] as const;

type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

const ADJUSTMENT_REQUIRED_METADATA: Partial<Record<AdjustmentType, { key: string; label: string }[]>> = {
  archive_animals: [{ key: "archiveReason", label: "lý do lưu trữ" }],
  archive_group: [{ key: "archiveGroupReason", label: "lý do lưu trữ nhóm" }],
  remove_animals: [{ key: "removalReason", label: "lý do loại bỏ" }],
};

const HEALTH_TYPES = [
  "castration",
  "shearing",
  "hoof_trim",
  "crutching",
  "shoeing",
  "misc_observation",
  "general_measurement",
  "condition_score",
  "feeding",
  "milk_production",
  "veterinary_consultation",
  "diagnosis_case_recorded",
  "sample_collected",
  "test_result_recorded",
  "parasite_monitoring",
  "other",
] as const;

type HealthType = (typeof HEALTH_TYPES)[number];

const HEALTH_CATEGORIES: Record<HealthType, string> = {
  castration: "procedures",
  shearing: "procedures",
  hoof_trim: "procedures",
  crutching: "procedures",
  shoeing: "procedures",
  misc_observation: "observations",
  general_measurement: "observations",
  condition_score: "observations",
  feeding: "production",
  milk_production: "production",
  veterinary_consultation: "clinical",
  diagnosis_case_recorded: "clinical",
  sample_collected: "clinical",
  test_result_recorded: "clinical",
  parasite_monitoring: "clinical",
  other: "other",
};

const HEALTH_REQUIRED_METADATA: Partial<Record<HealthType, { key: string; label: string }[]>> = {
  misc_observation: [{ key: "observedSigns", label: "dấu hiệu ghi nhận" }],
  general_measurement: [{ key: "measurementName", label: "chỉ số đo" }],
  condition_score: [{ key: "conditionScore", label: "điểm thể trạng" }],
  veterinary_consultation: [{ key: "veterinarian", label: "bác sĩ thú y" }],
  diagnosis_case_recorded: [
    { key: "symptoms", label: "triệu chứng" },
    { key: "diagnosis", label: "chẩn đoán" },
  ],
  sample_collected: [{ key: "sampleType", label: "loại mẫu" }],
  test_result_recorded: [
    { key: "testName", label: "tên xét nghiệm" },
    { key: "testResult", label: "kết quả" },
  ],
  other: [{ key: "otherHealthEvent", label: "tên sự kiện" }],
};

const WEIGHT_SOURCES = ["tape_estimate", "digital_estimate", "visual_estimate", "carcass_weight"] as const;

type WeightSource = (typeof WEIGHT_SOURCES)[number];

type WeightRecord = {
  animalId: string;
  value: number;
};

function cleanString(value: unknown, max = 240) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function parseNumber(value: unknown) {
  const raw = String(value ?? "").trim().replace(/\s/g, "");
  if (!raw) return null;
  const commaIndex = raw.lastIndexOf(",");
  const dotIndex = raw.lastIndexOf(".");
  let normalized = raw;
  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalMark = commaIndex > dotIndex ? "," : ".";
    const thousandsMark = decimalMark === "," ? "." : ",";
    normalized = raw.split(thousandsMark).join("").replace(decimalMark, ".");
  } else if (commaIndex >= 0) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if ((raw.match(/\./g) ?? []).length > 1) {
    normalized = raw.replace(/\./g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOrNull(value: unknown) {
  const raw = cleanString(value, 20);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
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

function normalizeWeightRecords(value: unknown) {
  const records = new Map<string, WeightRecord>();

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      const animalId = cleanString(entry.animalId ?? entry.animal_id ?? entry.id, 80);
      const weight = parseNumber(entry.weight ?? entry.value ?? entry.numericValue);
      if (animalId && weight != null && weight > 0) records.set(animalId, { animalId, value: weight });
    }
  } else if (value && typeof value === "object") {
    for (const [rawAnimalId, rawWeight] of Object.entries(value as Record<string, unknown>)) {
      const animalId = cleanString(rawAnimalId, 80);
      const weight = parseNumber(rawWeight);
      if (animalId && weight != null && weight > 0) records.set(animalId, { animalId, value: weight });
    }
  }

  return Array.from(records.values());
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
    result[safeKey] = cleanString(entry, 700);
    return result;
  }, {});
}

function metadataString(metadata: Record<string, string | number | null>, key: string, max = 240) {
  const value = metadata[key];
  if (value == null) return null;
  return cleanString(value, max);
}

function normalizeMovementType(value: unknown): MovementType {
  const text = cleanString(value, 80);
  return MOVE_TYPES.includes(text as MovementType) ? (text as MovementType) : "move_group_to_new_paddock";
}

function normalizeAdjustmentType(value: unknown): AdjustmentType {
  const text = cleanString(value, 80);
  return ADJUSTMENT_TYPES.includes(text as AdjustmentType) ? (text as AdjustmentType) : "add_animals";
}

function normalizeHealthType(value: unknown): HealthType | null {
  const text = cleanString(value, 80);
  return HEALTH_TYPES.includes(text as HealthType) ? (text as HealthType) : null;
}

function normalizeWeightSource(value: unknown): WeightSource | null {
  const text = cleanString(value, 80);
  return WEIGHT_SOURCES.includes(text as WeightSource) ? (text as WeightSource) : null;
}

function movementNeedsFarmDestination(value: MovementType) {
  return FARM_DESTINATION_MOVE_TYPES.includes(value);
}

function makeEventCode(type: LivestockEventType) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `SKVN-${EVENT_PREFIX[type]}-${today}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function numberFromDb(value: number | string | null) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function loadOwnedGroup(client: PoolClient, ownerId: string, groupId: string) {
  const groupRs = await client.query<GroupRow>(
    `select n.id::text, n.trang_trai_id::text, n.khu_vuc_id::text, n.so_luong,
            (select count(*)::int from du_lieu.vat_nuoi v where v.nhom_vat_nuoi_id = n.id) as linked_count
     from du_lieu.nhom_vat_nuoi n
     join du_lieu.trang_trai t on t.id = n.trang_trai_id
     where n.id::text = $1 and t.chu_so_huu_id = $2
     limit 1`,
    [groupId, ownerId]
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

async function validateZone(client: PoolClient, farmId: string, zoneId: string | null) {
  if (!zoneId) return null;
  const zoneRs = await client.query<{ id: string }>(
    `select id::text from du_lieu.khu_vuc
     where id::text = $1
       and trang_trai_id = $2
       and coalesce(lower(trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled')
     limit 1`,
    [zoneId, farmId]
  );
  return zoneRs.rows[0]?.id ?? null;
}

async function loadCurrentUserName(client: PoolClient, ownerId: string) {
  try {
    const rs = await client.query<{ name: string | null }>(
      `select coalesce(
          (select nullif(ho_ten, '') from du_lieu.nguoi_dung where id::text = $1 limit 1),
          (select nullif(email, '') from du_lieu.nguoi_dung where id::text = $1 limit 1),
          (select nullif(full_name, '') from du_lieu.chu_so_huu where id::text = $1 limit 1),
          (select nullif(email, '') from du_lieu.chu_so_huu where id::text = $1 limit 1),
          'Người dùng hiện tại'
        ) as name`,
      [ownerId]
    );
    return cleanString(rs.rows[0]?.name, 120) ?? "Người dùng hiện tại";
  } catch {
    return "Người dùng hiện tại";
  }
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuRequest(request);
    if (!ownerId) return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });

    await ensureLivestockEventSchema();

    const body = (await request.json()) as EventPayload;
    const groupId = cleanString(body.groupId, 80);
    if (!groupId) return NextResponse.json({ message: "Vui lòng chọn nhóm vật nuôi." }, { status: 400 });

    if (cleanString(body.type, 40) === "treatment") {
      return NextResponse.json({ message: "Điều trị đã có chức năng riêng. Vui lòng dùng module Điều trị vật nuôi." }, { status: 400 });
    }

    const eventType: LivestockEventType = isLivestockEventType(body.type) ? body.type : "adjustment";
    const typeOption = getLivestockEventTypeOption(eventType);
    const baseMetadata = cleanMetadata(body.metadata);
    const adjustmentType = eventType === "adjustment" ? normalizeAdjustmentType(baseMetadata.adjustmentType) : null;
    const healthType = eventType === "health" ? normalizeHealthType(baseMetadata.healthType) : null;
    const weightSource = eventType === "weight" ? normalizeWeightSource(baseMetadata.weightSource) : null;
    const movementType = eventType === "move" ? normalizeMovementType(baseMetadata.movementType) : null;
    const submittedWeightRecords = eventType === "weight" ? normalizeWeightRecords(body.animalWeights) : [];
    const requestedAnimalIds = eventType === "weight" ? submittedWeightRecords.map((record) => record.animalId) : normalizeAnimalIds(body.animalIds);
    if (requestedAnimalIds.length === 0) {
      return NextResponse.json({ message: "Vui lòng chọn ít nhất một cá thể để ghi sự kiện." }, { status: 400 });
    }

    const client = await db.connect();
    try {
      await client.query("begin");

      const group = await loadOwnedGroup(client, ownerId, groupId);
      if (!group) {
        await client.query("rollback");
        return NextResponse.json({ message: "Không tìm thấy nhóm vật nuôi hoặc không có quyền ghi sự kiện." }, { status: 404 });
      }

      const selectedAnimalIds = await loadSelectedAnimalIds(client, group.trang_trai_id, groupId, requestedAnimalIds);
      if (selectedAnimalIds.length !== requestedAnimalIds.length) {
        await client.query("rollback");
        return NextResponse.json({ message: "Danh sách cá thể không hợp lệ hoặc không thuộc nhóm này." }, { status: 400 });
      }

      const weightByAnimalId = new Map(submittedWeightRecords.map((record) => [record.animalId, record.value]));
      const weightRecords = eventType === "weight"
        ? selectedAnimalIds
            .map((animalId) => {
              const value = weightByAnimalId.get(animalId);
              return value != null && value > 0 ? { animalId, value } : null;
            })
            .filter((record): record is WeightRecord => Boolean(record))
        : [];
      const averageWeight =
        weightRecords.length > 0 ? weightRecords.reduce((total, record) => total + record.value, 0) / weightRecords.length : null;

      const sourceZoneId = group.khu_vuc_id;
      const destinationZoneId = await validateZone(client, group.trang_trai_id, cleanString(body.destinationZoneId, 80));
      const actorName = await loadCurrentUserName(client, ownerId);
      const moveNeedsDestination = movementType ? movementNeedsFarmDestination(movementType) : false;
      if (eventType === "move" && moveNeedsDestination && !destinationZoneId) {
        await client.query("rollback");
        return NextResponse.json({ message: "Vui lòng chọn khu vực đích khi ghi sự kiện di chuyển trong trang trại." }, { status: 400 });
      }

      if (eventType === "move" && movementType) {
        const missingField = (MOVE_REQUIRED_METADATA[movementType] ?? []).find((field) => !metadataString(baseMetadata, field.key, 700));
        if (missingField) {
          await client.query("rollback");
          return NextResponse.json({ message: `Vui lòng nhập ${missingField.label}.` }, { status: 400 });
        }
      }

      const linkedCount = numberFromDb(group.linked_count) || numberFromDb(group.so_luong);
      const isWholeGroup = linkedCount > 0 && selectedAnimalIds.length >= linkedCount;
      if (eventType === "adjustment" && adjustmentType) {
        const missingField = (ADJUSTMENT_REQUIRED_METADATA[adjustmentType] ?? []).find((field) => !metadataString(baseMetadata, field.key, 700));
        if (missingField) {
          await client.query("rollback");
          return NextResponse.json({ message: `Vui lòng nhập ${missingField.label}.` }, { status: 400 });
        }
        if (adjustmentType === "add_animals" && (parseNumber(body.numericValue) ?? 0) <= 0) {
          await client.query("rollback");
          return NextResponse.json({ message: "Vui lòng nhập số lượng thêm." }, { status: 400 });
        }
        if (adjustmentType === "archive_group" && !isWholeGroup) {
          await client.query("rollback");
          return NextResponse.json({ message: "Vui lòng chọn toàn bộ cá thể khi lưu trữ nhóm." }, { status: 400 });
        }
      }

      if (eventType === "health") {
        if (!healthType) {
          await client.query("rollback");
          return NextResponse.json({ message: "Vui lòng chọn loại sự kiện sức khỏe." }, { status: 400 });
        }
        const missingField = (HEALTH_REQUIRED_METADATA[healthType] ?? []).find((field) => !metadataString(baseMetadata, field.key, 700));
        if (missingField) {
          await client.query("rollback");
          return NextResponse.json({ message: `Vui lòng nhập ${missingField.label}.` }, { status: 400 });
        }
      }

      if (eventType === "weight") {
        if (!weightSource) {
          await client.query("rollback");
          return NextResponse.json({ message: "Vui lòng chọn nguồn cân nặng." }, { status: 400 });
        }
        if (weightRecords.length === 0) {
          await client.query("rollback");
          return NextResponse.json({ message: "Vui lòng nhập cân nặng riêng cho ít nhất một cá thể." }, { status: 400 });
        }
        if (weightRecords.length !== selectedAnimalIds.length) {
          await client.query("rollback");
          return NextResponse.json({ message: "Một số cá thể chưa có cân nặng hợp lệ." }, { status: 400 });
        }
      }
      const eventDestinationZoneId =
        eventType === "move"
          ? moveNeedsDestination ? destinationZoneId : null
          : eventType === "adjustment" ? null : destinationZoneId;
      const eventDate = dateOrNull(body.eventDate) ?? new Date().toISOString().slice(0, 10);
      const eventId = randomUUID();
      const eventCode = makeEventCode(eventType);
      const title = cleanString(body.title, 180) ?? typeOption.defaultTitle;
      const requestedNumericValue = eventType === "weight" ? averageWeight : parseNumber(body.numericValue);
      const numericValue =
        eventType === "adjustment" && adjustmentType !== "add_animals"
          ? selectedAnimalIds.length
          : requestedNumericValue;
      const unit = eventType === "adjustment" ? "con" : cleanString(body.unit, 40) ?? typeOption.defaultUnit ?? null;
      const metadata = {
        ...baseMetadata,
        ...(adjustmentType
          ? {
              adjustmentType,
            }
          : {}),
        ...(healthType
          ? {
              healthType,
              healthCategory: HEALTH_CATEGORIES[healthType],
            }
          : {}),
        ...(weightSource
          ? {
              weightSource,
              weightCount: weightRecords.length,
              averageWeight,
            }
          : {}),
        ...(movementType
          ? {
              movementType,
              movementScope: movementNeedsFarmDestination(movementType) ? "on_farm" : "off_farm",
            }
          : {}),
        selectedAnimalCount: selectedAnimalIds.length,
        wholeGroup: isWholeGroup ? "yes" : "no",
      };

      await client.query(
        `insert into du_lieu.su_kien_vat_nuoi (
          id, trang_trai_id, nhom_vat_nuoi_id, khu_vuc_nguon_id, khu_vuc_dich_id,
          ma_su_kien, loai_su_kien, tieu_de, ngay_su_kien, pham_vi_su_kien,
          so_luong_vat_nuoi, gia_tri_so, don_vi, nguoi_thuc_hien, ngay_nhac_lai, ghi_chu, metadata_json
        )
        values (
          $1,$2,$3::uuid,$4::uuid,$5::uuid,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17::jsonb
        )`,
        [
          eventId,
          group.trang_trai_id,
          groupId,
          sourceZoneId,
          eventDestinationZoneId,
          eventCode,
          eventType,
          title,
          eventDate,
          isWholeGroup ? "nhom" : "ca_the",
          selectedAnimalIds.length,
          numericValue,
          unit,
          actorName,
          dateOrNull(body.followUpDate),
          cleanString(body.note, 2000),
          JSON.stringify(metadata),
        ]
      );

      if (eventType === "weight") {
        const weightRecordJson = JSON.stringify(weightRecords.map((record) => ({
          animal_id: record.animalId,
          value: record.value,
        })));
        await client.query(
          `insert into du_lieu.su_kien_vat_nuoi_ca_the (su_kien_id, vat_nuoi_id, gia_tri_so, don_vi, metadata_json)
           select $1::uuid, item.animal_id::uuid, item.value, $3::text,
                  jsonb_build_object('weightSource', $4::text)
           from jsonb_to_recordset($2::jsonb) as item(animal_id text, value numeric)`,
          [eventId, weightRecordJson, unit, weightSource]
        );
      } else {
        await client.query(
          `insert into du_lieu.su_kien_vat_nuoi_ca_the (su_kien_id, vat_nuoi_id)
           select $1::uuid, animal_id::uuid
           from unnest($2::text[]) as selected(animal_id)`,
          [eventId, selectedAnimalIds]
        );
      }

      if (eventType === "adjustment" && adjustmentType) {
        if (adjustmentType === "add_animals") {
          await client.query(
            `update du_lieu.vat_nuoi
                set trang_thai = coalesce(nullif(trang_thai, ''), 'Đang nuôi'),
                    metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object('lastAdjustmentEventId', $1::text, 'lastAdjustmentType', $4::text),
                    updated_at = now()
              where id::text = any($2::text[]) and trang_trai_id = $3`,
            [eventId, selectedAnimalIds, group.trang_trai_id, adjustmentType]
          );
        }

        if (adjustmentType === "archive_animals" || adjustmentType === "archive_group" || adjustmentType === "remove_animals") {
          const nextStatus = adjustmentType === "remove_animals" ? "Đã loại bỏ" : "Đã lưu trữ";
          await client.query(
            `update du_lieu.vat_nuoi
                set trang_thai = $1,
                    metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object('lastAdjustmentEventId', $2::text, 'lastAdjustmentType', $5::text),
                    updated_at = now()
              where id::text = any($3::text[]) and trang_trai_id = $4`,
            [nextStatus, eventId, selectedAnimalIds, group.trang_trai_id, adjustmentType]
          );

          if (adjustmentType === "archive_group") {
            await client.query(
              `update du_lieu.nhom_vat_nuoi
                  set trang_thai_suc_khoe = 'Đã lưu trữ',
                      metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object('lastAdjustmentEventId', $3::text, 'lastAdjustmentType', $4::text, 'archivedAt', now()::text),
                      updated_at = now()
                where id::text = $1 and trang_trai_id = $2`,
              [groupId, group.trang_trai_id, eventId, adjustmentType]
            );
          }
        }
      }

      if (eventType === "move") {
        if (moveNeedsDestination && eventDestinationZoneId) {
          await client.query(
            `update du_lieu.vat_nuoi
                set khu_vuc_id = $1::uuid,
                    metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object('lastMoveEventId', $2::text, 'lastMovementType', $5::text),
                    updated_at = now()
              where id::text = any($3::text[]) and trang_trai_id = $4`,
            [eventDestinationZoneId, eventId, selectedAnimalIds, group.trang_trai_id, movementType]
          );

          if (isWholeGroup) {
            await client.query(
              `update du_lieu.nhom_vat_nuoi
                  set khu_vuc_id = $1::uuid,
                      metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object('lastMoveEventId', $4::text, 'lastMovementType', $5::text),
                      updated_at = now()
                where id::text = $2 and trang_trai_id = $3`,
              [eventDestinationZoneId, groupId, group.trang_trai_id, eventId, movementType]
            );
          }
        } else {
          const nextStatus = movementType === "exit_to_holding" ? "Đã xuất khỏi trang trại" : "Đang di chuyển";
          await client.query(
            `update du_lieu.vat_nuoi
                set khu_vuc_id = null,
                    trang_thai = $1,
                    metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object('lastMoveEventId', $2::text, 'lastMovementType', $5::text),
                    updated_at = now()
              where id::text = any($3::text[]) and trang_trai_id = $4`,
            [nextStatus, eventId, selectedAnimalIds, group.trang_trai_id, movementType]
          );

          if (isWholeGroup) {
            await client.query(
              `update du_lieu.nhom_vat_nuoi
                  set khu_vuc_id = null,
                      metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object('lastMoveEventId', $3::text, 'lastMovementType', $4::text, 'movementStatus', $5::text),
                      updated_at = now()
                where id::text = $1 and trang_trai_id = $2`,
              [groupId, group.trang_trai_id, eventId, movementType, nextStatus]
            );
          }
        }
      }

      if (eventType === "health") {
        const nextStatus = healthType && HEALTH_CATEGORIES[healthType] === "clinical" ? "Cần chú ý" : "Đang theo dõi";
        await client.query(
          `update du_lieu.vat_nuoi
              set trang_thai = $1,
                  metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object('lastCareEventId', $2::text, 'lastHealthType', $5::text),
                  updated_at = now()
            where id::text = any($3::text[]) and trang_trai_id = $4`,
          [nextStatus, eventId, selectedAnimalIds, group.trang_trai_id, healthType]
        );

        if (isWholeGroup) {
          await client.query(
            `update du_lieu.nhom_vat_nuoi
                set trang_thai_suc_khoe = $1,
                    updated_at = now()
              where id::text = $2 and trang_trai_id = $3`,
            [nextStatus, groupId, group.trang_trai_id]
          );
        }
      }

      if (eventType === "weight" && weightRecords.length > 0) {
        const weightRecordJson = JSON.stringify(weightRecords.map((record) => ({
          animal_id: record.animalId,
          value: record.value,
        })));
        await client.query(
          `update du_lieu.vat_nuoi v
              set metadata_json = coalesce(v.metadata_json, '{}'::jsonb) || jsonb_build_object(
                    'lastWeight', jsonb_build_object('value', item.value, 'unit', $2::text, 'date', $3::text, 'eventId', $4::text, 'source', $5::text)
                  ),
                  updated_at = now()
            from jsonb_to_recordset($1::jsonb) as item(animal_id text, value numeric)
            where v.id::text = item.animal_id and v.trang_trai_id = $6`,
          [weightRecordJson, unit, eventDate, eventId, weightSource, group.trang_trai_id]
        );
      }

      await client.query("commit");
      return NextResponse.json({
        message: "Đã ghi nhận sự kiện vật nuôi.",
        eventId,
        eventCode,
        selectedAnimalCount: selectedAnimalIds.length,
      });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json({ message: "Không thể ghi nhận sự kiện vật nuôi.", error: String(error) }, { status: 500 });
  }
}
