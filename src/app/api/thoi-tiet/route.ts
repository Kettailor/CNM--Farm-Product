import { NextRequest, NextResponse } from "next/server";
import { layOwnerIdTuRequest } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { layDuLieuThoiTietToiUu } from "@/lib/thoi-tiet";

export const dynamic = "force-dynamic";

const DEFAULT_COORD = { latitude: 10.762622, longitude: 106.660172 };

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    let viDo = Number(sp.get("vi_do") ?? sp.get("lat") ?? "");
    let kinhDo = Number(sp.get("kinh_do") ?? sp.get("lng") ?? "");
    let tenViTri: string | null = null;
    let tenTrangTrai: string | null = null;

    if (!Number.isFinite(viDo) || !Number.isFinite(kinhDo)) {
      const ownerId = layOwnerIdTuRequest(request);
      if (!ownerId) {
        return NextResponse.json(
          { message: "Thiếu tọa độ hoặc phiên đăng nhập để xác định nông trại hiện tại." },
          { status: 400 }
        );
      }

      try {
        const overview = await getDashboardOverview(ownerId);
        viDo = overview.latitude;
        kinhDo = overview.longitude;
        tenViTri = overview.locationName;
        tenTrangTrai = overview.farmName;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("[weather_farm_location_unavailable]", error);
        viDo = DEFAULT_COORD.latitude;
        kinhDo = DEFAULT_COORD.longitude;
        tenViTri = "Tọa độ mặc định TP. Hồ Chí Minh";
        tenTrangTrai = null;
      }
    }

    if (!Number.isFinite(viDo) || !Number.isFinite(kinhDo)) {
      return NextResponse.json(
        { message: "Tọa độ nông trại không hợp lệ. Cần vi_do và kinh_do." },
        { status: 400 }
      );
    }

    const lamMoi = ["1", "true", "yes"].includes(String(sp.get("lam_moi") ?? "").toLowerCase());
    const duLieu = await layDuLieuThoiTietToiUu(viDo, kinhDo, lamMoi);

    return NextResponse.json({
      he_thong: "KetKat-EcoFarm",
      nguon: "Open-Meteo",
      "nong_trai": tenTrangTrai,
      vi_tri: tenViTri,
      du_lieu: duLieu,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Không lấy được dữ liệu thời tiết.", error: String(error) },
      { status: 500 }
    );
  }
}
