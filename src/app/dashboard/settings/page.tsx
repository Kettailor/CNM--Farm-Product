import { redirect } from "next/navigation";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getAccessibleFarm } from "@/lib/farm-access";

export default async function DashboardSettingsIndexPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/settings");

  const access = await getAccessibleFarm(ownerId);
  if (access?.canManageSettings) redirect("/dashboard/settings/thong-tin-trang-trai");
  if (access?.canManageUsers) redirect("/dashboard/settings/nguoi-dung");
  if (access?.canManageDocuments) redirect("/dashboard/settings/chung-tu");
  redirect("/dashboard");
}
