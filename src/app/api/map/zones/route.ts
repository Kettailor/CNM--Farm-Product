import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

type ZonePayload = {
  id?: string;
  name: string;
  code: string;
  status: "healthy" | "warning" | "critical";
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

const toZone = (row: any) => {
  const b = row.boundary_geojson ?? {};
  return {
    id: row.id,
    name: row.name,
    code: row.paddock_code,
    status: (b.status ?? "healthy") as ZonePayload["status"],
    occupancy: Number(b.occupancy ?? 0),
    coverage: String(b.coverage ?? `${Number(row.area_ha ?? 0).toFixed(1)} ha`),
    geo: {
      lat: Number(b.geo?.lat ?? 10.8216),
      lng: Number(b.geo?.lng ?? 106.6295),
      latSpan: Number(b.geo?.latSpan ?? 0.0015),
      lngSpan: Number(b.geo?.lngSpan ?? 0.0018),
      polygon: Array.isArray(b.geo?.polygon)
        ? b.geo.polygon.filter((p: any) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))).map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
        : [],
      bounds: b.geo?.bounds
        ? {
            south: Number(b.geo.bounds.south ?? 0),
            west: Number(b.geo.bounds.west ?? 0),
            north: Number(b.geo.bounds.north ?? 0),
            east: Number(b.geo.bounds.east ?? 0),
          }
        : undefined,
    },
    metadata: {
      areaHecta: Number(row.area_ha ?? b.metadata?.areaHecta ?? 1),
      usage: String(b.metadata?.usage ?? row.crop_type ?? ""),
      soilType: String(b.metadata?.soilType ?? ""),
      waterSource: String(b.metadata?.waterSource ?? ""),
      manager: String(b.metadata?.manager ?? ""),
      plantingStatus: String(b.metadata?.plantingStatus ?? row.grazing_status ?? ""),
      priority: (b.metadata?.priority ?? "medium") as ZonePayload["metadata"]["priority"],
      notes: String(b.metadata?.notes ?? row.notes ?? ""),
      farmType: (b.metadata?.farmType ?? "crop") as ZonePayload["metadata"]["farmType"],
      shapeRatio: Number(b.metadata?.shapeRatio ?? 1.4),
      rotationDeg: Number(b.metadata?.rotationDeg ?? 0),
    },
    resources: Array.isArray(b.resources) ? b.resources : [],
  };
};

const toBoundaryGeojson = (z: ZonePayload) => ({
  status: z.status,
  occupancy: z.occupancy,
  coverage: z.coverage,
  geo: z.geo,
  metadata: z.metadata,
  resources: z.resources,
});

async function getOwnerFarmId() {
  const ownerId = cookies().get("ownerId")?.value;
  if (!ownerId) return null;

  const rs = await db.query(
    `select id
     from du_lieu.nong_trai
     where owner_id = $1
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

    const rs = await db.query("select * from du_lieu.dong_chan_tha where farm_id = $1 order by created_at asc", [farmId]);
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
      `select id from du_lieu.dong_chan_tha where farm_id = $1 and lower(trim(name)) = lower(trim($2)) limit 1`,
      [farmId, zone.name]
    );
    if (existingName.rows[0]?.id) {
      return NextResponse.json({ message: `Tên ô "${zone.name}" đã tồn tại. Vui lòng đặt tên khác.` }, { status: 409 });
    }

    const q = `insert into du_lieu.dong_chan_tha(farm_id,paddock_code,name,area_ha,crop_type,grazing_status,notes,boundary_geojson,status)
               values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`;
    const vals = [farmId, zone.code, zone.name, zone.metadata.areaHecta, zone.metadata.usage, zone.metadata.plantingStatus, zone.metadata.notes, toBoundaryGeojson(zone), zone.status === "critical" ? "maintenance" : "active"];

    const rs = await db.query(q, vals);
    return NextResponse.json({ zone: toZone(rs.rows[0]) });
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json(
        { message: `Mã khu ${zone.code} đã tồn tại. Vui lòng thử lại.` },
        { status: 409 }
      );
    }

    return NextResponse.json({ message: "Không thể tạo khu mới." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const zone = (await request.json()) as ZonePayload;
  const farmId = await getOwnerFarmId();
  if (!farmId) return NextResponse.json({ message: "Không tìm thấy trang trại của tài khoản hiện tại." }, { status: 404 });

  const q = `update du_lieu.dong_chan_tha
             set name=$3, area_ha=$4, crop_type=$5, grazing_status=$6, notes=$7, boundary_geojson=$8, status=$9
             where id=$1 and farm_id=$2
             returning *`;
  const vals = [zone.id, farmId, zone.name, zone.metadata.areaHecta, zone.metadata.usage, zone.metadata.plantingStatus, zone.metadata.notes, toBoundaryGeojson(zone), zone.status === "critical" ? "maintenance" : "active"];
  const rs = await db.query(q, vals);
  return NextResponse.json({ zone: rs.rows[0] ? toZone(rs.rows[0]) : null });
}

export async function DELETE(request: NextRequest) {
  const { id } = (await request.json()) as { id: string };
  const farmId = await getOwnerFarmId();
  if (!farmId) return NextResponse.json({ message: "Không tìm thấy trang trại của tài khoản hiện tại." }, { status: 404 });

  await db.query("delete from du_lieu.dong_chan_tha where id = $1 and farm_id = $2", [id, farmId]);
  return NextResponse.json({ ok: true });
}

