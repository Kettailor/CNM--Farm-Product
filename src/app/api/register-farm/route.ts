import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { layOwnerIdTuRequest, layOwnerIdTuServerCookie } from "@/lib/auth";

type Payload = {
  farm: { name: string; areaHectare: number; specialFactors?: string; otherActivity?: string };
  location: { locationName?: string; mapsLink?: string; lat: string; lng: string };
  production: { livestock: Array<{ name: string; quantity: number }> };
  settings: { annualRainfall: number; carryingCapacity: number; springStart: string };
  referral: { channels: string[]; otherNote?: string };
};

const isCoordInRange = (lat: number, lng: number) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

export async function POST(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuRequest(request) || layOwnerIdTuServerCookie();
    if (!ownerId) {
      return NextResponse.json({ message: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
    }

    const existing = await db.query(
      `select t.id
       from du_lieu.trang_trai t
       where t.chu_so_huu_id = $1
       limit 1`,
      [ownerId]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ message: "Thông tin nông trại đã được lưu." }, { status: 409 });
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
      const farmId = randomUUID();
      const farmResult = await client.query(
        `insert into du_lieu.trang_trai
          (id, chu_so_huu_id, ma_trang_trai, ten_trang_trai, dia_chi, kinh_do, vi_do)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id, created_at`,
        [farmId, ownerId, `FARM-${farmId.slice(0, 8)}`, body.farm.name.trim(), body.location.locationName ?? null, lng, lat]
      );

      await client.query(
        `insert into du_lieu.vi_tri_trang_trai (trang_trai_id, ten_dia_diem, maps_link, kinh_do, vi_do)
         values ($1,$2,$3,$4,$5)`,
        [farmId, body.location.locationName ?? null, body.location.mapsLink ?? null, lng, lat]
      );

      for (const item of body.production.livestock || []) {
        if (!item?.name) continue;
        await client.query(
          `insert into du_lieu.vat_nuoi (trang_trai_id, ma_vat_nuoi, the_nhan_dien, trang_thai)
           values ($1,$2,$3,'đang hoạt động')`,
          [farmId, `VN-${randomUUID().slice(0, 8)}`, item.name]
        );
      }
      await client.query("commit");
      return NextResponse.json({ message: "Lưu thông tin nông trại thành công.", farmId, createdAt: farmResult.rows[0].created_at, nextPath: "/dashboard" });
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
