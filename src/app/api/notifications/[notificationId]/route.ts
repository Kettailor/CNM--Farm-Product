import { NextRequest, NextResponse } from "next/server";
import { layOwnerIdTuRequest } from "@/lib/auth";
import { markNotificationRead } from "@/lib/notifications";

export async function PATCH(request: NextRequest, { params }: { params: { notificationId: string } }) {
  const ownerId = layOwnerIdTuRequest(request);
  if (!ownerId) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });

  const notification = await markNotificationRead(ownerId, params.notificationId);
  if (!notification) return NextResponse.json({ message: "Không tìm thấy thông báo." }, { status: 404 });

  return NextResponse.json({ notification });
}
