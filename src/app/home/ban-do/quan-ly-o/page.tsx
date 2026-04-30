import { redirect } from "next/navigation";

export default function LegacyZonesPage() {
  redirect("/dashboard/zones");
}

