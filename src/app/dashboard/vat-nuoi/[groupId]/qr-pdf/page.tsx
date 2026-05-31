import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { loadLivestockGroupDetail } from "@/lib/livestock-detail";
import { renderQrSvg } from "@/lib/qr-code";
import PrintClient from "./print-client";
import styles from "./page.module.css";

type PageProps = {
  params: { groupId: string };
};

function formatDate(value: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function LivestockQrPdfPage({ params }: PageProps) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect(`/login?next=/dashboard/vat-nuoi/${params.groupId}/qr-pdf`);

  const detail = await loadLivestockGroupDetail(ownerId, params.groupId);
  if (!detail) notFound();

  const printableAnimals = detail.animals.map((animal) => ({
    ...animal,
    printableQr: animal.qrCode || animal.code || animal.id,
  }));

  return (
    <main className={styles.page}>
      <header className={styles.toolbar}>
        <div>
          <strong>Xuất PDF mã QR</strong>
          <span>{detail.group.name}</span>
        </div>
        <nav>
          <Link href={`/dashboard/vat-nuoi/${detail.group.id}`}>Quay lại chi tiết</Link>
          <PrintClient className={styles.printButton} />
        </nav>
      </header>

      <section className={styles.sheet}>
        <div className={styles.sheetHeader}>
          <div>
            <p>KetKat-EcoFarm</p>
            <h1>Mã QR nhóm vật nuôi</h1>
            <span>{detail.farm.name}</span>
          </div>
          <div>
            <strong>{detail.group.name}</strong>
            <span>{detail.group.code}</span>
            <span>{detail.group.species} · {detail.group.breed || "Chưa cập nhật giống"}</span>
            <span>Ngày xuất: {formatDate(new Date().toISOString())}</span>
          </div>
        </div>

        <div className={styles.qrGrid}>
          {printableAnimals.map((animal) => (
            <article key={animal.id} className={styles.qrCard}>
              <div className={styles.qrImage} dangerouslySetInnerHTML={{ __html: renderQrSvg(animal.printableQr, { margin: 4 }) }} />
              <div className={styles.qrMeta}>
                <strong>{animal.code || "Chưa có mã vật nuôi"}</strong>
                <span>{animal.printableQr}</span>
                <small>{detail.group.name}</small>
                <small>{detail.zone?.name || "Chưa gắn khu vực"}</small>
              </div>
            </article>
          ))}
        </div>

        {printableAnimals.length === 0 && (
          <div className={styles.emptyState}>Nhóm này chưa có hồ sơ vật nuôi để xuất mã QR.</div>
        )}
      </section>
    </main>
  );
}
