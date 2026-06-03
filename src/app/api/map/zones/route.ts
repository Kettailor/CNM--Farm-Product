import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getAccessibleFarmId, type FarmAccessAction } from "@/lib/farm-access";
import { getZoneTypeInfo, normalizeText, type ZoneTypeKey } from "@/lib/zone-type-utils";

export const dynamic = "force-dynamic";

type ZonePayload = {
  id?: string;
  name: string;
  code: string;
  status: "healthy" | "warning" | "critical" | "cancelled";
  occupancy: number;
  coverage: string;
  geo: {
    lat: number;
    lng: number;
    latSpan: number;
    lngSpan: number;
    polygon?: Array<{ lat: number; lng: number }>;
    bounds?: { south: number; west: number; north: number; east: number };
  };
  metadata: {
    areaHecta: number;
    kind?: string;
    areaType?: string;
    usage: string;
    soilType: string;
    waterSource: string;
    manager: string;
    plantingStatus: string;
    priority: "low" | "medium" | "high";
    notes: string;
    farmType: "cattle" | "sheep" | "pig" | "poultry" | "crop";
    shapeRatio: number;
    rotationDeg: number;
    NDVI?: number;
    EVI?: number;
    NDMI?: number;
    NDWI?: number;
    SAVI?: number;
    NDSI?: number;
    warehouseTypes?: unknown;
    storageGroups?: unknown;
    extra?: {
      warehouseTypes?: unknown;
    };
  };
  resources: Array<{ id: string; type: string; name: string; status: string; lastSeen: string; quantity: number }>;
};

type GeoPoint = { lat?: number | string; lng?: number | string };
type GeoBounds = { south?: number | string; west?: number | string; north?: number | string; east?: number | string };
type ZoneRow = {
  id: string | number;
  ten_khu_vuc?: string | null;
  ma_khu_vuc?: string | null;
  trang_thai?: string | null;
  dien_tich_ha?: number | string | null;
  tam_vi_do?: number | string | null;
  tam_kinh_do?: number | string | null;
  loai_khu_vuc?: string | null;
  mo_ta?: string | null;
  hinh_hoc_geojson?: {
    geo?: {
      lat?: number | string;
      lng?: number | string;
      latSpan?: number | string;
      lngSpan?: number | string;
      polygon?: GeoPoint[];
      bounds?: GeoBounds;
    };
    metadata?: {
      occupancy?: number | string;
      coverage?: string;
      areaHecta?: number | string;
      kind?: string;
      areaType?: string;
      usage?: string;
      soilType?: string;
      waterSource?: string;
      manager?: string;
      plantingStatus?: string;
      priority?: ZonePayload["metadata"]["priority"];
      notes?: string;
      farmType?: ZonePayload["metadata"]["farmType"];
      shapeRatio?: number | string;
      rotationDeg?: number | string;
      warehouseTypes?: unknown;
      storageGroups?: unknown;
      extra?: {
        warehouseTypes?: unknown;
      };
    };
    resources?: ZonePayload["resources"];
  } | null;
};

const zoneKindForDb = (value: unknown): ZoneTypeKey | null => {
  const raw = normalizeText(value);
  if (raw.includes("parking") || raw.includes("bai do xe") || raw.includes("phuong tien") || raw.includes("vehicle")) return "parking";
  if (raw.includes("storage") || raw.includes("warehouse") || raw.includes("nha kho") || raw.includes("kho") || raw.includes("dung cu") || raw.includes("cong cu") || raw.includes("tool")) return "storage";
  if (raw.includes("livestock") || raw.includes("chan nuoi") || raw.includes("vat nuoi") || raw.includes("cattle")) return "livestock";
  if (raw.includes("pasture") || raw.includes("grazing") || raw.includes("dong co") || raw.includes("chan tha") || raw.includes("hay") || raw.includes("co kho")) return "grazing";
  if (raw.includes("water") || raw.includes("nguon nuoc") || raw.includes("nguon_nuoc")) return "water";
  if (raw.includes("cropping") || raw.includes("crop") || raw.includes("trong trot") || raw.includes("cay trong") || raw.includes("resting") || raw.includes("nghi dat")) return "cropping";
  return null;
};

const warehouseTypesFromMetadata = (metadata?: NonNullable<ZoneRow["hinh_hoc_geojson"]>["metadata"]) =>
  metadata?.warehouseTypes ?? metadata?.storageGroups ?? metadata?.extra?.warehouseTypes;

const zoneTypeLabel = (metadata: NonNullable<ZoneRow["hinh_hoc_geojson"]>["metadata"] | undefined, dbType: unknown) => {
  const raw = dbType ?? metadata?.kind ?? metadata?.areaType ?? metadata?.usage ?? metadata?.farmType;
  const kind = zoneKindForDb(raw);
  return kind ? getZoneTypeInfo(kind, warehouseTypesFromMetadata(metadata)).label : String(raw ?? "");
};

const toZone = (row: ZoneRow) => {
  const b = row.hinh_hoc_geojson ?? {};
  const dbStatus = String(row.trang_thai ?? "").toLowerCase();
  const geo = b.geo ?? {};
  const usageLabel = zoneTypeLabel(b.metadata, row.loai_khu_vuc);
  const polygon = Array.isArray(geo.polygon)
    ? geo.polygon
        .filter((p): p is GeoPoint => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)))
        .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
    : [];
  return {
    id: String(row.id),
    name: String(row.ten_khu_vuc ?? ""),
    code: String(row.ma_khu_vuc ?? row.id ?? ""),
    status: (dbStatus === "inactive" ? "cancelled" : dbStatus === "maintenance" ? "critical" : dbStatus === "draft" ? "warning" : "healthy") as ZonePayload["status"],
    occupancy: Number(b.metadata?.occupancy ?? 0),
    coverage: String(b.metadata?.coverage ?? `${Number(row.dien_tich_ha ?? 0).toFixed(1)} ha`),
    geo: {
      lat: Number(geo.lat ?? row.tam_vi_do ?? 10.8216),
      lng: Number(geo.lng ?? row.tam_kinh_do ?? 106.6295),
      latSpan: Number(geo.latSpan ?? 0.0015),
      lngSpan: Number(geo.lngSpan ?? 0.0018),
      polygon,
      bounds: geo.bounds
        ? {
            south: Number(geo.bounds.south ?? 0),
            west: Number(geo.bounds.west ?? 0),
            north: Number(geo.bounds.north ?? 0),
            east: Number(geo.bounds.east ?? 0),
          }
        : undefined,
    },
    metadata: {
      areaHecta: Number(row.dien_tich_ha ?? b.metadata?.areaHecta ?? 1),
      usage: usageLabel,
      soilType: String(b.metadata?.soilType ?? ""),
      waterSource: String(b.metadata?.waterSource ?? ""),
      manager: String(b.metadata?.manager ?? ""),
      plantingStatus: String(b.metadata?.plantingStatus ?? row.mo_ta ?? ""),
      priority: (b.metadata?.priority ?? "medium") as ZonePayload["metadata"]["priority"],
      notes: String(b.metadata?.notes ?? row.mo_ta ?? ""),
      farmType: (b.metadata?.farmType ?? "crop") as ZonePayload["metadata"]["farmType"],
      shapeRatio: Number(b.metadata?.shapeRatio ?? 1.4),
      rotationDeg: Number(b.metadata?.rotationDeg ?? 0),
    },
    resources: Array.isArray(b.resources) ? b.resources : [],
  };
};


async function getOwnerFarmId(action: FarmAccessAction = "read") {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) return null;
  return getAccessibleFarmId(ownerId, action);
}

export async function GET() {
  try {
    const farmId = await getOwnerFarmId("read");
    if (!farmId) return NextResponse.json({ zones: [] });

    const rs = await db.query(
      "select * from du_lieu.khu_vuc where trang_trai_id = $1 and coalesce(lower(trang_thai), '') not in ('da_huy', 'da huy', 'đã hủy', 'dã hủy', 'cancelled') order by created_at asc",
      [farmId]
    );
    return NextResponse.json({ zones: rs.rows.map(toZone) });
  } catch (error) {
    return NextResponse.json({ message: "Không thể kết nối dữ liệu map từ PostgreSQL.", error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const zone = (await request.json()) as ZonePayload;

  try {
    const farmId = await getOwnerFarmId("write");
    if (!farmId) {
      return NextResponse.json({ message: "Không có quyền tạo khu mới." }, { status: 403 });
    }

    const existingName = await db.query(
      `select id from du_lieu.khu_vuc where trang_trai_id = $1 and lower(trim(ten_khu_vuc)) = lower(trim($2)) limit 1`,
      [farmId, zone.name]
    );
    if (existingName.rows[0]?.id) {
      return NextResponse.json({ message: `Tên ô "${zone.name}" đã tồn tại. Vui lòng đặt tên khác.` }, { status: 409 });
    }

    const zoneKind = zoneKindForDb(zone.metadata.usage ?? zone.metadata.farmType);
    const boundary = {
      geo: zone.geo,
      metadata: { ...zone.metadata, kind: zoneKind ?? zone.metadata.kind },
      resources: zone.resources,
    };
    const q = `insert into du_lieu.khu_vuc(trang_trai_id,ma_khu_vuc,ten_khu_vuc,dien_tich_ha,mo_ta,mau_sac,hinh_hoc_geojson,trang_thai,loai_khu_vuc)
               values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`;
    const vals = [farmId, zone.code, zone.name, zone.metadata.areaHecta, zone.metadata.notes || zone.metadata.usage || null, null, boundary, zone.status === "cancelled" ? "inactive" : (zone.status === "critical" ? "maintenance" : zone.status === "warning" ? "draft" : "active"), zoneKind];

    const rs = await db.query(q, vals);
    return NextResponse.json({ zone: toZone(rs.rows[0] as ZoneRow) });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "23505") {
      return NextResponse.json({ message: `Mã khu ${zone.code} đã tồn tại. Vui lòng thử lại.` }, { status: 409 });
    }

    return NextResponse.json({ message: "Không thể tạo khu mới." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const zone = (await request.json()) as ZonePayload;
  const farmId = await getOwnerFarmId("write");
  if (!farmId) return NextResponse.json({ message: "Không có quyền cập nhật khu vực." }, { status: 403 });

  const zoneKind = zoneKindForDb(zone.metadata.usage ?? zone.metadata.farmType);
  const boundary = {
    geo: zone.geo,
    metadata: { ...zone.metadata, kind: zoneKind ?? zone.metadata.kind },
    resources: zone.resources,
  };
  const q = `update du_lieu.khu_vuc
             set ten_khu_vuc=$3, dien_tich_ha=$4, mo_ta=$5, hinh_hoc_geojson=$6, trang_thai=$7, loai_khu_vuc=coalesce($8::text, loai_khu_vuc)
             where id=$1 and trang_trai_id=$2
             returning *`;
  const vals = [zone.id, farmId, zone.name, zone.metadata.areaHecta, zone.metadata.notes || zone.metadata.usage || null, boundary, zone.status === "cancelled" ? "inactive" : (zone.status === "critical" ? "maintenance" : zone.status === "warning" ? "draft" : "active"), zoneKind];
  const rs = await db.query(q, vals);
  return NextResponse.json({ zone: rs.rows[0] ? toZone(rs.rows[0]) : null });
}

export async function DELETE(request: NextRequest) {
  const { id } = (await request.json()) as { id: string };
  const farmId = await getOwnerFarmId("write");
  if (!farmId) return NextResponse.json({ message: "Không có quyền xóa khu vực." }, { status: 403 });

  const rs = await db.query("select hinh_hoc_geojson from du_lieu.khu_vuc where id = $1 and trang_trai_id = $2 limit 1", [id, farmId]);
  const currentBoundary = rs.rows[0]?.hinh_hoc_geojson ?? {};
  const nextBoundary = { ...currentBoundary, status: "cancelled" };

  await db.query(
    "update du_lieu.khu_vuc set trang_thai = 'inactive', hinh_hoc_geojson = $3 where id = $1 and trang_trai_id = $2",
    [id, farmId, nextBoundary]
  );
  return NextResponse.json({ ok: true, softDeleted: true });
}

