import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { db } from "@/lib/db";
import { loadGrazingGroups, loadGrazingPaddocks, loadGrazingPlans } from "@/lib/grazing-data";
import { redirect } from "next/navigation";
import GrazingClient from "./grazing-client";

export type GrazingUserOption = {
  id: string;
  name: string;
  email: string | null;
};

async function loadFarmUsers(farmId: string, ownerId: string): Promise<GrazingUserOption[]> {
  const result = await db.query<{ id: string; name: string | null; email: string | null; sort_order: number }>(
    `select u.id::text,
            coalesce(nullif(u.ho_ten, ''), nullif(u.email, ''), 'Người dùng') as name,
            u.email,
            case when u.id = $2 then 0 else 1 end as sort_order
     from du_lieu.nguoi_dung u
     where u.id = $2
        or exists (
          select 1
          from du_lieu.thanh_vien_trang_trai tv
          where tv.trang_trai_id = $1
            and tv.nguoi_dung_id = u.id
            and coalesce(lower(tv.trang_thai), '') not in ('inactive', 'disabled', 'da_huy', 'da huy', 'đã hủy', 'cancelled')
        )
     order by sort_order asc, name asc`,
    [farmId, ownerId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name ?? row.email ?? "Người dùng",
    email: row.email,
  }));
}

export default async function GrazingPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/chan-tha");

  const overview = await getDashboardOverview(ownerId);
  if (!overview.farmId) redirect("/register/farm");

  const [plans, paddocks, groups, users] = await Promise.all([
    loadGrazingPlans(overview.farmId),
    loadGrazingPaddocks(overview.farmId),
    loadGrazingGroups(overview.farmId),
    loadFarmUsers(overview.farmId, ownerId),
  ]);

  return (
    <DashboardShell farmName={overview.farmName} activePath="/dashboard/chan-tha">
      <GrazingClient farmName={overview.farmName} initialPlans={plans} paddocks={paddocks} groups={groups} users={users} canWrite={overview.access.canWrite} />
    </DashboardShell>
  );
}
