import { redirect } from "next/navigation";

export default function LegacyZoneDetailPage({ params }: { params: { zoneId: string } }) {
  redirect(`/dashboard/khu-vuc/${encodeURIComponent(params.zoneId)}`);
}
