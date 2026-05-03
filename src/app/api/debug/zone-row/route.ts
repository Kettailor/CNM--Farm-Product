import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { layOwnerIdTuServerCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const zoneId = request.nextUrl.searchParams.get("zoneId")?.trim();
    if (!zoneId) {
      return NextResponse.json({ ok: false, message: "Thiếu zoneId." }, { status: 400 });
    }

    const ownerId = layOwnerIdTuServerCookie();
    const withOwner = ownerId
      ? await db.query(
          `select
             dc.id::text as id,
             dc.paddock_code::text as paddock_code,
             dc.farm_id::text as farm_id,
             n.owner_id::text as owner_id,
             dc.name::text as name,
             dc.crop_type::text as crop_type,
             dc.status::text as status,
             dc.area_ha::text as area_ha,
             dc.boundary_geojson::text as boundary_geojson,
             dc.created_at::text as created_at
           from du_lieu.dong_chan_tha dc
           join du_lieu.nong_trai n on n.id = dc.farm_id
           where (dc.id::text = $1 or dc.paddock_code::text = $1) and n.owner_id::text = $2
           limit 1`,
          [zoneId, ownerId]
        )
      : null;

    const withoutOwner = await db.query(
      `select
         dc.id::text as id,
         dc.paddock_code::text as paddock_code,
         dc.farm_id::text as farm_id,
         n.owner_id::text as owner_id,
         dc.name::text as name,
         dc.crop_type::text as crop_type,
         dc.status::text as status,
         dc.area_ha::text as area_ha,
         dc.boundary_geojson::text as boundary_geojson,
         dc.created_at::text as created_at
       from du_lieu.dong_chan_tha dc
       join du_lieu.nong_trai n on n.id = dc.farm_id
       where dc.id::text = $1 or dc.paddock_code::text = $1
       limit 5`,
      [zoneId]
    );

    const counts = await db.query(
      `select
         count(*) filter (where dc.id::text = $1) as by_id,
         count(*) filter (where dc.paddock_code::text = $1) as by_code,
         count(*) as total
       from du_lieu.dong_chan_tha dc
       join du_lieu.nong_trai n on n.id = dc.farm_id
       where dc.id::text = $1 or dc.paddock_code::text = $1`,
      [zoneId]
    );

    return NextResponse.json({
      ok: true,
      input: { zoneId, ownerId },
      counts: counts.rows[0],
      withOwner: withOwner?.rows ?? [],
      withoutOwner: withoutOwner.rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Không thể debug zone row.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
