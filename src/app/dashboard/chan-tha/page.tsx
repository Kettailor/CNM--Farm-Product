import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { loadGrazingGroups, loadGrazingPaddocks, loadGrazingPlans } from "@/lib/grazing-data";
import { redirect } from "next/navigation";
import GrazingClient from "./grazing-client";

export default async function GrazingPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/chan-tha");

  const overview = await getDashboardOverview(ownerId);
  if (!overview.farmId) redirect("/register/farm");

  const [plans, paddocks, groups] = await Promise.all([
    loadGrazingPlans(overview.farmId),
    loadGrazingPaddocks(overview.farmId),
    loadGrazingGroups(overview.farmId),
  ]);

  return (
    <DashboardShell farmName={overview.farmName} activePath="/dashboard/chan-tha">
      <GrazingClient farmName={overview.farmName} initialPlans={plans} paddocks={paddocks} groups={groups} />
    </DashboardShell>
  );
}
