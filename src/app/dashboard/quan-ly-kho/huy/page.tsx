import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { loadWarehouseItems, loadWarehouseZones } from "@/lib/warehouse-data";
import { redirect } from "next/navigation";
import WarehouseCancelClient from "./warehouse-cancel-client";

export default async function WarehouseCancelPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/quan-ly-kho/huy");

  const overview = await getDashboardOverview(ownerId);
  if (!overview.farmId) redirect("/register/farm");
  if (!overview.access.canWrite) redirect("/dashboard/quan-ly-kho");

  const [items, zones] = await Promise.all([loadWarehouseItems(overview.farmId), loadWarehouseZones(overview.farmId)]);

  return (
    <DashboardShell farmName={overview.farmName} activePath="/dashboard/quan-ly-kho">
      <WarehouseCancelClient farmName={overview.farmName} items={items} zones={zones} />
    </DashboardShell>
  );
}
