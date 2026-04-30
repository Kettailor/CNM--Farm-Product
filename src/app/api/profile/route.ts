import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { layOwnerIdTuServerCookie } from "@/lib/auth";

const toNumberOrNull = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function GET() {
  try {
    const ownerId = layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });

    const rs = await db.query(
      `select c.id as owner_id, c.full_name, c.email,
              n.id as farm_id, n.name as farm_name, n.farm_area_hectare,
              n.special_factors, n.other_activity, n.annual_rainfall, n.carrying_capacity, n.spring_start,
              v.location_name, v.maps_link, v.latitude, v.longitude
       from du_lieu.chu_so_huu c
       left join du_lieu.nong_trai n on n.owner_id = c.id
       left join du_lieu.vi_tri_nong_trai v on v.farm_id = n.id
       where c.id = $1
       order by n.created_at desc nulls last
       limit 1`,
      [ownerId]
    );

    return NextResponse.json({ profile: rs.rows[0] ?? null });
  } catch (error) {
    return NextResponse.json({ message: "Không thể tải thông tin profile.", error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const client = await db.connect();
  try {
    const ownerId = layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });

    const body = await request.json();
    const latitude = toNumberOrNull(body.latitude);
    const longitude = toNumberOrNull(body.longitude);

    const autoLocationName = latitude !== null && longitude !== null
      ? `Vị trí (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`
      : null;
    const autoMapsLink = latitude !== null && longitude !== null
      ? `https://maps.google.com/?q=${latitude},${longitude}`
      : null;

    await client.query("begin");

    await client.query(
      `update du_lieu.chu_so_huu set full_name = $2, email = $3 where id = $1`,
      [ownerId, body.full_name?.trim(), body.email?.trim()]
    );

    let farmId = body.farm_id as string | null;
    if (!farmId) {
      const created = await client.query(
        `insert into du_lieu.nong_trai(id, owner_id, name, farm_area_hectare, special_factors, other_activity, annual_rainfall, carrying_capacity, spring_start)
         values (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
         returning id`,
        [ownerId, body.farm_name?.trim() || "Nông trại", body.farm_area_hectare ?? null, body.special_factors ?? null, body.other_activity ?? null, body.annual_rainfall ?? null, body.carrying_capacity ?? null, body.spring_start ?? null]
      );
      farmId = created.rows[0].id;
    } else {
      await client.query(
        `update du_lieu.nong_trai
         set name = $2, farm_area_hectare = $3, special_factors = $4, other_activity = $5,
             annual_rainfall = $6, carrying_capacity = $7, spring_start = $8
         where id = $1 and owner_id = $9`,
        [farmId, body.farm_name?.trim(), body.farm_area_hectare ?? null, body.special_factors ?? null, body.other_activity ?? null, body.annual_rainfall ?? null, body.carrying_capacity ?? null, body.spring_start ?? null, ownerId]
      );
    }

    await client.query(
      `insert into du_lieu.vi_tri_nong_trai (farm_id, location_name, maps_link, latitude, longitude)
       values ($1, $2, $3, $4, $5)
       on conflict (farm_id) do update
       set location_name = excluded.location_name,
           maps_link = excluded.maps_link,
           latitude = excluded.latitude,
           longitude = excluded.longitude`,
      [farmId, autoLocationName ?? body.location_name ?? null, autoMapsLink ?? body.maps_link ?? null, latitude, longitude]
    );

    await client.query("commit");
    return NextResponse.json({ message: "Cập nhật profile thành công." });
  } catch (error) {
    await client.query("rollback");
    return NextResponse.json({ message: "Không thể cập nhật profile.", error: String(error) }, { status: 500 });
  } finally {
    client.release();
  }
}

