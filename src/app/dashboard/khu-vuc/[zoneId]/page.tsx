import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getZoneDetail } from "@/lib/dashboard-zone-detail";
import { buildVegetationDataset } from "@/lib/zone-vegetation";
import { redirect } from "next/navigation";
import styles from "./page.module.css";
import ZoneDetailClient from "./zone-detail-client";

export default async function DashboardKhuVucChiTietPage({ params }: { params: { zoneId: string } }) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/khu-vuc");

  const zone = await getZoneDetail(ownerId, params.zoneId);
  if (!zone) redirect("/dashboard/khu-vuc");

  const vegetation = buildVegetationDataset(zone.polygon, zone.areaHa);

  return (
    <DashboardShell farmName={zone.farmName} activePath="/dashboard/khu-vuc">
      <div className={styles.page}>
        <ZoneDetailClient zone={zone} vegetation={vegetation} />
      </div>
    </DashboardShell>
  );
}
