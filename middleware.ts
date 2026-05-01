import { NextRequest, NextResponse } from "next/server";
import { giaiMaTokenXacThuc, TEN_COOKIE_XAC_THUC } from "@/lib/auth";

const danhSachCanDangNhap = ["/home-2", "/dashboard"];
const danhSachAnKhiDaDangNhap = ["/login", "/register"];

function daDangNhap(request: NextRequest) {
  const token = request.cookies.get(TEN_COOKIE_XAC_THUC)?.value;
  return Boolean(giaiMaTokenXacThuc(token));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hopLe = daDangNhap(request);

  const canBaoVe = danhSachCanDangNhap.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (canBaoVe && !hopLe) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const canAn = danhSachAnKhiDaDangNhap.includes(pathname);
  if (canAn && hopLe) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/home-2/:path*", "/dashboard/:path*"],
};

