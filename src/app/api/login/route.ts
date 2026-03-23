import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
      `select id, full_name, email
       from du_lieu.chu_so_huu
       where email = $1
         and password_hash = md5($2)
       limit 1`,
      [email, password]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Email hoặc mật khẩu không đúng." }, { status: 401 });
    }

    const user = result.rows[0];
    const response = NextResponse.json({
      message: "Đăng nhập thành công.",
      user: { id: user.id, fullName: user.full_name, email: user.email },
    });
    response.cookies.set("ownerId", String(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
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

