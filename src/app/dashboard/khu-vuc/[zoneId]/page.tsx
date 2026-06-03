import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { getZoneDetail } from "@/lib/dashboard-zone-detail";
import { buildVegetationDataset } from "@/lib/zone-vegetation";
import { redirect } from "next/navigation";
import styles from "./page.module.css";
import ZoneDetailClient from "./zone-detail-client";

export default async function DashboardKhuVucChiTietPage({ params }: { params: { zoneId: string } }) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/khu-vuc");

  const [zone, overview] = await Promise.all([
    getZoneDetail(ownerId, params.zoneId),
    getDashboardOverview(ownerId),
  ]);
  if (!zone) redirect("/dashboard/khu-vuc");

  const vegetation = buildVegetationDataset(zone.polygon, zone.areaHa);

  return (
    <DashboardShell farmName={zone.farmName} activePath="/dashboard/khu-vuc">
      <div className={styles.page}>
        <ZoneDetailClient
          zone={zone}
          vegetation={vegetation}
          canWrite={overview.access.canWrite}
          canOpenSettings={overview.access.canManageSettings || overview.access.canManageUsers || overview.access.canManageDocuments}
        />
      </div>
    </DashboardShell>
  );
}
