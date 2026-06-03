"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { dateOnlyToUtcMs, formatBusinessDate } from "@/lib/business-date";
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
  canWrite: boolean;
  businessDate: string;
};

const TYPE_FILTER_ALL = "tat_ca";
const ZONE_FILTER_ALL = "tat_ca";

type DisplaySettingKey = "map" | "alerts" | "types" | "charts" | "table";

const DISPLAY_QUERY_KEYS: Record<DisplaySettingKey, string> = {
  map: "hien-so-do-kho",
  alerts: "hien-canh-bao-kho",
  types: "hien-nhom-kho",
  charts: "hien-thong-ke-kho",
  table: "hien-bang-kho",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function formatCurrency(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function isExpired(value: string | null, businessDate: string) {
  return Boolean(value && value < businessDate);
}

function isExpiringSoon(value: string | null, businessDate: string) {
  if (!value || isExpired(value, businessDate)) return false;
  const expiry = dateOnlyToUtcMs(value);
  const today = dateOnlyToUtcMs(businessDate);
  if (expiry == null || today == null) return false;
  const days = (expiry - today) / (1000 * 60 * 60 * 24);
  return days <= 30;
}

function operationalStatus(item: WarehouseItem, businessDate: string): WarehouseStatus {
  if (item.status === "da_huy" || item.status === "ngung_su_dung") return item.status;
  if (isExpired(item.expiryDate, businessDate)) return "het_han";
  if (item.minimumQuantity > 0 && item.quantity <= item.minimumQuantity) return "sap_het";
  if (isExpiringSoon(item.expiryDate, businessDate)) return "can_kiem_tra";
  return item.status;
}

function activeItems(items: WarehouseItem[]) {
  return items.filter((item) => item.status !== "da_huy");
}

function SettingsToggle({ label, description, checked, onToggle }: { label: string; description?: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className={styles.settingsRow}>
      <div>
        <strong>{label}</strong>
        {description && <span className={styles.settingsMeta}>{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        className={`${styles.switch} ${checked ? styles.switchActive : ""}`}
        onClick={onToggle}
      >
        <span />
      </button>
    </div>
  );
}

export default function WarehouseClient({ farmName, farmLocation, initialItems, warehouseZones, canWrite, businessDate }: WarehouseClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeType, setActiveType] = useState<WarehouseType | typeof TYPE_FILTER_ALL>(TYPE_FILTER_ALL);
  const [activeZone, setActiveZone] = useState<string>(ZONE_FILTER_ALL);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const settingEnabled = (key: string, defaultValue = true) => {
    const value = searchParams.get(key);
    if (value == null) return defaultValue;
    return value !== "0";
  };
  const updateSetting = (key: string, enabled: boolean, defaultValue = true) => {
    const next = new URLSearchParams(searchParams.toString());
    if (enabled === defaultValue) next.delete(key);
    else next.set(key, enabled ? "1" : "0");
    const queryString = next.toString();
    window.dispatchEvent(new Event("farm:navigation-loading"));
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const displaySettings: Record<DisplaySettingKey, boolean> = {
    map: settingEnabled(DISPLAY_QUERY_KEYS.map),
    alerts: settingEnabled(DISPLAY_QUERY_KEYS.alerts),
    types: settingEnabled(DISPLAY_QUERY_KEYS.types),
    charts: settingEnabled(DISPLAY_QUERY_KEYS.charts),
    table: settingEnabled(DISPLAY_QUERY_KEYS.table),
  };

  const visibleZones = useMemo(
    () => (activeZone === ZONE_FILTER_ALL ? warehouseZones : warehouseZones.filter((zone) => zone.id === activeZone)),
    [activeZone, warehouseZones]
  );
  const zoneTypeMap = useMemo(() => new Map(warehouseZones.map((zone) => [zone.id, new Set(zone.warehouseTypes)])), [warehouseZones]);
  const availableTypes = useMemo(() => {
    const values = new Set<WarehouseType>();
    visibleZones.forEach((zone) => zone.warehouseTypes.forEach((type) => values.add(type)));
    return WAREHOUSE_TYPE_OPTIONS.filter((option) => values.has(option.value));
  }, [visibleZones]);
  const availableTypeSet = useMemo(() => new Set(availableTypes.map((option) => option.value)), [availableTypes]);
  const baseItems = useMemo(
    () => activeItems(initialItems).filter((item) => Boolean(item.zoneId && zoneTypeMap.get(item.zoneId)?.has(item.type))),
    [initialItems, zoneTypeMap]
  );
  const usableItems = useMemo(
    () => (activeZone === ZONE_FILTER_ALL ? baseItems : baseItems.filter((item) => item.zoneId === activeZone && availableTypeSet.has(item.type))),
    [activeZone, availableTypeSet, baseItems]
  );

  useEffect(() => {
    if (activeType !== TYPE_FILTER_ALL && !availableTypeSet.has(activeType)) setActiveType(TYPE_FILTER_ALL);
  }, [activeType, availableTypeSet]);

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
      const state = operationalStatus(item, businessDate);
      return state === "sap_het" || state === "het_han" || state === "can_kiem_tra";
    });
    const latest = [...usableItems].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))).slice(0, 5);
    return { totalValue, alertItems, latest };
  }, [businessDate, usableItems]);

  const typeStats = useMemo(
    () =>
      availableTypes.map((option) => {
        const list = usableItems.filter((item) => item.type === option.value);
        const alerts = list.filter((item) => operationalStatus(item, businessDate) !== "binh_thuong").length;
        const quantity = list.reduce((sum, item) => sum + item.quantity, 0);
        const totalEstimatedValue = list.reduce((sum, item) => sum + (item.estimatedValue ?? 0), 0);
        const share = usableItems.length > 0 ? Math.round((list.length / usableItems.length) * 100) : 0;
        return { ...option, count: list.length, quantity, alerts, totalEstimatedValue, share };
      }),
    [availableTypes, businessDate, usableItems]
  );

  const maxQuantity = Math.max(...typeStats.map((item) => item.quantity), 1);
  const focusStats = activeType === TYPE_FILTER_ALL ? typeStats : typeStats.filter((item) => item.value === activeType);
  const visibleSectionCount = Number(displaySettings.map) + Number(displaySettings.alerts) + Number(displaySettings.types) + Number(displaySettings.charts) + Number(displaySettings.table);

  return (
    <div className={styles.page}>
      {settingsOpen && <button type="button" className={styles.settingsBackdrop} aria-label="Đóng cài đặt" onClick={() => setSettingsOpen(false)} />}
      <aside className={`${styles.settingsDrawer} ${settingsOpen ? styles.settingsDrawerOpen : ""}`} aria-hidden={!settingsOpen}>
        <div className={styles.settingsPanelHeader}>
          <strong>Cài đặt hiển thị kho</strong>
          <button type="button" className={styles.settingsClose} aria-label="Đóng cài đặt" onClick={() => setSettingsOpen(false)}>
            ×
          </button>
        </div>
        <div className={styles.settingsSection}>
          <h3>Tổng quan</h3>
          <SettingsToggle label="Sơ đồ nhóm kho" checked={displaySettings.map} onToggle={() => updateSetting(DISPLAY_QUERY_KEYS.map, !displaySettings.map)} />
          <SettingsToggle label="Cảnh báo nhanh" checked={displaySettings.alerts} onToggle={() => updateSetting(DISPLAY_QUERY_KEYS.alerts, !displaySettings.alerts)} />
          <SettingsToggle label="Thẻ loại kho" checked={displaySettings.types} onToggle={() => updateSetting(DISPLAY_QUERY_KEYS.types, !displaySettings.types)} />
          <SettingsToggle label="Thống kê hoạt động" checked={displaySettings.charts} onToggle={() => updateSetting(DISPLAY_QUERY_KEYS.charts, !displaySettings.charts)} />
          <SettingsToggle label="Bảng tồn kho" checked={displaySettings.table} onToggle={() => updateSetting(DISPLAY_QUERY_KEYS.table, !displaySettings.table)} />
        </div>
        <div className={styles.settingsSection}>
          <h3>Loại được tick</h3>
          <span className={styles.settingsMeta}>
            {availableTypes.length > 0 ? availableTypes.map((option) => option.shortLabel).join(", ") : "Chưa có loại kho được tick trong khu vực đang xem."}
          </span>
        </div>
      </aside>

      <section className={styles.topBar}>
        <div className={styles.titleBlock}>
          <span className={styles.titleIcon}><WarehouseIcon name="warehouse" /></span>
          <div>
            <p className={styles.eyebrow}>Quản lý kho</p>
            <h1>{farmName}</h1>
            <span>{farmLocation || "Kho vận hành trang trại"}</span>
          </div>
        </div>
        <WarehouseTools canWrite={canWrite} onOpenSettings={() => setSettingsOpen(true)} />
      </section>

      {warehouseZones.length === 0 ? (
        <section className={styles.setupNotice}>
          <div>
            <p className={styles.eyebrow}>Chưa có khu vực kho</p>
            <h2>Vui lòng thiết lập khu vực dành cho kho.</h2>
            <p>Quản lý kho chỉ hiển thị dữ liệu khi Quản lý khu vực đã có ít nhất một khu vực loại kho và đã tick loại kho được phép lưu trữ.</p>
          </div>
          {canWrite && (
          <Link href="/dashboard/khu-vuc/tao-moi" className={styles.primaryButton}>
            Tạo khu vực kho
          </Link>
          )}
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

      {(displaySettings.map || displaySettings.alerts) && (
      <section className={displaySettings.map && displaySettings.alerts ? styles.visualGrid : styles.singlePanelGrid}>
        {displaySettings.map && (
        <div className={styles.storageMap}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Bản đồ kho nghiệp vụ</p>
              <h2>{formatNumber(typeStats.length)} nhóm lưu trữ được bật</h2>
            </div>
            <span className={styles.panelBadge}>{formatCurrency(summary.totalValue)}</span>
          </div>
          <div className={styles.laneGrid}>
            {typeStats.length > 0 ? typeStats.map((option) => (
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
            )) : <div className={styles.emptyState}>Chưa có loại kho nào được tick trong khu vực đang xem.</div>}
          </div>
        </div>
        )}

        {displaySettings.alerts && (
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
                <strong>{WAREHOUSE_STATUS_LABELS[operationalStatus(item, businessDate)]}</strong>
              </div>
            ))}
            {summary.alertItems.length === 0 && <div className={styles.emptyState}>Kho đang ổn định, chưa có cảnh báo.</div>}
          </div>
        </div>
        )}
      </section>
      )}

      {displaySettings.types && (
      <section className={styles.typeGrid} aria-label="Loại kho">
        {typeStats.length > 0 ? typeStats.map((option) => (
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
        )) : <div className={styles.emptyState}>Chưa có loại kho nào được tick trong khu vực đang xem.</div>}
      </section>
      )}

      {displaySettings.charts && (
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
            {focusStats.length > 0 ? focusStats.map((option) => (
              <div key={option.value} className={styles.barRow} style={{ "--accent": option.accent, "--fill": `${Math.max(4, (option.quantity / maxQuantity) * 100)}%` } as CSSProperties}>
                <span>{option.shortLabel}</span>
                <div><i /></div>
                <strong>{formatNumber(option.quantity)}</strong>
              </div>
            )) : <div className={styles.emptyState}>Chưa có nhóm kho được bật để thống kê.</div>}
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
                <strong>{formatBusinessDate(item.updatedAt || item.createdAt)}</strong>
              </div>
            ))}
            {summary.latest.length === 0 && <div className={styles.emptyState}>Chưa có dữ liệu kho.</div>}
          </div>
        </article>
      </section>
      )}

      {displaySettings.table && (
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
                const state = operationalStatus(item, businessDate);
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
                    <td>{formatBusinessDate(item.expiryDate)}</td>
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
      )}
      {visibleSectionCount === 0 && (
        <section className={styles.emptyState}>Tất cả khối hiển thị của trang kho đang tắt. Mở Tác vụ &gt; Cài đặt hiển thị để bật lại.</section>
      )}
      </>
      )}
    </div>
  );
}
