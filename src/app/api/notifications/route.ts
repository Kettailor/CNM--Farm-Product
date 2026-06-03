import { NextRequest, NextResponse } from "next/server";
import { layOwnerIdTuRequest } from "@/lib/auth";
import { listUserNotifications, markAllNotificationsRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ownerId = layOwnerIdTuRequest(request);
  if (!ownerId) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = Number(searchParams.get("offset") ?? 0);
  const data = await listUserNotifications(ownerId, limit, offset);
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const ownerId = layOwnerIdTuRequest(request);
  if (!ownerId) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "mark_all_read") {
    return NextResponse.json({ message: "Tác vụ không hợp lệ." }, { status: 400 });
  }

  await markAllNotificationsRead(ownerId);
  const data = await listUserNotifications(ownerId, 20, 0);
  return NextResponse.json(data);
}
