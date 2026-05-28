import { NextResponse } from "next/server";
import { getPublicFarmMapItems } from "@/lib/public-farm-map";

export async function GET() {
  try {
    const farms = await getPublicFarmMapItems();
    return NextResponse.json({ farms });
  } catch (error) {
    return NextResponse.json({ message: "Không thể tải dữ liệu bản đồ công khai.", error: String(error) }, { status: 500 });
  }
}
