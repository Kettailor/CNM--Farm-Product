import DashboardShell from "@/components/dashboard-shell";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import { layOwnerIdTuServerCookie } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-overview";
import { loadChemicalProfile } from "@/lib/chemical-data";
import Link from "next/link";
import { redirect } from "next/navigation";
import WarehouseIcon from "../quan-ly-kho/warehouse-icons";
import styles from "./page.module.css";

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

function isExpired(value: string | null) {
  if (!value) return false;
  return new Date(`${value}T23:59:59`).getTime() < Date.now();
}

function usageActionLabel(value: string) {
  const labels: Record<string, string> = {
    xuat_dieu_tri: "Xuất dùng điều trị",
    nhap_kho: "Nhập kho",
    dieu_chinh: "Điều chỉnh",
    su_dung: "Sử dụng",
  };
  return labels[value] ?? value.replace(/_/g, " ");
}

export default async function ChemicalProfilePage() {
  const ownerId = layOwnerIdTuServerCookie();
  if (!ownerId) redirect("/login?next=/dashboard/ho-so-hoa-chat");

  const overview = await getDashboardOverview(ownerId);
  if (!overview.farmId) redirect("/dashboard");

  const profile = await loadChemicalProfile(overview.farmId);
  const products = profile.products;
  const totalValue = products.reduce((sum, item) => sum + (item.totalCost ?? item.estimatedValue ?? 0), 0);
  const totalVolume = products.reduce((sum, item) => sum + (item.totalVolume ?? item.quantity), 0);
  const expiredCount = products.filter((item) => isExpired(item.expiryDate)).length;
  const zonesWithPolygon = profile.zones.filter((zone) => zone.polygon.length >= 3);

  return (
    <DashboardShell farmName={overview.farmName} activePath="/dashboard/ho-so-hoa-chat">
      <div className={styles.page}>
        <section className={styles.topBar}>
          <div className={styles.titleBlock}>
            <span className={styles.titleIcon}><WarehouseIcon name="chemical" /></span>
            <div>
              <p className={styles.eyebrow}>Hồ sơ hóa chất</p>
              <h1>Quản lý sản phẩm hóa chất</h1>
              <span>{overview.locationName || "Theo dõi hóa chất, nhật ký sử dụng và khu vực lưu trữ"}</span>
            </div>
          </div>
          <a className={styles.actionButton} href="/dashboard/quan-ly-kho/tao-moi">Thêm hóa chất</a>
        </section>

        <section className={styles.overviewGrid} aria-label="Tổng quan hóa chất">
          <article><span>Sản phẩm hóa chất</span><strong>{formatNumber(products.length)}</strong></article>
          <article><span>Tổng dung tích</span><strong>{formatNumber(totalVolume)}</strong></article>
          <article><span>Tổng chi phí</span><strong>{formatCurrency(totalValue)}</strong></article>
          <article><span>Hết hạn</span><strong>{formatNumber(expiredCount)}</strong></article>
        </section>

        <section className={styles.tablePanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Sản phẩm hóa chất</p>
              <h2>{formatNumber(products.length)} sản phẩm</h2>
            </div>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Tên rút gọn</th>
                  <th>Tên sản phẩm</th>
                  <th>Phân loại</th>
                  <th>WHP</th>
                  <th>ESI</th>
                  <th>Số đơn vị</th>
                  <th>Dung tích / đơn vị</th>
                  <th>Tổng dung tích</th>
                  <th>Đơn giá</th>
                  <th>Tổng chi phí</th>
                  <th>Số lô</th>
                  <th>Nhà cung cấp</th>
                  <th>Vị trí lưu trữ</th>
                  <th>Ngày mua</th>
                  <th>Ngày sản xuất</th>
                  <th>Ngày hết hạn</th>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => (
                  <tr key={item.id}>
                    <td>{item.chemicalAlias || item.code}</td>
                    <td>
                      <strong><Link className={styles.itemLink} href={`/dashboard/ho-so-hoa-chat/${item.id}`}>{item.name}</Link></strong>
                      <small>{item.productDescription || item.note || "-"}</small>
                    </td>
                    <td>{item.chemicalProductType || item.group || "-"}</td>
                    <td>{item.whpDays == null ? "-" : `${item.whpDays} ngày`}</td>
                    <td>{item.esiDays == null ? "-" : `${item.esiDays} ngày`}</td>
                    <td>{formatNumber(item.unitCount)}</td>
                    <td>{item.volumePerUnit == null ? "-" : `${formatNumber(item.volumePerUnit)} ${item.volumeUnit || item.unit}`}</td>
                    <td>{item.totalVolume == null ? `${formatNumber(item.quantity)} ${item.unit}` : `${formatNumber(item.totalVolume)} ${item.volumeUnit || item.unit}`}</td>
                    <td>{formatCurrency(item.unitCost)}</td>
                    <td>{formatCurrency(item.totalCost ?? item.estimatedValue)}</td>
                    <td>{item.batchNumber || "-"}</td>
                    <td>{item.supplier || "-"}</td>
                    <td>{item.location || item.zoneName || "-"}</td>
                    <td>{formatDate(item.purchaseDate || item.receivedDate)}</td>
                    <td>{formatDate(item.manufactureDate)}</td>
                    <td><span className={isExpired(item.expiryDate) ? styles.expired : ""}>{formatDate(item.expiryDate)}</span></td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={16}><div className={styles.emptyState}>Chưa có sản phẩm hóa chất trong kho.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.twoColumn}>
          <article className={styles.logPanel}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.eyebrow}>Nhật ký sử dụng hóa chất</p>
                <h2>{formatNumber(profile.usageLogs.length)} giao dịch</h2>
              </div>
            </div>
            <div className={styles.logList}>
              {profile.usageLogs.map((log) => (
                <div key={log.id} className={styles.logItem}>
                  <div>
                    <strong>{log.itemName}</strong>
                    <span>{usageActionLabel(log.actionType)} · {formatDate(log.createdAt)}</span>
                  </div>
                  <p>{formatNumber(log.quantity)} {log.unit || ""}</p>
                  <small>{log.note || log.source || log.itemCode}</small>
                </div>
              ))}
              {profile.usageLogs.length === 0 && <div className={styles.emptyState}>Chưa có nhật ký sử dụng hóa chất.</div>}
            </div>
          </article>

          <article className={styles.mapPanel}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.eyebrow}>Khu vực sử dụng/lưu trữ</p>
                <h2>View trên bản đồ</h2>
              </div>
            </div>
            <div className={styles.mapShell}>
              <MapViewSwitcher
                lat={overview.latitude}
                lng={overview.longitude}
                zoom={16}
                title="Khu vực hóa chất"
                initialMode="satellite"
                hideEcoNote
                zones={zonesWithPolygon.map((zone) => ({
                  id: zone.id,
                  label: zone.name,
                  color: zone.color || "#dc2626",
                  kind: "hoa_chat",
                  polygon: zone.polygon,
                }))}
                fitToPolygon={zonesWithPolygon.length > 0}
              />
            </div>
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}
