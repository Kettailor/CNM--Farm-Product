import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { layOwnerIdTuRequest } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ownerId = layOwnerIdTuRequest(request);
  if (!ownerId) {
    return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
  }

  try {
    const data = await getDashboardOverview(ownerId);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ message: "Không thể tải dữ liệu tổng quan." }, { status: 500 });
  }
}
