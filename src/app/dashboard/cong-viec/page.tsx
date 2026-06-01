import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { loadWorkTasks } from "@/lib/cong-viec-data";
import { WORK_TYPE_LABELS, type WorkTask } from "@/lib/cong-viec-types";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { getZoneList } from "@/lib/dashboard-zone-list";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import WorkClient, { type WorkOverviewItem, type WorkUserOption, type WorkZoneOption } from "./work-client";

const today = () => new Date().toISOString().slice(0, 10);

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? null;
}

function mapStatus(task: WorkTask): WorkOverviewItem["status"] {
  if (task.status === "da_huy") return "cancelled";
  if (task.status === "hoan_thanh") return "completed";
  if (task.status === "tam_dung") return "paused";
  if (task.status === "qua_han") return "overdue";
  if (task.dueDate && task.dueDate < today()) return "overdue";
  if (task.status === "sap_toi" || (task.startDate && task.startDate > today())) return "upcoming";
  return "active";
}

function mapWorkTask(task: WorkTask): WorkOverviewItem {
  const totalItems = task.items.filter((item) => item.status !== "da_huy").length;
  const completedItems = task.status === "hoan_thanh"
    ? totalItems
    : task.items.filter((item) => item.status === "hoan_thanh").length;

  return {
    id: task.id,
    title: task.title,
    status: mapStatus(task),
    completedItems,
    totalItems,
    owner: task.owner,
    createdAt: task.createdAt?.slice(0, 10) ?? task.startDate ?? today(),
    dueDate: task.dueDate,
    workType: WORK_TYPE_LABELS[task.type],
    description: task.description || `${WORK_TYPE_LABELS[task.type]} - ${totalItems} hạng mục công việc.`,
    items: task.items,
  };
}

async function loadFarmUsers(farmId: string, ownerId: string): Promise<WorkUserOption[]> {
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

export default async function WorkPage({ searchParams }: PageProps) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/cong-viec");

  const overview = await getDashboardOverview(ownerId);
  if (!overview.farmId) redirect("/register/farm");

  const tasks = await loadWorkTasks(overview.farmId);
  const [users, zoneData] = await Promise.all([
    loadFarmUsers(overview.farmId, ownerId),
    getZoneList(ownerId),
  ]);
  const zones: WorkZoneOption[] = zoneData.zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    color: zone.color,
    polygon: zone.polygon,
  }));

  return (
    <DashboardShell farmName={overview.farmName} activePath="/dashboard/cong-viec">
      <WorkClient
        initialTasks={tasks.map(mapWorkTask)}
        initialSelectedTaskId={singleParam(searchParams?.workId)}
        users={users}
        zones={zones}
        lat={overview.latitude}
        lng={overview.longitude}
        canWrite={overview.access.canWrite}
      />
    </DashboardShell>
  );
}
