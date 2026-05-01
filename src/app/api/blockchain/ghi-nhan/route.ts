import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TRANG_THAI_CHUOI_KHOI, taoMaTruyXuat } from "@/lib/blockchain";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const maSanPham = String(body?.ma_san_pham ?? "").trim();
    const loaiSanPham = String(body?.loai_san_pham ?? "").trim();
    const nguonGoc = String(body?.nguon_goc ?? "").trim();
    const maBamDuLieu = String(body?.ma_bam_du_lieu ?? "").trim();

    if (!maSanPham || !loaiSanPham || !nguonGoc || !maBamDuLieu) {
      return NextResponse.json({ message: "Thiếu dữ liệu bắt buộc để ghi nhận truy xuất." }, { status: 400 });
    }

    const maTruyXuat = taoMaTruyXuat();

    const rs = await db.query(
      `insert into du_lieu.truy_xuat_san_pham_chuoi_khoi
       (ma_truy_xuat, ma_san_pham, loai_san_pham, nguon_goc, ma_bam_du_lieu, trang_thai_dong_bo, du_lieu_truy_xuat, siu_du_lieu)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
       returning id, ma_truy_xuat, trang_thai_dong_bo, ngay_tao`,
      [
        maTruyXuat,
        maSanPham,
        loaiSanPham,
        nguonGoc,
        maBamDuLieu,
        TRANG_THAI_CHUOI_KHOI.CHO_DONG_BO,
        JSON.stringify(body?.du_lieu_truy_xuat ?? {}),
        JSON.stringify(body?.siu_du_lieu ?? {}),
      ]
    );

    return NextResponse.json({
      message: "Đã ghi nhận truy xuất (chờ đồng bộ blockchain).",
      du_lieu: rs.rows[0],
    });
  } catch (error) {
    return NextResponse.json({ message: "Không thể ghi nhận truy xuất.", error: String(error) }, { status: 500 });
  }
}

