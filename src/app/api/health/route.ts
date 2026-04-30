import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    he_thong: "KetKat-EcoFarm",
    dich_vu: "nextjs",
    trang_thai: "dang_hoat_dong",
    thoi_gian: new Date().toISOString(),
  });
}

