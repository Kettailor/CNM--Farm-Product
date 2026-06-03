import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expireFarmInvitations } from "@/lib/farm-invitations";
import { ensureSettingsSchema } from "@/lib/settings-schema";

export const dynamic = "force-dynamic";

function normalizeStatus(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  await ensureSettingsSchema();
  await expireFarmInvitations();

  const token = request.nextUrl.searchParams.get("token")?.trim() || "";
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase() || "";
  if (!token) {
    return NextResponse.json({ status: "not_found", message: "Không tìm thấy lời mời." }, { status: 404 });
  }

  const result = await db.query(
    `select lm.email,
            lm.trang_thai,
            lm.het_han_luc,
            t.ten_trang_trai as farm_name
     from du_lieu.loi_moi_trang_trai lm
     join du_lieu.trang_trai t on t.id = lm.trang_trai_id
     where lm.token = $1
       and ($2::text = '' or lower(lm.email) = $2)
     limit 1`,
    [token, email]
  );

  const invite = result.rows[0] as { email?: string | null; trang_thai?: string | null; het_han_luc?: Date | string | null; farm_name?: string | null } | undefined;
  if (!invite) {
    return NextResponse.json({ status: "not_found", message: "Không tìm thấy lời mời." }, { status: 404 });
  }

  const status = normalizeStatus(invite.trang_thai || "pending");
  const expiresAt = invite.het_han_luc ? new Date(invite.het_han_luc) : null;
  const expired = Boolean(expiresAt && expiresAt.getTime() <= Date.now());
  const farmName = invite.farm_name ? String(invite.farm_name) : null;

  if (status === "pending" && !expired) {
    return NextResponse.json({ status: "valid", email: invite.email, farmName, expiresAt: expiresAt?.toISOString() ?? null });
  }

  if (status === "accepted") {
    return NextResponse.json({ status: "accepted", email: invite.email, farmName, message: "Lời mời đã được chấp nhận." });
  }

  if (status === "declined") {
    return NextResponse.json({ status: "declined", email: invite.email, farmName, message: "Lời mời đã được từ chối." });
  }

  return NextResponse.json({ status: "expired", email: invite.email, farmName, message: "Lời mời đã hết hạn." });
}
