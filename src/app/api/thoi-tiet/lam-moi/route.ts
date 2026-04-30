import { NextRequest, NextResponse } from "next/server";
import { layDuLieuThoiTietToiUu } from "@/lib/thoi-tiet";

const TOKEN_CRON = process.env.CRON_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!TOKEN_CRON || token !== TOKEN_CRON) {
      return NextResponse.json({ message: "Không có quyền làm mới dữ liệu." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      danh_sach_toa_do?: Array<{ vi_do: number; kinh_do: number }>;
    };

    const danhSach = Array.isArray(body.danh_sach_toa_do) ? body.danh_sach_toa_do : [];
    if (danhSach.length === 0) {
      return NextResponse.json({ message: "Thiếu danh_sach_toa_do để làm mới." }, { status: 400 });
    }

    const ketQua = [] as Array<{ vi_do: number; kinh_do: number; trang_thai: string }>;
    for (const item of danhSach.slice(0, 50)) {
      if (!Number.isFinite(item.vi_do) || !Number.isFinite(item.kinh_do)) continue;
      await layDuLieuThoiTietToiUu(item.vi_do, item.kinh_do, true);
      ketQua.push({ vi_do: item.vi_do, kinh_do: item.kinh_do, trang_thai: "da_lam_moi" });
    }

    return NextResponse.json({
      he_thong: "KetKat-EcoFarm",
      so_luong: ketQua.length,
      ket_qua: ketQua,
    });
  } catch (error) {
    return NextResponse.json({ message: "Lỗi làm mới dữ liệu thời tiết.", error: String(error) }, { status: 500 });
  }
}
