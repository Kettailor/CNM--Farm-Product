import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { layOwnerIdTuRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleFarmId } from "@/lib/farm-access";
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
  ma_nhom: string | null;
  ten_nhom: string | null;
  loai_vat_nuoi: string | null;
  mo_ta: string | null;
  cach_tao: string | null;
  giong: string | null;
  gioi_tinh: string | null;
  giai_doan_sinh_truong: string | null;
  trang_thai_suc_khoe: string | null;
  muc_dich_san_xuat: string | null;
  ghi_chu_dan: string | null;
  nguon_goc: string | null;
  gia_tri_mua: number | string | null;
  tai_khoan_chi_phi: string | null;
  ngay_sinh: string | Date | null;
  kieu_thu_thai: string | null;
  trong_luong_so_sinh_kg: number | string | null;
  ghi_chu_sinh: string | null;
  van_de_suc_khoe: string | null;
  ma_me: string | null;
  ma_bo: string | null;
  mau_long: string | null;
  mau_mat: string | null;
  kieu_tai: string | null;
  kieu_sung: string | null;
  tinh_trang_mieng: string | null;
  diem_the_trang: number | string | null;
  ghi_chu_dac_diem: string | null;
  nhan_dien_chinh: string | null;
  trang_thai_sinh_san: string | null;
  kha_nang_sinh_san: string | null;
  tang_trong_binh_quan_ngay: number | string | null;
  nang_luong_megajoule_ngay: number | string | null;
  trong_luong_muc_tieu_kg: number | string | null;
  ngay_can_muc_tieu: string | Date | null;
  metadata_json: Record<string, unknown> | null;
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

const ADJUSTMENT_TYPES = ["deceased_animals", "deceased_group"] as const;

type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

const ADJUSTMENT_REQUIRED_METADATA: Partial<Record<AdjustmentType, { key: string; label: string }[]>> = {};

const GROUPING_ACTIONS = ["split_group", "merge_group"] as const;

type GroupingAction = (typeof GROUPING_ACTIONS)[number];

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

type GroupDeathCountRow = {
  total_count: number | string | null;
  deceased_count: number | string | null;
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
  return ADJUSTMENT_TYPES.includes(text as AdjustmentType) ? (text as AdjustmentType) : "deceased_animals";
}

function normalizeGroupingAction(value: unknown): GroupingAction | null {
  const text = cleanString(value, 80);
  if (GROUPING_ACTIONS.includes(text as GroupingAction)) return text as GroupingAction;
  if (text === "tach_nhom" || text?.toLowerCase() === "tách nhóm") return "split_group";
  if (text === "ghep_nhom" || text?.toLowerCase() === "gộp nhóm" || text?.toLowerCase() === "ghép nhóm") return "merge_group";
  return null;
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

function makeSplitGroupCode(sourceCode: string | null) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const base = (sourceCode ?? "NHOM").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40) || "NHOM";
  return `${base}-TACH-${today}-${randomUUID().slice(0, 5).toUpperCase()}`;
}

function numberFromDb(value: number | string | null) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeComparableText(value: unknown) {
  const text = cleanString(value, 240);
  return text ? text.normalize("NFC").toLowerCase() : "";
}

function isSameLivestockType(sourceType: unknown, targetType: unknown) {
  const source = normalizeComparableText(sourceType);
  const target = normalizeComparableText(targetType);
  return Boolean(source && target && source === target);
}

function objectMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function groupSnapshot(group: GroupRow) {
  return {
    groupId: group.id,
    groupCode: group.ma_nhom,
    groupName: group.ten_nhom,
    species: group.loai_vat_nuoi,
    description: group.mo_ta,
    createFrom: group.cach_tao,
    breed: group.giong,
    gender: group.gioi_tinh,
    lifeStage: group.giai_doan_sinh_truong,
    healthStatus: group.trang_thai_suc_khoe,
    purpose: group.muc_dich_san_xuat,
    herdNotes: group.ghi_chu_dan,
    origin: group.nguon_goc,
    birthDate: group.ngay_sinh,
    maternityId: group.ma_me,
    paternityId: group.ma_bo,
    colouring: group.mau_long,
    reproductiveState: group.trang_thai_sinh_san,
    primaryIdentification: group.nhan_dien_chinh,
    targetLiveWeight: group.trong_luong_muc_tieu_kg,
    targetWeightDate: group.ngay_can_muc_tieu,
  };
}

async function loadOwnedGroup(client: PoolClient, farmId: string, groupId: string) {
  const groupRs = await client.query<GroupRow>(
    `select n.id::text, n.trang_trai_id::text, n.khu_vuc_id::text,
            n.ma_nhom, n.ten_nhom, n.loai_vat_nuoi, n.mo_ta, n.cach_tao, n.giong,
            n.gioi_tinh, n.giai_doan_sinh_truong, n.trang_thai_suc_khoe,
            n.muc_dich_san_xuat, n.ghi_chu_dan, n.nguon_goc, n.gia_tri_mua,
            n.tai_khoan_chi_phi, n.ngay_sinh, n.kieu_thu_thai,
            n.trong_luong_so_sinh_kg, n.ghi_chu_sinh, n.van_de_suc_khoe,
            n.ma_me, n.ma_bo, n.mau_long, n.mau_mat, n.kieu_tai, n.kieu_sung,
            n.tinh_trang_mieng, n.diem_the_trang, n.ghi_chu_dac_diem,
            n.nhan_dien_chinh, n.trang_thai_sinh_san, n.kha_nang_sinh_san,
            n.tang_trong_binh_quan_ngay, n.nang_luong_megajoule_ngay,
            n.trong_luong_muc_tieu_kg, n.ngay_can_muc_tieu, n.metadata_json,
            n.so_luong,
            (select count(*)::int from du_lieu.vat_nuoi v where v.nhom_vat_nuoi_id = n.id) as linked_count
     from du_lieu.nhom_vat_nuoi n
     where n.id::text = $1 and n.trang_trai_id::text = $2
       and coalesce(lower(n.loai_vat_nuoi), '') not in ('cá', 'ca', 'fish')
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

async function syncGroupHeadCount(client: PoolClient, farmId: string, groupId: string) {
  const countRs = await client.query<{ total_count: number | string | null }>(
    `select count(*)::int as total_count
       from du_lieu.vat_nuoi
      where trang_trai_id = $1 and nhom_vat_nuoi_id::text = $2`,
    [farmId, groupId]
  );
  const totalCount = numberFromDb(countRs.rows[0]?.total_count ?? null);
  await client.query(
    `update du_lieu.nhom_vat_nuoi
        set so_luong = $3,
            updated_at = now()
      where id::text = $1 and trang_trai_id = $2`,
    [groupId, farmId, totalCount]
  );
  return totalCount;
}

async function loadCurrentUserName(client: PoolClient, ownerId: string) {
  try {
    const rs = await client.query<{ name: string | null }>(
      `select coalesce(
          (select nullif(ho_ten, '') from du_lieu.nguoi_dung where id::text = $1 limit 1),
          (select nullif(email, '') from du_lieu.nguoi_dung where id::text = $1 limit 1),
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
    const farmId = await getAccessibleFarmId(ownerId, "write");
    if (!farmId) return NextResponse.json({ message: "Không có quyền ghi sự kiện vật nuôi." }, { status: 403 });

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
    const groupingAction = eventType === "grouping" ? normalizeGroupingAction(baseMetadata.groupingAction) : null;
    const submittedWeightRecords = eventType === "weight" ? normalizeWeightRecords(body.animalWeights) : [];
    const requestedAnimalIds = eventType === "weight" ? submittedWeightRecords.map((record) => record.animalId) : normalizeAnimalIds(body.animalIds);
    if (requestedAnimalIds.length === 0) {
      return NextResponse.json({ message: "Vui lòng chọn ít nhất một cá thể để ghi sự kiện." }, { status: 400 });
    }

    const client = await db.connect();
    try {
      await client.query("begin");

      const group = await loadOwnedGroup(client, farmId, groupId);
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
        if (adjustmentType === "deceased_group" && !isWholeGroup) {
          await client.query("rollback");
          return NextResponse.json({ message: "Vui lòng chọn toàn bộ cá thể khi đánh dấu cả nhóm tử vong." }, { status: 400 });
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

      let groupingTargetGroup: GroupRow | null = null;
      let groupingTargetGroupId: string | null = null;
      let groupingTargetGroupName: string | null = null;
      let groupingDestinationZoneId: string | null = null;
      let splitNewGroupId: string | null = null;

      if (eventType === "grouping") {
        if (!groupingAction) {
          await client.query("rollback");
          return NextResponse.json({ message: "Vui lòng chọn tác vụ tách nhóm hoặc gộp nhóm." }, { status: 400 });
        }

        if (groupingAction === "split_group") {
          if (isWholeGroup) {
            await client.query("rollback");
            return NextResponse.json({ message: "Tách nhóm cần giữ lại ít nhất một cá thể trong nhóm hiện tại." }, { status: 400 });
          }

          const newGroupName = metadataString(baseMetadata, "newGroupName", 180);
          if (!newGroupName) {
            await client.query("rollback");
            return NextResponse.json({ message: "Vui lòng nhập tên nhóm mới." }, { status: 400 });
          }

          splitNewGroupId = randomUUID();
          const splitZoneId = destinationZoneId ?? sourceZoneId;
          const newGroupCode = makeSplitGroupCode(group.ma_nhom);
          groupingTargetGroupId = splitNewGroupId;
          groupingTargetGroupName = newGroupName;
          groupingDestinationZoneId = splitZoneId;
          const splitGroupMetadata = JSON.stringify({
            ...objectMetadata(group.metadata_json),
            createdFrom: "split_group_event",
            sourceGroupId: group.id,
            sourceGroupCode: group.ma_nhom,
            selectedAnimalCount: selectedAnimalIds.length,
            sourceGroupSnapshot: groupSnapshot(group),
          });

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
              $1,$2,$3::uuid,$4,$5,$6,$7,$8,
              $9,$10,$11,$12,$13,
              $14,$15,$16,$17,$18,
              $19,$20,$21,$22,$23,
              $24,$25,$26,$27,$28,$29,$30,
              $31,$32,$33,$34,
              $35,$36,$37,
              $38,$39,$40::jsonb
            )`,
            [
              splitNewGroupId,
              group.trang_trai_id,
              splitZoneId,
              newGroupCode,
              newGroupName,
              cleanString(group.loai_vat_nuoi, 120) ?? "Vật nuôi",
              group.mo_ta,
              group.cach_tao,
              group.giong,
              selectedAnimalIds.length,
              group.gioi_tinh,
              group.giai_doan_sinh_truong,
              group.trang_thai_suc_khoe ?? "Đang theo dõi",
              group.muc_dich_san_xuat,
              group.ghi_chu_dan,
              group.nguon_goc,
              group.gia_tri_mua,
              group.tai_khoan_chi_phi,
              group.ngay_sinh,
              group.kieu_thu_thai,
              group.trong_luong_so_sinh_kg,
              group.ghi_chu_sinh,
              group.van_de_suc_khoe,
              group.ma_me,
              group.ma_bo,
              group.mau_long,
              group.mau_mat,
              group.kieu_tai,
              group.kieu_sung,
              group.tinh_trang_mieng,
              group.diem_the_trang,
              group.ghi_chu_dac_diem,
              group.nhan_dien_chinh,
              group.trang_thai_sinh_san,
              group.kha_nang_sinh_san,
              group.tang_trong_binh_quan_ngay,
              group.nang_luong_megajoule_ngay,
              group.trong_luong_muc_tieu_kg,
              group.ngay_can_muc_tieu,
              splitGroupMetadata,
            ]
          );
        }

        if (groupingAction === "merge_group") {
          const targetGroupId = metadataString(baseMetadata, "targetGroupId", 80) ?? metadataString(baseMetadata, "targetGroup", 80);
          if (!targetGroupId) {
            await client.query("rollback");
            return NextResponse.json({ message: "Vui lòng chọn nhóm đích để gộp." }, { status: 400 });
          }
          if (targetGroupId === groupId) {
            await client.query("rollback");
            return NextResponse.json({ message: "Nhóm đích phải khác nhóm nguồn." }, { status: 400 });
          }

          groupingTargetGroup = await loadOwnedGroup(client, group.trang_trai_id, targetGroupId);
          if (!groupingTargetGroup) {
            await client.query("rollback");
            return NextResponse.json({ message: "Không tìm thấy nhóm đích hoặc không có quyền gộp nhóm." }, { status: 404 });
          }
          if (!isSameLivestockType(group.loai_vat_nuoi, groupingTargetGroup.loai_vat_nuoi)) {
            await client.query("rollback");
            return NextResponse.json({ message: "Chỉ được gộp các nhóm cùng loại vật nuôi." }, { status: 400 });
          }

          groupingTargetGroupId = groupingTargetGroup.id;
          groupingTargetGroupName = groupingTargetGroup.ten_nhom;
          groupingDestinationZoneId = groupingTargetGroup.khu_vuc_id;
        }
      }

      const eventDestinationZoneId =
        eventType === "move"
          ? moveNeedsDestination ? destinationZoneId : null
          : eventType === "adjustment" ? null : eventType === "grouping" ? groupingDestinationZoneId : destinationZoneId;
      const eventDate = dateOrNull(body.eventDate) ?? new Date().toISOString().slice(0, 10);
      const eventId = randomUUID();
      const eventCode = makeEventCode(eventType);
      const title = cleanString(body.title, 180) ?? typeOption.defaultTitle;
      const requestedNumericValue = eventType === "weight" ? averageWeight : parseNumber(body.numericValue);
      const numericValue = eventType === "adjustment" || eventType === "grouping" ? selectedAnimalIds.length : requestedNumericValue;
      const unit = eventType === "adjustment" || eventType === "grouping" ? "con" : cleanString(body.unit, 40) ?? typeOption.defaultUnit ?? null;
      const metadata = {
        ...baseMetadata,
        ...(adjustmentType
          ? {
              adjustmentType,
              deathDate: eventDate,
              deathScope: adjustmentType === "deceased_group" ? "group" : "animals",
              causeOfDeath: metadataString(baseMetadata, "causeOfDeath", 700),
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
        ...(groupingAction
          ? {
              groupingAction,
              sourceGroupId: groupId,
              targetGroupId: groupingTargetGroupId,
              targetGroupName: groupingTargetGroupName,
              targetZoneId: groupingDestinationZoneId,
              sourceGroupSnapshot: groupSnapshot(group),
              targetGroupSnapshot: groupingTargetGroup ? groupSnapshot(groupingTargetGroup) : null,
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
        await client.query(
          `update du_lieu.vat_nuoi
              set trang_thai = 'Đã tử vong',
                  metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object(
                    'lastAdjustmentEventId', $1::text,
                    'lastAdjustmentType', $4::text,
                    'lastDeathEventId', $1::text,
                    'deathDate', $5::text,
                    'causeOfDeath', $6::text,
                    'deceasedAt', now()::text
                  ),
                  updated_at = now()
            where id::text = any($2::text[]) and trang_trai_id = $3`,
          [
            eventId,
            selectedAnimalIds,
            group.trang_trai_id,
            adjustmentType,
            eventDate,
            metadataString(baseMetadata, "causeOfDeath", 700),
          ]
        );

        const deathCountRs = await client.query<GroupDeathCountRow>(
          `select count(*)::int as total_count,
                  count(*) filter (
                    where coalesce(lower(trang_thai), '') in ('đã tử vong', 'da tu vong', 'deceased', 'dead')
                       or coalesce(metadata_json, '{}'::jsonb) ? 'lastDeathEventId'
                  )::int as deceased_count
             from du_lieu.vat_nuoi
            where nhom_vat_nuoi_id::text = $1 and trang_trai_id = $2`,
          [groupId, group.trang_trai_id]
        );
        const totalInGroup = numberFromDb(deathCountRs.rows[0]?.total_count ?? null);
        const deceasedInGroup = numberFromDb(deathCountRs.rows[0]?.deceased_count ?? null);
        const allAnimalsDeceased = totalInGroup > 0 && deceasedInGroup >= totalInGroup;

        if (allAnimalsDeceased) {
          await client.query(
            `update du_lieu.nhom_vat_nuoi
                set trang_thai_suc_khoe = 'Đã tử vong',
                    metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object(
                      'lastAdjustmentEventId', $3::text,
                      'lastAdjustmentType', $4::text,
                      'lastDeathEventId', $3::text,
                      'deathDate', $5::text,
                      'causeOfDeath', $6::text,
                      'deceasedAt', now()::text
                    ),
                    updated_at = now()
              where id::text = $1 and trang_trai_id = $2`,
            [
              groupId,
              group.trang_trai_id,
              eventId,
              adjustmentType,
              eventDate,
              metadataString(baseMetadata, "causeOfDeath", 700),
            ]
          );
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

      if (eventType === "grouping" && groupingAction && groupingTargetGroupId) {
        await client.query(
          `update du_lieu.vat_nuoi
              set nhom_vat_nuoi_id = $1::uuid,
                  khu_vuc_id = $2::uuid,
                  metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object(
                    'lastGroupingEventId', $5::text,
                    'lastGroupingAction', $6::text,
                    'lastGroupingTargetGroupId', $1::text,
                    'previousGroupId', $7::text,
                    'previousGroupName', $8::text,
                    'previousGroupSnapshot', $9::jsonb,
                    'groupingUpdatedAt', now()::text
                  ),
                  updated_at = now()
            where id::text = any($3::text[]) and trang_trai_id = $4`,
          [
            groupingTargetGroupId,
            groupingDestinationZoneId,
            selectedAnimalIds,
            group.trang_trai_id,
            eventId,
            groupingAction,
            group.id,
            group.ten_nhom,
            JSON.stringify(groupSnapshot(group)),
          ]
        );

        const sourceCount = await syncGroupHeadCount(client, group.trang_trai_id, groupId);
        await syncGroupHeadCount(client, group.trang_trai_id, groupingTargetGroupId);

        await client.query(
          `update du_lieu.nhom_vat_nuoi
              set metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object(
                    'lastGroupingEventId', $3::text,
                    'lastGroupingAction', $4::text,
                    'lastGroupingTargetGroupId', $5::text,
                    'groupingUpdatedAt', now()::text
                  ),
                  updated_at = now()
            where id::text = any($1::text[]) and trang_trai_id = $2`,
          [[groupId, groupingTargetGroupId], group.trang_trai_id, eventId, groupingAction, groupingTargetGroupId]
        );

        if (groupingAction === "merge_group" && sourceCount === 0) {
          await client.query(
            `update du_lieu.nhom_vat_nuoi
                set trang_thai_suc_khoe = 'Đã gộp nhóm',
                    metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object(
                      'mergedIntoGroupId', $3::text,
                      'mergedByEventId', $4::text,
                      'mergedAt', now()::text
                    ),
                    updated_at = now()
              where id::text = $1 and trang_trai_id = $2`,
            [groupId, group.trang_trai_id, groupingTargetGroupId, eventId]
          );
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
        message:
          eventType === "adjustment"
            ? "Đã ghi nhận vật nuôi tử vong."
            : eventType === "grouping"
              ? groupingAction === "split_group" ? "Đã tách nhóm vật nuôi." : "Đã gộp nhóm vật nuôi."
              : "Đã ghi nhận sự kiện vật nuôi.",
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
