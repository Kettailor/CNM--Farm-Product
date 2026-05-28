import { getDashboardOverview } from "@/lib/dashboard-overview";

export async function getLatestFarmOverview(ownerId: string) {
  return getDashboardOverview(ownerId);
}

export async function getFallbackFarmName(): Promise<string> {
  return "Trang trại";
}
