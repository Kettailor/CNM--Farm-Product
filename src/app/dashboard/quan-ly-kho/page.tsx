import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { loadWarehouseItems, loadWarehouseZones } from "@/lib/warehouse-data";
import { redirect } from "next/navigation";
import WarehouseClient from "./warehouse-client";

export default async function WarehousePage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/quan-ly-kho");

  const overview = await getDashboardOverview(ownerId);
  if (!overview.farmId) redirect("/register/farm");

  const [items, zones] = await Promise.all([loadWarehouseItems(overview.farmId), loadWarehouseZones(overview.farmId)]);

  return (
    <DashboardShell farmName={overview.farmName} activePath="/dashboard/quan-ly-kho">
      <WarehouseClient
        farmName={overview.farmName}
        farmLocation={overview.locationName}
        initialItems={items}
        warehouseZones={zones}
      />
    </DashboardShell>
  );
}
