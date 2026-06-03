import { NextResponse } from "next/server";
import { getZoneDetail } from "@/lib/dashboard-zone-detail";
import { buildVegetationDataset } from "@/lib/zone-vegetation";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { zoneId: string } }) {
  try {
    const zone = await getZoneDetail(null, params.zoneId);
    if (!zone) {
      return NextResponse.json({ message: "Không tìm thấy khu vực." }, { status: 404 });
    }

    const vegetation = buildVegetationDataset(zone.polygon, zone.areaHa);
    return NextResponse.json({
      zoneId: zone.id,
      source: "database+polygon",
      updatedAt: zone.updatedAt || new Date().toISOString(),
      vegetation,
    });
  } catch (error) {
    return NextResponse.json({ message: "Không thể tải dữ liệu cho khu vực.", error: String(error) }, { status: 500 });
  }
}
