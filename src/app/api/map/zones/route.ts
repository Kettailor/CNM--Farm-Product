import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { layOwnerIdTuServerCookie } from "@/lib/auth";

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
    };
    resources?: ZonePayload["resources"];
  } | null;
};

const toZone = (row: ZoneRow) => {
  const b = row.hinh_hoc_geojson ?? {};
  const dbStatus = String(row.trang_thai ?? "").toLowerCase();
  const geo = b.geo ?? {};
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
      usage: String(b.metadata?.usage ?? row.loai_khu_vuc ?? ""),
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


async function getOwnerFarmId() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) return null;

  const rs = await db.query(
    `select id
     from du_lieu.trang_trai
     where chu_so_huu_id = $1
     order by created_at desc
     limit 1`,
    [ownerId]
  );

  return rs.rows[0]?.id as string | undefined;
}

export async function GET() {
  try {
    const farmId = await getOwnerFarmId();
    if (!farmId) return NextResponse.json({ zones: [] });

    const rs = await db.query("select * from du_lieu.khu_vuc where trang_trai_id = $1 order by created_at asc", [farmId]);
    return NextResponse.json({ zones: rs.rows.map(toZone) });
  } catch (error) {
    return NextResponse.json({ message: "Không thể kết nối dữ liệu map từ PostgreSQL.", error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const zone = (await request.json()) as ZonePayload;

  try {
    const farmId = await getOwnerFarmId();
    if (!farmId) {
      return NextResponse.json({ message: "Không tìm thấy trang trại của tài khoản hiện tại." }, { status: 404 });
    }

    const existingName = await db.query(
      `select id from du_lieu.khu_vuc where trang_trai_id = $1 and lower(trim(ten_khu_vuc)) = lower(trim($2)) limit 1`,
      [farmId, zone.name]
    );
    if (existingName.rows[0]?.id) {
      return NextResponse.json({ message: `Tên ô "${zone.name}" đã tồn tại. Vui lòng đặt tên khác.` }, { status: 409 });
    }

    const q = `insert into du_lieu.khu_vuc(trang_trai_id,ma_khu_vuc,ten_khu_vuc,dien_tich_ha,mo_ta,mau_sac,hinh_hoc_geojson,trang_thai)
               values($1,$2,$3,$4,$5,$6,$7,$8) returning *`;
    const vals = [farmId, zone.code, zone.name, zone.metadata.areaHecta, zone.metadata.notes || zone.metadata.usage || null, null, { geo: zone.geo, metadata: zone.metadata, resources: zone.resources }, zone.status === "cancelled" ? "inactive" : (zone.status === "critical" ? "maintenance" : zone.status === "warning" ? "draft" : "active")];

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
  const farmId = await getOwnerFarmId();
  if (!farmId) return NextResponse.json({ message: "Không tìm thấy trang trại của tài khoản hiện tại." }, { status: 404 });

  const q = `update du_lieu.khu_vuc
             set ten_khu_vuc=$3, dien_tich_ha=$4, mo_ta=$5, hinh_hoc_geojson=$6, trang_thai=$7
             where id=$1 and trang_trai_id=$2
             returning *`;
  const vals = [zone.id, farmId, zone.name, zone.metadata.areaHecta, zone.metadata.notes || zone.metadata.usage || null, { geo: zone.geo, metadata: zone.metadata, resources: zone.resources }, zone.status === "cancelled" ? "inactive" : (zone.status === "critical" ? "maintenance" : zone.status === "warning" ? "draft" : "active")];
  const rs = await db.query(q, vals);
  return NextResponse.json({ zone: rs.rows[0] ? toZone(rs.rows[0]) : null });
}

export async function DELETE(request: NextRequest) {
  const { id } = (await request.json()) as { id: string };
  const farmId = await getOwnerFarmId();
  if (!farmId) return NextResponse.json({ message: "Không tìm thấy trang trại của tài khoản hiện tại." }, { status: 404 });

  const rs = await db.query("select hinh_hoc_geojson from du_lieu.khu_vuc where id = $1 and trang_trai_id = $2 limit 1", [id, farmId]);
  const currentBoundary = rs.rows[0]?.hinh_hoc_geojson ?? {};
  const nextBoundary = { ...currentBoundary, status: "cancelled" };

  await db.query(
    "update du_lieu.khu_vuc set trang_thai = 'inactive', hinh_hoc_geojson = $3 where id = $1 and trang_trai_id = $2",
    [id, farmId, nextBoundary]
  );
  return NextResponse.json({ ok: true, softDeleted: true });
}

