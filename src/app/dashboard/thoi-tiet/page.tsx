import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { layDuLieuThoiTietToiUu } from "@/lib/thoi-tiet";
import { redirect } from "next/navigation";
import WeatherDashboardClient from "./weather-dashboard-client";

export default async function DashboardThoiTietPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/thoi-tiet");

  const overview = await getDashboardOverview(ownerId);
  const weather = await layDuLieuThoiTietToiUu(overview.latitude, overview.longitude).catch(() => null);

  return (
    <DashboardShell farmName={overview.farmName} activePath="/dashboard/thoi-tiet">
      <WeatherDashboardClient
        farmName={overview.farmName}
        locationName={overview.locationName}
        latitude={overview.latitude}
        longitude={overview.longitude}
        initialWeather={weather}
      />
    </DashboardShell>
  );
}
