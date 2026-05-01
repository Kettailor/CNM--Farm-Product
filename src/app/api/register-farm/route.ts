import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { layOwnerIdTuRequest } from "@/lib/auth";

type Payload = {
  farm: { name: string; areaHectare: number; specialFactors?: string; otherActivity?: string };
  location: { locationName?: string; mapsLink?: string; lat: string; lng: string };
  production: { livestock: Array<{ name: string; quantity: number }>; crops: string[]; resources: string[] };
  settings: { annualRainfall: number; carryingCapacity: number; springStart: string };
  referral: { channels: string[]; otherNote?: string };
};

const isCoordInRange = (lat: number, lng: number) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

export async function POST(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuRequest(request);
    if (!ownerId) {
      return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
    }

    const body = (await request.json()) as Payload;
    const lat = Number(body?.location?.lat);
    const lng = Number(body?.location?.lng);
    const areaHectare = Number(body?.farm?.areaHectare);

    if (!body?.farm?.name || !Number.isFinite(areaHectare) || areaHectare <= 0) {
      return NextResponse.json({ message: "Thiếu thông tin nông trại hợp lệ." }, { status: 400 });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isCoordInRange(lat, lng)) {
      return NextResponse.json({ message: "Vĩ độ hoặc kinh độ không hợp lệ." }, { status: 400 });
    }

    const client = await db.connect();
    try {
      await client.query("begin");
      const farmResult = await client.query(
        `insert into du_lieu.nong_trai
          (owner_id, name, farm_area_hectare, special_factors, other_activity, annual_rainfall, carrying_capacity, spring_start)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         returning id, created_at`,
        [ownerId, body.farm.name.trim(), areaHectare, body.farm.specialFactors ?? null, body.farm.otherActivity ?? null, body.settings.annualRainfall ?? null, body.settings.carryingCapacity ?? null, body.settings.springStart ?? null]
      );
      const farmId = farmResult.rows[0].id as string;

      await client.query(
        `insert into du_lieu.vi_tri_nong_trai (farm_id, location_name, maps_link, latitude, longitude)
         values ($1,$2,$3,$4,$5)`,
        [farmId, body.location.locationName ?? null, body.location.mapsLink ?? null, lat, lng]
      );

      for (const item of body.production.livestock || []) {
        if (!item?.name) continue;
        await client.query(`insert into du_lieu.chan_nuoi_nong_trai (farm_id, livestock_name, quantity) values ($1,$2,$3)`, [farmId, item.name, item.quantity ?? null]);
      }
      for (const crop of body.production.crops || []) {
        if (!crop) continue;
        await client.query(`insert into du_lieu.cay_trong_nong_trai (farm_id, crop_name) values ($1,$2)`, [farmId, crop]);
      }
      for (const resource of body.production.resources || []) {
        if (!resource) continue;
        await client.query(`insert into du_lieu.tai_nguyen_nong_trai (farm_id, resource_name) values ($1,$2)`, [farmId, resource]);
      }
      for (const channel of body.referral.channels || []) {
        if (!channel) continue;
        await client.query(`insert into du_lieu.nguon_biet_den_nong_trai (farm_id, channel_name, other_note) values ($1,$2,$3)`, [farmId, channel, channel === "Khác" ? body.referral.otherNote ?? null : null]);
      }

      await client.query("commit");
      return NextResponse.json({ message: "Lưu thông tin nông trại thành công.", farmId, createdAt: farmResult.rows[0].created_at });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json({ message: "Không thể lưu thông tin nông trại.", error: String(error) }, { status: 500 });
  }
}
