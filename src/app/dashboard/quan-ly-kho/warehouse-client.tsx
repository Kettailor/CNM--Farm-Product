"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import {
  WAREHOUSE_STATUS_LABELS,
  WAREHOUSE_TYPE_OPTIONS,
  getWarehouseTypeOption,
  type WarehouseItem,
  type WarehouseStatus,
  type WarehouseType,
  type WarehouseZone,
} from "@/lib/warehouse-types";
import WarehouseIcon, { iconForType } from "./warehouse-icons";
import WarehouseTools from "./warehouse-tools";
import styles from "./page.module.css";

type WarehouseClientProps = {
  farmName: string;
  farmLocation: string | null;
  initialItems: WarehouseItem[];
  warehouseZones: WarehouseZone[];
};

const TYPE_FILTER_ALL = "tat_ca";
const ZONE_FILTER_ALL = "tat_ca";

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function formatCurrency(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isExpired(value: string | null) {
  if (!value) return false;
  const expiry = new Date(`${value}T23:59:59`);
  return expiry.getTime() < Date.now();
}

function isExpiringSoon(value: string | null) {
  if (!value || isExpired(value)) return false;
  const expiry = new Date(`${value}T23:59:59`);
  const days = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days <= 30;
}

function operationalStatus(item: WarehouseItem): WarehouseStatus {
  if (item.status === "da_huy" || item.status === "ngung_su_dung") return item.status;
  if (isExpired(item.expiryDate)) return "het_han";
  if (item.minimumQuantity > 0 && item.quantity <= item.minimumQuantity) return "sap_het";
  if (isExpiringSoon(item.expiryDate)) return "can_kiem_tra";
  return item.status;
}

function activeItems(items: WarehouseItem[]) {
  return items.filter((item) => item.status !== "da_huy");
}

export default function WarehouseClient({ farmName, farmLocation, initialItems, warehouseZones }: WarehouseClientProps) {
  const [activeType, setActiveType] = useState<WarehouseType | typeof TYPE_FILTER_ALL>(TYPE_FILTER_ALL);
  const [activeZone, setActiveZone] = useState<string>(ZONE_FILTER_ALL);
  const [query, setQuery] = useState("");

  const baseItems = useMemo(() => activeItems(initialItems), [initialItems]);
  const usableItems = useMemo(
    () => (activeZone === ZONE_FILTER_ALL ? baseItems : baseItems.filter((item) => item.zoneId === activeZone)),
    [activeZone, baseItems]
  );
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return usableItems.filter((item) => {
      const typeOk = activeType === TYPE_FILTER_ALL || item.type === activeType;
      const haystack = [item.code, item.name, item.group, item.location, item.zoneName, item.zoneCode, item.supplier, item.manager, item.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return typeOk && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [activeType, query, usableItems]);

  const summary = useMemo(() => {
    const totalValue = usableItems.reduce((sum, item) => sum + (item.estimatedValue ?? 0), 0);
    const alertItems = usableItems.filter((item) => {
      const state = operationalStatus(item);
      return state === "sap_het" || state === "het_han" || state === "can_kiem_tra";
    });
    const latest = [...usableItems].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))).slice(0, 5);
    return { totalValue, alertItems, latest };
  }, [usableItems]);

  const typeStats = useMemo(
    () =>
      WAREHOUSE_TYPE_OPTIONS.map((option) => {
        const list = usableItems.filter((item) => item.type === option.value);
        const alerts = list.filter((item) => operationalStatus(item) !== "binh_thuong").length;
        const quantity = list.reduce((sum, item) => sum + item.quantity, 0);
        const totalEstimatedValue = list.reduce((sum, item) => sum + (item.estimatedValue ?? 0), 0);
        const share = usableItems.length > 0 ? Math.round((list.length / usableItems.length) * 100) : 0;
        return { ...option, count: list.length, quantity, alerts, totalEstimatedValue, share };
      }),
    [usableItems]
  );

  const maxQuantity = Math.max(...typeStats.map((item) => item.quantity), 1);
  const focusStats = activeType === TYPE_FILTER_ALL ? typeStats : typeStats.filter((item) => item.value === activeType);

  return (
    <div className={styles.page}>
      <section className={styles.topBar}>
        <div className={styles.titleBlock}>
          <span className={styles.titleIcon}><WarehouseIcon name="warehouse" /></span>
          <div>
            <p className={styles.eyebrow}>Quản lý kho</p>
            <h1>{farmName}</h1>
            <span>{farmLocation || "Kho vận hành trang trại"}</span>
          </div>
        </div>
        <WarehouseTools />
      </section>

      {warehouseZones.length === 0 ? (
        <section className={styles.setupNotice}>
          <div>
            <p className={styles.eyebrow}>Chưa có khu vực kho</p>
            <h2>Vui lòng thiết lập khu vực dành cho kho.</h2>
            <p>Quản lý kho chỉ hiển thị dữ liệu khi Quản lý khu vực đã có ít nhất một khu vực loại kho và đã tick loại kho được phép lưu trữ.</p>
          </div>
          <Link href="/dashboard/khu-vuc/tao-moi" className={styles.primaryButton}>
            Tạo khu vực kho
          </Link>
        </section>
      ) : (
      <>
      <section className={styles.zoneFilterBar}>
        <button
          type="button"
          className={activeZone === ZONE_FILTER_ALL ? styles.zoneFilterActive : ""}
          onClick={() => setActiveZone(ZONE_FILTER_ALL)}
        >
          Tất cả
        </button>
        {warehouseZones.map((zone) => (
          <button
            type="button"
            key={zone.id}
            className={activeZone === zone.id ? styles.zoneFilterActive : ""}
            onClick={() => setActiveZone(zone.id)}
          >
            {zone.name}
          </button>
        ))}
      </section>

      <section className={styles.visualGrid}>
        <div className={styles.storageMap}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Bản đồ kho nghiệp vụ</p>
              <h2>4 nhóm lưu trữ chính</h2>
            </div>
            <span className={styles.panelBadge}>{formatCurrency(summary.totalValue)}</span>
          </div>
          <div className={styles.laneGrid}>
            {typeStats.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`${styles.laneCard} ${activeType === option.value ? styles.laneCardActive : ""}`}
                style={{ "--accent": option.accent, "--fill": `${Math.max(8, option.share)}%` } as CSSProperties}
                onClick={() => setActiveType(option.value)}
              >
                <span className={styles.typeIcon}><WarehouseIcon name={iconForType(option.value)} /></span>
                <span className={styles.laneCopy}>
                  <strong>{option.shortLabel}</strong>
                  <small>{option.purpose}</small>
                </span>
                <span className={styles.laneNumber}>{formatNumber(option.count)}</span>
                <span className={styles.laneBar}><i /></span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.alertPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Cảnh báo nhanh</p>
              <h2>{formatNumber(summary.alertItems.length)} mục</h2>
            </div>
            <WarehouseIcon name="warning" />
          </div>
          <div className={styles.tinyList}>
            {summary.alertItems.slice(0, 5).map((item) => (
              <div key={item.id} className={styles.tinyRow}>
                <span>{item.name}</span>
                <strong>{WAREHOUSE_STATUS_LABELS[operationalStatus(item)]}</strong>
              </div>
            ))}
            {summary.alertItems.length === 0 && <div className={styles.emptyState}>Kho đang ổn định, chưa có cảnh báo.</div>}
          </div>
        </div>
      </section>

      <section className={styles.typeGrid} aria-label="Loại kho">
        {typeStats.map((option) => (
          <button
            type="button"
            key={option.value}
            className={`${styles.typeCard} ${activeType === option.value ? styles.typeCardActive : ""}`}
            style={{ "--accent": option.accent } as CSSProperties}
            onClick={() => setActiveType(option.value)}
          >
            <span className={styles.typeIcon}><WarehouseIcon name={iconForType(option.value)} /></span>
            <span className={styles.typeCopy}>
              <strong>{option.label}</strong>
              <small>{option.purpose}</small>
            </span>
            <span className={styles.typeMetric}>{formatNumber(option.count)}</span>
            <span className={styles.typeSubMetric}>{formatNumber(option.quantity)} {option.defaultUnit} · {formatCurrency(option.totalEstimatedValue)}</span>
            {option.alerts > 0 && <span className={styles.alertBadge}>{formatNumber(option.alerts)}</span>}
          </button>
        ))}
      </section>

      <section className={styles.bottomGrid}>
        <article className={styles.chartPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Tỷ trọng số lượng</p>
              <h2>{activeType === TYPE_FILTER_ALL ? "Tất cả loại kho" : getWarehouseTypeOption(activeType).shortLabel}</h2>
            </div>
            <button type="button" className={styles.filterAllButton} onClick={() => setActiveType(TYPE_FILTER_ALL)}>
              Tất cả
            </button>
          </div>
          <div className={styles.barList}>
            {focusStats.map((option) => (
              <div key={option.value} className={styles.barRow} style={{ "--accent": option.accent, "--fill": `${Math.max(4, (option.quantity / maxQuantity) * 100)}%` } as CSSProperties}>
                <span>{option.shortLabel}</span>
                <div><i /></div>
                <strong>{formatNumber(option.quantity)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.chartPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Cập nhật gần nhất</p>
              <h2>Hoạt động kho</h2>
            </div>
          </div>
          <div className={styles.tinyList}>
            {summary.latest.map((item) => (
              <div key={item.id} className={styles.tinyRow}>
                <span>{item.name}</span>
                <strong>{formatDate(item.updatedAt || item.createdAt)}</strong>
              </div>
            ))}
            {summary.latest.length === 0 && <div className={styles.emptyState}>Chưa có dữ liệu kho.</div>}
          </div>
        </article>
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Danh sách tồn kho</p>
            <h2>{formatNumber(filteredItems.length)} mục</h2>
          </div>
          <label className={styles.searchBox}>
            <WarehouseIcon name="search" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, mã, vị trí, nhà cung cấp" />
          </label>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên</th>
                <th>Loại</th>
                <th>Tồn</th>
                <th>Vị trí</th>
                <th>Hạn</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const typeOption = getWarehouseTypeOption(item.type);
                const state = operationalStatus(item);
                return (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>
                      <span className={styles.itemName}>{item.name}</span>
                      <small>{item.group || item.supplier || "-"}</small>
                    </td>
                    <td>
                      <span className={styles.typePill} style={{ "--accent": typeOption.accent } as CSSProperties}>
                        {typeOption.shortLabel}
                      </span>
                    </td>
                    <td>
                      <strong>{formatNumber(item.quantity)} {item.unit}</strong>
                      <small>Tối thiểu {formatNumber(item.minimumQuantity)}</small>
                    </td>
                    <td>
                      <span>{item.zoneName || item.location || "-"}</span>
                      {item.location && item.zoneName && <small>{item.location}</small>}
                    </td>
                    <td>{formatDate(item.expiryDate)}</td>
                    <td><span className={styles.statusPill} data-status={state}>{WAREHOUSE_STATUS_LABELS[state]}</span></td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>Chưa có mục kho phù hợp.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </>
      )}
    </div>
  );
}
