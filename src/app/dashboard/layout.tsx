import { redirect } from "next/navigation";
import { layTaiKhoanDangNhapTuServerCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

function taoLogoutRedirect() {
  const next = encodeURIComponent("/login?next=/dashboard");
  return `/api/logout?next=${next}`;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const taiKhoan = await layTaiKhoanDangNhapTuServerCookie();
  if (!taiKhoan) redirect(taoLogoutRedirect());

  return children;
}
