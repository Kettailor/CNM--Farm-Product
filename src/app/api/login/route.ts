import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  cauHinhCookieXacThuc,
  hashDangLegacyMd5,
  kiemTraMatKhau,
  taoMatKhauHash,
  taoTokenXacThuc,
  TEN_COOKIE_XAC_THUC,
} from "@/lib/auth";

type LoginPayload = {
  email: string;
  password: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginPayload;
    const email = body?.email?.trim();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json({ message: "Vui lòng nhập đầy đủ email và mật khẩu." }, { status: 400 });
    }

    const result = await db.query(
      `select id, full_name, email, password_hash
       from du_lieu.chu_so_huu
       where email = $1
       limit 1`,
      [email]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Email hoặc mật khẩu không đúng." }, { status: 401 });
    }

    const user = result.rows[0] as { id: string; full_name: string; email: string; password_hash: string };
    const hopLe = kiemTraMatKhau(password, user.password_hash);
    if (!hopLe) {
      return NextResponse.json({ message: "Email hoặc mật khẩu không đúng." }, { status: 401 });
    }

    if (hashDangLegacyMd5(user.password_hash)) {
      const hashMoi = taoMatKhauHash(password);
      await db.query("update du_lieu.chu_so_huu set password_hash = $2 where id = $1", [user.id, hashMoi]);
    }

    const token = taoTokenXacThuc(String(user.id));
    const response = NextResponse.json({
      message: "Đăng nhập thành công.",
      user: { id: user.id, fullName: user.full_name, email: user.email },
    });

    response.cookies.set(TEN_COOKIE_XAC_THUC, token, cauHinhCookieXacThuc);
    response.cookies.set("ownerId", "", { ...cauHinhCookieXacThuc, maxAge: 0 });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message: "Không thể đăng nhập vào lúc này.",
        error: String(error),
      },
      { status: 500 }
    );
  }
}

