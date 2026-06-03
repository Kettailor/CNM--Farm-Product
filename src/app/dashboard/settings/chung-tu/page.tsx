import SettingsSectionClient from "../settings-section-client";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getAccessibleFarm } from "@/lib/farm-access";
import { redirect } from "next/navigation";

export default async function DocumentsSettingsPage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/settings/chung-tu");

  const access = await getAccessibleFarm(ownerId);
  if (!access?.canManageDocuments) redirect("/dashboard");

  return <SettingsSectionClient section="documents" />;
}
