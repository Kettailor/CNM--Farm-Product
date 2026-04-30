import { NextResponse } from "next/server";
import { cauHinhCookieXacThuc, TEN_COOKIE_XAC_THUC } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ message: "Đăng xuất thành công." });
  response.cookies.set(TEN_COOKIE_XAC_THUC, "", { ...cauHinhCookieXacThuc, maxAge: 0 });
  response.cookies.set("ownerId", "", { ...cauHinhCookieXacThuc, maxAge: 0 });
  return response;
}

