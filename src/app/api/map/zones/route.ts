import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type ZonePayload = {
  id?: string;
  name: string;
  code: string;
  status: "healthy" | "warning" | "critical";
  occupancy: number;
  coverage: string;
  geo: { lat: number; lng: number; latSpan: number; lngSpan: number };
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

export async function GET() {
  try {
    const rs = await db.query("select * from farm.paddocks order by created_at asc");
    return NextResponse.json({ zones: rs.rows.map(toZone) });
  } catch (error) {
    return NextResponse.json({ message: "Không thể kết nối dữ liệu map từ PostgreSQL.", error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const zone = (await request.json()) as ZonePayload;
  const q = `insert into farm.paddocks(farm_id,paddock_code,name,area_ha,crop_type,grazing_status,notes,boundary_geojson,status)
             values((select id from farm.farms order by created_at asc limit 1),$1,$2,$3,$4,$5,$6,$7,$8) returning *`;
  const vals = [zone.code, zone.name, zone.metadata.areaHecta, zone.metadata.usage, zone.metadata.plantingStatus, zone.metadata.notes, toBoundaryGeojson(zone), zone.status === "critical" ? "maintenance" : "active"];
  const rs = await db.query(q, vals);
  return NextResponse.json({ zone: toZone(rs.rows[0]) });
}

export async function PUT(request: NextRequest) {
  const zone = (await request.json()) as ZonePayload;
  const q = `update farm.paddocks set name=$2, area_ha=$3, crop_type=$4, grazing_status=$5, notes=$6, boundary_geojson=$7, status=$8 where id=$1 returning *`;
  const vals = [zone.id, zone.name, zone.metadata.areaHecta, zone.metadata.usage, zone.metadata.plantingStatus, zone.metadata.notes, toBoundaryGeojson(zone), zone.status === "critical" ? "maintenance" : "active"];
  const rs = await db.query(q, vals);
  return NextResponse.json({ zone: toZone(rs.rows[0]) });
}

export async function DELETE(request: NextRequest) {
  const { id } = (await request.json()) as { id: string };
  await db.query("delete from farm.paddocks where id = $1", [id]);
  return NextResponse.json({ ok: true });
}

