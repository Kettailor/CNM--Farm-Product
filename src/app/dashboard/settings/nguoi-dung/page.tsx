import SettingsSectionClient from "../settings-section-client";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getAccessibleFarm } from "@/lib/farm-access";
import { redirect } from "next/navigation";

export default async function UsersSettingsPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/settings/nguoi-dung");

  const access = await getAccessibleFarm(ownerId);
  if (!access?.canManageUsers) redirect("/dashboard");

  return <SettingsSectionClient section="users" />;
}
