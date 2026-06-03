import { NextRequest, NextResponse } from "next/server";
import { loadPublicLivestockAnimalDetailByCode } from "@/lib/livestock-detail";
import { buildPublicLivestockAnimalPath } from "@/lib/public-livestock-url";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? request.nextUrl.searchParams.get("q") ?? "";
  if (!code.trim()) {
    return NextResponse.json({ message: "Vui lòng cung cấp mã QR hoặc mã vật nuôi." }, { status: 400 });
  }

  try {
    const detail = await loadPublicLivestockAnimalDetailByCode(code);
    if (!detail) {
      return NextResponse.json({ message: "Không tìm thấy hồ sơ vật nuôi từ mã QR này." }, { status: 404 });
    }

    return NextResponse.json({
      animal: detail.animal,
      group: detail.group,
      farm: detail.farm,
      zone: detail.zone,
      latestEvent: detail.events[0] ?? null,
      latestTreatment: detail.treatments[0] ?? null,
      eventCount: detail.events.length,
      treatmentCount: detail.treatments.length,
      publicPath: buildPublicLivestockAnimalPath(detail.animal.id),
    });
  } catch (error) {
    return NextResponse.json({ message: "Không thể tra cứu hồ sơ vật nuôi.", error: String(error) }, { status: 500 });
  }
}
