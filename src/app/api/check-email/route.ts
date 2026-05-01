import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body?.email?.trim()?.toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "Email là bắt buộc." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: "Email không hợp lệ." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        exists: false,
        can_check: false,
        message: "Chưa cấu hình cơ sở dữ liệu, tạm bỏ qua bước kiểm tra email.",
      });
    }

    const result = await db.query(
      "select 1 from du_lieu.chu_so_huu where lower(email) = $1 limit 1",
      [email]
    );

    return NextResponse.json({ exists: result.rows.length > 0, can_check: true });
  } catch (error) {
    return NextResponse.json({
      exists: false,
      can_check: false,
      message: "Không thể kiểm tra email lúc này, hệ thống sẽ tiếp tục bước đăng ký.",
      error: String(error),
    });
  }
}
