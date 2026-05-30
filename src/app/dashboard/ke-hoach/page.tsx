import DashboardShell from "@/components/dashboard-shell";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { loadGrazingPlans } from "@/lib/grazing-data";
import { GRAZING_STATUS_LABELS, type GrazingPlan } from "@/lib/grazing-types";
import { redirect } from "next/navigation";
import PlanningClient, { type PlanOverviewItem } from "./planning-client";

const today = () => new Date().toISOString().slice(0, 10);

const DEMO_PLANS: PlanOverviewItem[] = [
  {
    id: "demo-fence-repair",
    title: "Sửa hàng rào khu Đông",
    status: "overdue",
    completedTasks: 1,
    totalTasks: 5,
    members: 4,
    comments: 0,
    attachments: 0,
    createdAt: "2026-02-28",
    description: "Gia cố hàng rào phía Đông, thay cọc yếu và kiểm tra lối ra vào của đàn.",
    source: "demo",
  },
  {
    id: "demo-crop-rotation",
    title: "Luân canh mùa vụ",
    status: "active",
    completedTasks: 1,
    totalTasks: 3,
    members: 4,
    comments: 0,
    attachments: 0,
    createdAt: "2026-04-30",
    description: "Chuẩn bị cơ cấu cây trồng cho mùa kế tiếp và phân bổ khu vực canh tác.",
    source: "demo",
  },
  {
    id: "demo-health-check",
    title: "Kiểm tra sức khỏe vật nuôi",
    status: "overdue",
    completedTasks: 1,
    totalTasks: 3,
    members: 4,
    comments: 0,
    attachments: 0,
    createdAt: "2026-03-30",
    description: "Theo dõi lịch kiểm tra định kỳ, tiêm phòng và xử lý các cảnh báo sức khỏe.",
    source: "demo",
  },
  {
    id: "demo-equipment",
    title: "Bảo trì thiết bị",
    status: "active",
    completedTasks: 0,
    totalTasks: 2,
    members: 4,
    comments: 0,
    attachments: 0,
    createdAt: "2026-04-30",
    description: "Bảo dưỡng máy bơm, dụng cụ phun xịt và thiết bị vận hành trong kho.",
    source: "demo",
  },
  {
    id: "demo-water-system",
    title: "Bảo trì hệ thống nước",
    status: "completed",
    completedTasks: 3,
    totalTasks: 3,
    members: 4,
    comments: 0,
    attachments: 0,
    createdAt: "2026-03-30",
    description: "Kiểm tra đường ống, bồn chứa và áp lực nước phục vụ chăn nuôi.",
    source: "demo",
  },
];

function mapStatus(plan: GrazingPlan): PlanOverviewItem["status"] {
  if (plan.status === "da_huy") return "cancelled";
  if (plan.status === "completed") return "completed";
  if (plan.status === "paused") return "paused";
  if (plan.status === "future") return "upcoming";
  if (plan.endDate && plan.endDate < today()) return "overdue";
  if (plan.startDate && plan.startDate > today()) return "upcoming";
  return "active";
}

function mapGrazingPlan(plan: GrazingPlan): PlanOverviewItem {
  const totalTasks = Math.max(1, plan.events.length + plan.paddocks.length + plan.groups.length);
  const completedTasks =
    plan.status === "completed"
      ? totalTasks
      : plan.events.filter((event) => event.status === "completed").length;

  return {
    id: plan.id,
    title: plan.name,
    status: mapStatus(plan),
    completedTasks,
    totalTasks,
    members: Math.max(1, plan.groups.length),
    comments: 0,
    attachments: 0,
    createdAt: plan.createdAt?.slice(0, 10) ?? plan.startDate ?? today(),
    description:
      plan.note ||
      `${GRAZING_STATUS_LABELS[plan.status]} - ${plan.paddocks.length} khu vực, ${plan.groups.length} nhóm vật nuôi, ${plan.events.length} sự kiện.`,
    source: "grazing",
  };
}

export default async function PlanningPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/ke-hoach");

  const overview = await getDashboardOverview(ownerId);
  if (!overview.farmId) redirect("/register/farm");

  let grazingPlans: GrazingPlan[] = [];
  try {
    grazingPlans = await loadGrazingPlans(overview.farmId);
  } catch {
    grazingPlans = [];
  }

  const plans = grazingPlans.length > 0 ? grazingPlans.map(mapGrazingPlan) : DEMO_PLANS;

  return (
    <DashboardShell farmName={overview.farmName} activePath="/dashboard/ke-hoach">
      <PlanningClient initialPlans={plans} />
    </DashboardShell>
  );
}
