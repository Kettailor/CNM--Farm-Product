import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cauHinhCookieXacThuc, taoMatKhauHash, taoTokenXacThuc, TEN_COOKIE_XAC_THUC } from "@/lib/auth";

type Payload = {
  fullName: string;
  email: string;
  password: string;
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Payload;
    const fullName = body?.fullName?.trim();
    const email = body?.email?.trim();
    const password = body?.password ?? "";

    if (!fullName || !email || !password) {
      return NextResponse.json({ message: "Vui lòng nhập đầy đủ thông tin." }, { status: 400 });
    }
    if (!isEmail(email)) {
      return NextResponse.json({ message: "Email không hợp lệ." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: "Mật khẩu phải có ít nhất 8 ký tự." }, { status: 400 });
    }

    const existed = await db.query("select id from du_lieu.nguoi_dung where email = $1 limit 1", [email]);
    if (existed.rowCount) {
      return NextResponse.json({ message: "Email đã tồn tại trong hệ thống. Vui lòng dùng email khác." }, { status: 409 });
    }

    const passwordHash = taoMatKhauHash(password);
    const result = await db.query(
      `insert into du_lieu.nguoi_dung (ho_ten, email, mat_khau_hash)
       values ($1, $2, $3)
       returning id, ho_ten, email`,
      [fullName, email, passwordHash]
    );

    const user = result.rows[0] as { id: string; full_name: string; email: string };
    const token = taoTokenXacThuc(String(user.id));
    const response = NextResponse.json({ message: "Tạo tài khoản thành công.", user, nextPath: "/register/farm" });
    response.cookies.set(TEN_COOKIE_XAC_THUC, token, cauHinhCookieXacThuc);
    response.cookies.set("ownerId", String(user.id), { ...cauHinhCookieXacThuc, httpOnly: false });
    return response;
  } catch (error) {
    return NextResponse.json({ message: "Không thể tạo tài khoản.", error: String(error) }, { status: 500 });
  }
}
