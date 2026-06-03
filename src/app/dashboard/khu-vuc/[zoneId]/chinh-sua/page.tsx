import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getZoneDetail } from "@/lib/dashboard-zone-detail";
import { requireFarmAccess } from "@/lib/farm-access";
import { buildVegetationDataset } from "@/lib/zone-vegetation";
import { redirect } from "next/navigation";
import EditZoneClient from "./edit-zone-client";

export default async function DashboardKhuVucChinhSuaPage({ params }: { params: { zoneId: string } }) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect(`/login?next=/dashboard/khu-vuc/${params.zoneId}/chinh-sua`);
  const access = await requireFarmAccess(ownerId, "write");
  if (!access) redirect(`/dashboard/khu-vuc/${params.zoneId}`);

  const zone = await getZoneDetail(ownerId, params.zoneId);
  if (!zone) redirect("/dashboard/khu-vuc");

  const vegetation = buildVegetationDataset(zone.polygon, zone.areaHa);

  return (
    <DashboardShell farmName={zone.farmName} activePath="/dashboard/khu-vuc">
      <EditZoneClient zone={zone} vegetation={vegetation} />
    </DashboardShell>
  );
}
