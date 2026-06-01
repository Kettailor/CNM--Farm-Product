import DashboardShell from "@/components/dashboard-shell";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { loadChemicalProfile } from "@/lib/chemical-data";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import WarehouseIcon from "../../quan-ly-kho/warehouse-icons";
import styles from "./page.module.css";

type PageProps = {
  params: {
    chemicalId: string;
  };
};

function formatNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function usageActionLabel(value: string) {
  const labels: Record<string, string> = {
    xuat_dieu_tri: "Điều trị",
    nhap_kho: "Nhập kho",
    dieu_chinh: "Điều chỉnh",
    su_dung: "Sử dụng",
  };
  return labels[value] ?? value.replace(/_/g, " ");
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    xuat_dieu_tri: "Hoàn tất",
    nhap_kho: "Đã ghi nhận",
    dieu_chinh: "Đã điều chỉnh",
    su_dung: "Hoàn tất",
  };
  return labels[value] ?? "Đã ghi nhận";
}

export default async function ChemicalDetailPage({ params }: PageProps) {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect(`/login?next=/dashboard/ho-so-hoa-chat/${params.chemicalId}`);

  const overview = await getDashboardOverview(ownerId);
  if (!overview.farmId) redirect("/dashboard");

  const profile = await loadChemicalProfile(overview.farmId);
  const product = profile.products.find((item) => item.id === params.chemicalId);
  if (!product) notFound();

  const relatedLogs = profile.usageLogs.filter((log) => log.itemId === product.id);
  const zone = profile.zones.find((item) => item.id === product.zoneId) ?? profile.zones[0] ?? null;
  const zonesWithPolygon = zone?.polygon.length ? [zone] : profile.zones.filter((item) => item.polygon.length >= 3);
  const totalVolume = product.totalVolume ?? product.quantity;
  const remaining = product.quantity;
  const used = Math.max(totalVolume - remaining, 0);
  const remainingPercent = totalVolume > 0 ? Math.max(0, Math.min(100, (remaining / totalVolume) * 100)) : 0;

  const detailRows = [
    ["Tên rút gọn", product.chemicalAlias || product.code],
    ["Tên sản phẩm", product.name],
    ["Phân loại", product.chemicalProductType || product.group || "-"],
    ["Đơn giá", formatCurrency(product.unitCost)],
    ["Tổng chi phí", formatCurrency(product.totalCost ?? product.estimatedValue)],
    ["Số lô", product.batchNumber || "-"],
    ["Nhà cung cấp", product.supplier || "-"],
    ["Vị trí lưu trữ", product.location || product.zoneName || "-"],
    ["Ngày mua", formatDate(product.purchaseDate || product.receivedDate)],
    ["Ngày sản xuất", formatDate(product.manufactureDate)],
    ["WHP", product.whpDays == null ? "-" : `${product.whpDays} ngày`],
    ["ESI", product.esiDays == null ? "-" : `${product.esiDays} ngày`],
    ["Mô tả", product.productDescription || product.note || "-"],
  ];

  return (
    <DashboardShell farmName={overview.farmName} activePath="/dashboard/ho-so-hoa-chat">
      <div className={styles.page}>
        <section className={styles.topBar}>
          <div className={styles.titleBlock}>
            <span className={styles.titleIcon}><WarehouseIcon name="chemical" /></span>
            <div>
              <p className={styles.eyebrow}>Hồ sơ hóa chất</p>
              <h1>{product.name}</h1>
              <span>{product.chemicalAlias || product.code}</span>
            </div>
          </div>
          <div className={styles.actions}>
            <Link className={styles.secondaryButton} href="/dashboard/ho-so-hoa-chat">
              <span><WarehouseIcon name="back" /></span>
              Quay lại
            </Link>
            {overview.access.canWrite && (
            <Link className={styles.actionButton} href="/dashboard/quan-ly-kho/chinh-sua">
              <span><WarehouseIcon name="edit" /></span>
              Tác vụ
            </Link>
            )}
          </div>
        </section>

        <section className={styles.detailCard}>
          <article className={styles.detailsPanel}>
            <h2>Chi tiết</h2>
            <dl>
              {detailRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className={styles.usagePanel}>
            <h2>Sử dụng</h2>
            <div className={styles.progressHead}>
              <span>Sản phẩm còn lại</span>
              <strong>{formatNumber(remainingPercent)}%</strong>
            </div>
            <div className={styles.progressTrack} aria-label="Tỷ lệ sản phẩm còn lại">
              <span style={{ width: `${remainingPercent}%` }} />
            </div>
            <dl>
              <div><dt>Đơn vị đo</dt><dd>{product.volumeUnit || product.unit}</dd></div>
              <div><dt>Đã dùng</dt><dd>{formatNumber(used)} {product.volumeUnit || product.unit}</dd></div>
              <div><dt>Còn lại</dt><dd>{formatNumber(remaining)} {product.volumeUnit || product.unit}</dd></div>
              <div><dt>Tổng lượng</dt><dd>{formatNumber(totalVolume)} {product.volumeUnit || product.unit}</dd></div>
              <div><dt>Số đơn vị</dt><dd>{formatNumber(product.unitCount)}</dd></div>
              <div><dt>Dung tích mỗi đơn vị</dt><dd>{formatNumber(product.volumePerUnit)} {product.volumeUnit || product.unit}</dd></div>
              <div><dt>Hạn sử dụng</dt><dd>{formatDate(product.expiryDate)}</dd></div>
            </dl>
          </article>
        </section>

        <section className={styles.recordPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Nhật ký sử dụng</p>
              <h2>{formatNumber(relatedLogs.length)} bản ghi</h2>
            </div>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Ngày ghi nhận</th>
                  <th>Loại</th>
                  <th>Trạng thái</th>
                  <th>WHP</th>
                  <th>ESI</th>
                  <th>Lô</th>
                  <th>Nguồn nghiệp vụ</th>
                  <th>Lượng dùng</th>
                  <th>Số lượng trước</th>
                  <th>Số lượng sau</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {relatedLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.createdAt)}</td>
                    <td>{usageActionLabel(log.actionType)}</td>
                    <td><span className={styles.statusDot} />{statusLabel(log.actionType)}</td>
                    <td>{product.whpDays == null ? "-" : `${product.whpDays} ngày`}</td>
                    <td>{product.esiDays == null ? "-" : `${product.esiDays} ngày`}</td>
                    <td>{product.batchNumber || log.itemCode || "-"}</td>
                    <td>{log.source || "-"}</td>
                    <td>{formatNumber(log.quantity)} {log.unit || product.unit}</td>
                    <td>{log.beforeQuantity == null ? "-" : `${formatNumber(log.beforeQuantity)} ${log.unit || product.unit}`}</td>
                    <td>{log.afterQuantity == null ? "-" : `${formatNumber(log.afterQuantity)} ${log.unit || product.unit}`}</td>
                    <td>{log.note || "-"}</td>
                  </tr>
                ))}
                {relatedLogs.length === 0 && (
                  <tr>
                    <td colSpan={11}><div className={styles.emptyState}>Chưa có nhật ký sử dụng cho hóa chất này.</div></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.mapPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Khu vực hóa chất</p>
              <h2>{zone?.name || product.location || "Vị trí lưu trữ"}</h2>
            </div>
          </div>
          <div className={styles.mapShell}>
            <MapViewSwitcher
              lat={overview.latitude}
              lng={overview.longitude}
              zoom={16}
              title={zone?.name || product.name}
              initialMode="satellite"
              hideEcoNote
              zones={zonesWithPolygon.map((item) => ({
                id: item.id,
                label: item.name,
                color: item.color || "#1f7a4a",
                kind: "hoa_chat",
                polygon: item.polygon,
              }))}
              fitToPolygon={zonesWithPolygon.length > 0}
            />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
