import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { layOwnerIdTuRequest, layOwnerIdTuServerCookie } from "@/lib/auth";
import { ensureFarmSettingsDefaults, ensureSettingsSchema } from "@/lib/settings-schema";

type Payload = {
  farm: { name: string; areaHectare: number; specialFactors?: string; otherActivity?: string };
  location: { locationName?: string; mapsLink?: string; lat: string; lng: string };
  production: { livestock: Array<{ name: string; quantity?: number }> };
  settings: { annualRainfall: number; carryingCapacity: number; springStart: string };
  referral: { channels: string[]; otherNote?: string };
};

const isCoordInRange = (lat: number, lng: number) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const FARM_LIVESTOCK_OVERVIEW_SCHEMA_SQL = `
create extension if not exists pgcrypto;

create table if not exists du_lieu.thong_tin_chan_nuoi_trang_trai (
  id uuid primary key default gen_random_uuid(),
  trang_trai_id uuid not null references du_lieu.trang_trai(id) on delete cascade,
  loai_chan_nuoi text not null,
  created_at timestamptz not null default now(),
  unique (trang_trai_id, loai_chan_nuoi)
);

create index if not exists idx_thong_tin_chan_nuoi_trang_trai_id
  on du_lieu.thong_tin_chan_nuoi_trang_trai(trang_trai_id);
`;

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

    await db.query(FARM_LIVESTOCK_OVERVIEW_SCHEMA_SQL);
    await ensureSettingsSchema();

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

      await client.query(
        `insert into du_lieu.cai_dat_trang_trai
          (trang_trai_id, dien_tich_ha, yeu_to_dac_biet, hoat_dong_khac, luong_mua_hang_nam, suc_tai_chan_tha, mua_xuan_bat_dau)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (trang_trai_id) do update
         set dien_tich_ha = excluded.dien_tich_ha,
             yeu_to_dac_biet = excluded.yeu_to_dac_biet,
             hoat_dong_khac = excluded.hoat_dong_khac,
             luong_mua_hang_nam = excluded.luong_mua_hang_nam,
             suc_tai_chan_tha = excluded.suc_tai_chan_tha,
             mua_xuan_bat_dau = excluded.mua_xuan_bat_dau,
             updated_at = now()`,
        [
          farmId,
          areaHectare,
          body.farm.specialFactors ?? null,
          body.farm.otherActivity ?? null,
          body.settings?.annualRainfall ?? null,
          body.settings?.carryingCapacity ?? null,
          body.settings?.springStart ?? null,
        ]
      );

      for (const item of body.production?.livestock || []) {
        const livestockType = String(item?.name ?? "").trim();
        if (!livestockType) continue;
        await client.query(
          `insert into du_lieu.thong_tin_chan_nuoi_trang_trai (trang_trai_id, loai_chan_nuoi)
           values ($1,$2)
           on conflict (trang_trai_id, loai_chan_nuoi) do nothing`,
          [farmId, livestockType]
        );
      }
      await client.query("commit");
      await ensureFarmSettingsDefaults(farmId, ownerId);
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
