import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { loadWarehouseZones } from "@/lib/warehouse-data";
import { redirect } from "next/navigation";
import WarehouseForm from "../warehouse-form";
import WarehouseIcon from "../warehouse-icons";
import WarehouseTools from "../warehouse-tools";
import styles from "../page.module.css";

export default async function WarehouseCreatePage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/quan-ly-kho/tao-moi");

  const overview = await getDashboardOverview(ownerId);
  if (!overview.farmId) redirect("/register/farm");
  const zones = await loadWarehouseZones(overview.farmId);

  return (
    <DashboardShell farmName={overview.farmName} activePath="/dashboard/quan-ly-kho">
      <div className={styles.page}>
        <section className={styles.topBar}>
          <div className={styles.titleBlock}>
            <span className={styles.titleIcon}><WarehouseIcon name="plus" /></span>
            <div>
              <p className={styles.eyebrow}>Tác vụ kho</p>
              <h1>Thêm danh mục</h1>
              <span>{overview.farmName}</span>
            </div>
          </div>
          <WarehouseTools />
        </section>

        <section>
          <WarehouseForm zones={zones} />
        </section>
      </div>
    </DashboardShell>
  );
}
