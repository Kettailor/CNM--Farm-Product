import DashboardShell from "@/components/dashboard-shell";
import ZoneBrowser from "@/components/dashboard-zone-browser";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { getZoneList } from "@/lib/dashboard-zone-list";
import { redirect } from "next/navigation";

export default async function DashboardKhuVucPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/khu-vuc");

  const [{ farmName, zones, filters, location }, overview] = await Promise.all([
    getZoneList(ownerId),
    getDashboardOverview(ownerId),
  ]);

  return (
    <DashboardShell farmName={farmName} activePath="/dashboard/khu-vuc">
      <ZoneBrowser
        farmName={farmName}
        zones={zones}
        filters={filters}
        location={location}
        canWrite={overview.access.canWrite}
        canOpenSettings={overview.access.canManageSettings || overview.access.canManageUsers || overview.access.canManageDocuments}
      />
    </DashboardShell>
  );
}
