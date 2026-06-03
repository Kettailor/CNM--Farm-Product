import { NextRequest, NextResponse } from "next/server";
import { cauHinhCookieXacThuc, layOwnerIdTuServerCookie, TEN_COOKIE_XAC_THUC } from "@/lib/auth";
import { deleteSettingsFarm, loadSettingsProfile, SettingsAccessError, updateSettingsProfile } from "@/lib/settings-overview";

export async function GET() {
  try {
    const ownerId = layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });

    const profile = await loadSettingsProfile(ownerId);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ message: "Không thể tải thông tin cài đặt.", error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;
    await updateSettingsProfile(ownerId, body);
    const profile = await loadSettingsProfile(ownerId);

    return NextResponse.json({ message: "Cập nhật cài đặt thành công.", profile });
  } catch (error) {
    if (error instanceof SettingsAccessError) {
      return NextResponse.json({ message: error.message, error: String(error) }, { status: error.status });
    }
    return NextResponse.json({ message: "Không thể cập nhật cài đặt.", error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ownerId = layOwnerIdTuServerCookie();
    if (!ownerId) return NextResponse.json({ message: "Chưa đăng nhập." }, { status: 401 });

    let farmId: string | null = null;
    let confirmFarmDeletion = false;
    let confirmAccountDeletion = false;
    try {
      const body = (await request.json()) as Record<string, unknown>;
      farmId = typeof body.farm_id === "string" ? body.farm_id : null;
      confirmFarmDeletion = body.confirm_farm_deletion === true;
      confirmAccountDeletion = body.confirm_account_deletion === true;
    } catch {
      farmId = null;
    }

    const deleteResult = await deleteSettingsFarm(ownerId, farmId, {
      confirmFarmDeletion,
      confirmAccountDeletion,
    });

    if (deleteResult.deletedAccount) {
      const response = NextResponse.json({
        message: "Đã xóa tài khoản và trang trại cuối cùng.",
        profile: null,
        deletedAccount: true,
      });
      response.cookies.set(TEN_COOKIE_XAC_THUC, "", { ...cauHinhCookieXacThuc, maxAge: 0 });
      response.cookies.set("ownerId", "", { ...cauHinhCookieXacThuc, maxAge: 0 });
      return response;
    }

    const profile = await loadSettingsProfile(ownerId);

    return NextResponse.json({ message: "Đã xóa trang trại.", profile, deletedAccount: false });
  } catch (error) {
    if (error instanceof SettingsAccessError) {
      return NextResponse.json({ message: error.message, error: String(error) }, { status: error.status });
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể xóa trang trại.", error: String(error) },
      { status: 500 }
    );
  }
}
