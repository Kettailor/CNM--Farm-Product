import SettingsSectionClient from "../settings-section-client";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getAccessibleFarm } from "@/lib/farm-access";
import { redirect } from "next/navigation";

export default async function FarmSettingsPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/settings/thong-tin-trang-trai");

  const access = await getAccessibleFarm(ownerId);
  if (!access?.canManageSettings) redirect("/dashboard");

  return <SettingsSectionClient section="farm" />;
}
