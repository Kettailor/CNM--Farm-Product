import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taoMatKhauHash } from "@/lib/auth";

type RegistrationPayload = {
  owner: { fullName: string; email: string; password: string };
  farm: { name: string; areaHectare: number; specialFactors?: string; otherActivity?: string };
  location: { locationName?: string; mapsLink?: string; lat: string; lng: string };
  production: {
    livestock: Array<{ name: string; quantity: number }>;
  };
  settings: { annualRainfall: number; carryingCapacity: number; springStart: string };
  referral: { channels: string[]; otherNote?: string };
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isCoordInRange = (lat: number, lng: number) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegistrationPayload;
    const lat = Number(body?.location?.lat);
    const lng = Number(body?.location?.lng);
    const areaHectare = Number(body?.farm?.areaHectare);

    if (!body?.owner?.fullName || !body?.owner?.email || !body?.owner?.password || !body?.farm?.name) {
      return NextResponse.json({ message: "Thiếu thông tin bắt buộc." }, { status: 400 });
    }
    if (!Number.isFinite(areaHectare) || areaHectare <= 0) {
      return NextResponse.json({ message: "Diện tích trang trại phải lớn hơn 0 ha." }, { status: 400 });
    }
    if (!isEmail(body.owner.email)) {
      return NextResponse.json({ message: "Email không hợp lệ." }, { status: 400 });
    }
    if (body.owner.password.length < 8) {
      return NextResponse.json({ message: "Mật khẩu phải có ít nhất 8 ký tự." }, { status: 400 });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isCoordInRange(lat, lng)) {
      return NextResponse.json({ message: "Vĩ độ hoặc kinh độ không hợp lệ." }, { status: 400 });
    }
    if (!Array.isArray(body.production?.livestock)) {
      return NextResponse.json({ message: "Dữ liệu loại hình sản xuất không hợp lệ." }, { status: 400 });
    }
    const livestockInvalid = body.production.livestock.some((item) => !item?.name || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0);
    if (livestockInvalid) {
      return NextResponse.json({ message: "Mỗi loại chăn nuôi được chọn phải có số lượng lớn hơn 0." }, { status: 400 });
    }

    await db.query(`
      create schema if not exists du_lieu;
      create extension if not exists pgcrypto;

      create table if not exists du_lieu.chu_so_huu (
        id uuid primary key default gen_random_uuid(),
        full_name text not null,
        email text not null unique,
        password_hash text not null,
        created_at timestamptz not null default now()
      );

      create table if not exists du_lieu.nong_trai (
        id uuid primary key default gen_random_uuid(),
        owner_id uuid not null references du_lieu.chu_so_huu(id) on delete cascade,
        name text not null,
        farm_area_hectare numeric,
        special_factors text,
        other_activity text,
        annual_rainfall numeric,
        carrying_capacity numeric,
        spring_start text,
        created_at timestamptz not null default now()
      );

      alter table du_lieu.nong_trai add column if not exists farm_area_hectare numeric;
      alter table du_lieu.nong_trai alter column id set default gen_random_uuid();

      create table if not exists du_lieu.vi_tri_nong_trai (
        farm_id uuid primary key references du_lieu.nong_trai(id) on delete cascade,
        location_name text,
        maps_link text,
        latitude numeric not null,
        longitude numeric not null
      );

      create table if not exists du_lieu.chan_nuoi_nong_trai (
        id uuid primary key default gen_random_uuid(),
        farm_id uuid not null references du_lieu.nong_trai(id) on delete cascade,
        livestock_name text not null,
        quantity numeric
      );

      create table if not exists du_lieu.cay_trong_nong_trai (
        id uuid primary key default gen_random_uuid(),
        farm_id uuid not null references du_lieu.nong_trai(id) on delete cascade,
        crop_name text not null
      );

      create table if not exists du_lieu.tai_nguyen_nong_trai (
        id uuid primary key default gen_random_uuid(),
        farm_id uuid not null references du_lieu.nong_trai(id) on delete cascade,
        resource_name text not null
      );

      create table if not exists du_lieu.nguon_biet_den_nong_trai (
        id uuid primary key default gen_random_uuid(),
        farm_id uuid not null references du_lieu.nong_trai(id) on delete cascade,
        channel_name text not null,
        other_note text
      );
    `);

    const client = await db.connect();
    try {
      await client.query("begin");

      const existedOwner = await client.query(`select id from du_lieu.chu_so_huu where email = $1 limit 1`, [body.owner.email.trim()]);
      if (existedOwner.rowCount) {
        throw new Error("EMAIL_EXISTS");
      }

      const hashMatKhau = taoMatKhauHash(body.owner.password);
      const ownerResult = await client.query(
        `insert into du_lieu.chu_so_huu (full_name, email, password_hash)
         values ($1, $2, $3)
         returning id`,
        [body.owner.fullName.trim(), body.owner.email.trim(), hashMatKhau]
      );
      const ownerId = ownerResult.rows[0].id as string;

      const farmResult = await client.query(
        `insert into du_lieu.nong_trai
          (id, owner_id, name, farm_area_hectare, special_factors, other_activity, annual_rainfall, carrying_capacity, spring_start)
         values (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8)
         returning id, created_at`,
        [ownerId, body.farm.name.trim(), areaHectare, body.farm.specialFactors ?? null, body.farm.otherActivity ?? null, body.settings.annualRainfall ?? null, body.settings.carryingCapacity ?? null, body.settings.springStart ?? null]
      );
      const farmId = farmResult.rows[0].id as string;

      await client.query(
        `insert into du_lieu.vi_tri_nong_trai (farm_id, location_name, maps_link, latitude, longitude)
         values ($1,$2,$3,$4,$5)`,
        [farmId, body.location.locationName ?? null, body.location.mapsLink ?? null, lat, lng]
      );

      for (const item of body.production.livestock) {
        if (!item?.name) continue;
        const quantity = item.quantity ?? null;
        await client.query(
          `insert into du_lieu.chan_nuoi_nong_trai (farm_id, livestock_name, quantity)
           values ($1,$2,$3)`,
          [farmId, item.name, quantity]
        );
      }


      await client.query("commit");

      return NextResponse.json({
        message: "Lưu đăng ký thành công.",
        registration: { ownerId, farmId, createdAt: farmResult.rows[0].created_at },
      });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const errorMessage = String(error);
    if (errorMessage.includes("EMAIL_EXISTS") || errorMessage.includes("duplicate key value violates unique constraint")) {
      return NextResponse.json({ message: "Email đã tồn tại trong hệ thống. Vui lòng dùng email khác." }, { status: 409 });
    }
    return NextResponse.json(
      {
        message: "Không thể lưu đăng ký vào cơ sở dữ liệu.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
