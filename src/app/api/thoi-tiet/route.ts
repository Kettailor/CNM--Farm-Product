import { NextRequest, NextResponse } from "next/server";
import { layDuLieuThoiTietToiUu } from "@/lib/thoi-tiet";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const viDo = Number(sp.get("vi_do") ?? sp.get("lat") ?? "");
    const kinhDo = Number(sp.get("kinh_do") ?? sp.get("lng") ?? "");
    const lamMoi = ["1", "true", "yes"].includes(String(sp.get("lam_moi") ?? "").toLowerCase());

    if (!Number.isFinite(viDo) || !Number.isFinite(kinhDo)) {
      return NextResponse.json(
        { message: "Thiếu hoặc sai tọa độ. Dùng vi_do và kinh_do." },
        { status: 400 }
      );
    }

    const duLieu = await layDuLieuThoiTietToiUu(viDo, kinhDo, lamMoi);

    return NextResponse.json({
      he_thong: "KetKat-EcoFarm",
      du_lieu: duLieu,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Không lấy được dữ liệu thời tiết.", error: String(error) },
      { status: 500 }
    );
  }
}
