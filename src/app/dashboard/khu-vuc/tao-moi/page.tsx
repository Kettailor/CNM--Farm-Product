import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getFarmLocation } from "@/lib/dashboard-zone-list";
import { redirect } from "next/navigation";
import ZoneCreateWizard from "@/app/dashboard/khu-vuc/tao-moi/zone-create-wizard";

export default async function DashboardKhuVucTaoMoiPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/khu-vuc/tao-moi");

  const farmLocation = await getFarmLocation(ownerId);

  return (
    <DashboardShell farmName={farmLocation?.farmName ?? "Trang trại"} activePath="/dashboard/khu-vuc">
      <ZoneCreateWizard ownerId={ownerId} initialLocation={farmLocation} />
    </DashboardShell>
  );
}
