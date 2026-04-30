import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    he_thong: "KetKat-EcoFarm",
    module: "blockchain_truy_xuat",
    trang_thai: "khoi_tao",
    nen_tang_du_kien: "hyperledger_fabric",
    mo_ta: "Da san sang cau truc du lieu truy xuat, cho tich hop mang blockchain that.",
  });
}

