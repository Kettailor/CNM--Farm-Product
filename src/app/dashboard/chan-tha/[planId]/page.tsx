import { notFound, redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { loadGrazingPlanById } from "@/lib/grazing-data";
import GrazingPlanDetailClient from "./plan-detail-client";

export default async function GrazingPlanDetailPage({ params }: { params: { planId: string } }) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect(`/login?next=/dashboard/chan-tha/${params.planId}`);

  const overview = await getDashboardOverview(ownerId);
  if (!overview.farmId) redirect("/register/farm");

  const plan = await loadGrazingPlanById(overview.farmId, params.planId);
  if (!plan) notFound();

  return (
    <DashboardShell farmName={overview.farmName} activePath="/dashboard/chan-tha">
      <GrazingPlanDetailClient plan={plan} canWrite={overview.access.canWrite} />
    </DashboardShell>
  );
}
