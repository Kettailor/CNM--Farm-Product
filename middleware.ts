import { NextRequest, NextResponse } from "next/server";
import { giaiMaTokenXacThuc, TEN_COOKIE_XAC_THUC } from "@/lib/auth";

const danhSachAnKhiDaDangNhap = ["/login", "/register"];

function daDangNhap(request: NextRequest) {
  const token = request.cookies.get(TEN_COOKIE_XAC_THUC)?.value;
  return Boolean(giaiMaTokenXacThuc(token));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hopLe = daDangNhap(request);

  if (danhSachAnKhiDaDangNhap.includes(pathname) && hopLe) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register"],
};
