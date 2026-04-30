import { NextRequest, NextResponse } from "next/server";

const TEN_COOKIE_XAC_THUC = "phien_dang_nhap";
const danhSachCanDangNhap = ["/home-2"];
const danhSachAnKhiDaDangNhap = ["/", "/login"];

function daDangNhap(request: NextRequest) {
  const token = request.cookies.get(TEN_COOKIE_XAC_THUC)?.value;
  return !!token;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hopLe = daDangNhap(request);

  const canBaoVe = danhSachCanDangNhap.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (canBaoVe && !hopLe) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const canAn = danhSachAnKhiDaDangNhap.includes(pathname);
  if (canAn && hopLe) {
    const url = request.nextUrl.clone();
    url.pathname = "/home-2";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/home-2/:path*"],
};

