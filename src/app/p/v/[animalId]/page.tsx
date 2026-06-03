import { redirect } from "next/navigation";
import { buildPublicLivestockAnimalPath } from "@/lib/public-livestock-url";

type PageProps = {
  params: { animalId: string };
};

export default function PublicLivestockShortLinkPage({ params }: PageProps) {
  redirect(buildPublicLivestockAnimalPath(params.animalId));
}
