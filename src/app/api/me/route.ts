import { NextRequest, NextResponse } from "next/server";
import { layOwnerIdTuRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleFarm } from "@/lib/farm-access";

export async function GET(request: NextRequest) {
  const ownerId = layOwnerIdTuRequest(request);
  if (!ownerId) {
    return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });
  }

  const result = await db.query(
    `select id::text, ho_ten as full_name, email
     from du_lieu.nguoi_dung
     where id = $1
       and coalesce(nullif(trang_thai, ''), 'active') <> 'disabled'
     limit 1`,
    [ownerId]
  );

  const user = result.rows[0] as { id?: string; full_name?: string | null; email?: string | null } | undefined;
  if (!user?.id) {
    return NextResponse.json({ message: "Không tìm thấy người dùng." }, { status: 404 });
  }

  const access = await getAccessibleFarm(ownerId);

  return NextResponse.json({
    user: {
      id: user.id,
      fullName: user.full_name?.trim() || user.email || "Người dùng",
      email: user.email,
    },
    access: access
      ? {
          farmId: access.farmId,
          roleCode: access.roleCode,
          roleName: access.roleName,
          canRead: access.canRead,
          canWrite: access.canWrite,
          canManageSettings: access.canManageSettings,
          canManageUsers: access.canManageUsers,
          canManageDocuments: access.canManageDocuments,
          isOwner: access.isOwner,
        }
      : null,
  });
}
