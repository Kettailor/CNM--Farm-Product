"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import ZoneActionMenu from "@/components/dashboard-zone-actions";
import ZonePreviewCard from "@/components/dashboard-zone-preview-card";
import styles from "@/app/dashboard/khu-vuc/page.module.css";
import type { ZoneListItem, ZoneTypeFilter } from "@/lib/dashboard-zone-list";

type FarmLocation = { latitude: number; longitude: number; locationName: string | null };

type Props = {
  farmName: string;
  location: FarmLocation | null;
  zones: ZoneListItem[];
  filters: ZoneTypeFilter[];
  canWrite: boolean;
  canOpenSettings: boolean;
};

type DisplaySettingKey = "summary" | "cards" | "table" | "map";

const DISPLAY_QUERY_KEYS: Record<DisplaySettingKey, string> = {
  summary: "hien-tom-tat",
  cards: "hien-the-khu-vuc",
  table: "hien-bang-khu-vuc",
  map: "hien-ban-do",
};

const SHOW_CANCELED_QUERY_KEY = "hien-khu-vuc-da-huy";

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[_-]+/g, " ")
    .trim();
}

function isCancelledZone(zone: ZoneListItem) {
  const status = normalizeStatus(`${zone.status} ${zone.statusLabel}`);
  return status.includes("da huy") || status.includes("huy") || status.includes("cancel");
}

function ZoneMiniMap({ zone }: { zone: ZoneListItem }) {
  return <ZonePreviewCard zone={zone} />;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatArea(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value)} ha`;
}

function zoneStatusClass(zone: ZoneListItem) {
  if (isCancelledZone(zone)) return styles.statusMuted;
  const normalized = normalizeStatus(zone.status);
  if (normalized.includes("active") || normalized.includes("dang hoat dong")) return styles.statusActive;
  if (normalized.includes("draft") || normalized.includes("planned") || normalized.includes("du kien")) return styles.statusDraft;
  return styles.statusMuted;
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

export default function ZoneBrowser({ farmName, location, zones, filters, canWrite, canOpenSettings }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState("tat-ca");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const settingEnabled = (key: string, defaultValue = true) => {
    const value = searchParams.get(key);
    if (value == null) return defaultValue;
    return value !== "0";
  };
  const updateSetting = (key: string, enabled: boolean, defaultValue = true) => {
    const next = new URLSearchParams(searchParams.toString());
    if (enabled === defaultValue) next.delete(key);
    else next.set(key, enabled ? "1" : "0");
    const query = next.toString();
    window.dispatchEvent(new Event("farm:navigation-loading"));
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const displaySettings: Record<DisplaySettingKey, boolean> = {
    summary: settingEnabled(DISPLAY_QUERY_KEYS.summary),
    cards: settingEnabled(DISPLAY_QUERY_KEYS.cards),
    table: settingEnabled(DISPLAY_QUERY_KEYS.table),
    map: settingEnabled(DISPLAY_QUERY_KEYS.map),
  };
  const showCanceled = settingEnabled(SHOW_CANCELED_QUERY_KEY, false);

  const canceledCount = useMemo(() => zones.filter(isCancelledZone).length, [zones]);
  const visibleZones = useMemo(() => (showCanceled ? zones : zones.filter((zone) => !isCancelledZone(zone))), [showCanceled, zones]);

  const visibleTabs = useMemo(() => {
    const labelBySlug = new Map(filters.map((filter) => [filter.slug, filter.label]));
    const typeCounts = new Map<string, { label: string; count: number }>();

    visibleZones.forEach((zone) => {
      const current = typeCounts.get(zone.typeSlug);
      typeCounts.set(zone.typeSlug, {
        label: labelBySlug.get(zone.typeSlug) ?? zone.typeLabel,
        count: (current?.count ?? 0) + 1,
      });
    });

    return [
      { slug: "tat-ca", label: labelBySlug.get("tat-ca") ?? "Tất cả", count: visibleZones.length },
      ...Array.from(typeCounts.entries()).map(([slug, value]) => ({ slug, label: value.label, count: value.count })),
    ];
  }, [filters, visibleZones]);

  useEffect(() => {
    if (!visibleTabs.some((filter) => filter.slug === activeFilter)) setActiveFilter("tat-ca");
  }, [activeFilter, visibleTabs]);

  const filteredZones = useMemo(
    () => (activeFilter === "tat-ca" ? visibleZones : visibleZones.filter((zone) => zone.typeSlug === activeFilter)),
    [activeFilter, visibleZones]
  );

  const mapZones = useMemo(
    () => filteredZones.filter((zone) => zone.polygon.length >= 3).map((zone) => ({ id: zone.id, label: zone.name, color: zone.color, polygon: zone.polygon, kind: zone.typeSlug })),
    [filteredZones]
  );

  const totalArea = filteredZones.reduce((sum, zone) => sum + zone.areaHa, 0);
  const focus = location ?? { latitude: 10.762622, longitude: 106.660172, locationName: null };
  const visibleCancelledCount = filteredZones.filter(isCancelledZone).length;
  const mappedZoneCount = filteredZones.filter((zone) => zone.polygon.length >= 3).length;
  const typeCount = new Set(filteredZones.map((zone) => zone.typeSlug)).size;
  const hasVisibleDisplaySection = displaySettings.summary || displaySettings.cards || displaySettings.table || displaySettings.map;
  const summaryCards = [
    {
      label: "Khu vực đang xem",
      value: formatNumber(filteredZones.length),
      meta: showCanceled ? `Có ${formatNumber(visibleCancelledCount)} khu vực đã hủy trong bộ lọc` : `${formatNumber(canceledCount)} khu vực đã hủy đang ẩn`,
    },
    { label: "Tổng diện tích", value: formatArea(totalArea), meta: "Theo bộ lọc hiện tại" },
    { label: "Có polygon", value: formatNumber(mappedZoneCount), meta: "Sẵn sàng hiển thị bản đồ" },
    { label: "Nhóm loại", value: formatNumber(typeCount), meta: activeFilter === "tat-ca" ? "Tất cả loại khu vực" : "Trong tab đang chọn" },
  ];

  return (
    <div className={styles.page}>
      {settingsOpen && <button type="button" className={styles.settingsBackdrop} aria-label="Đóng cài đặt" onClick={() => setSettingsOpen(false)} />}
      <aside className={`${styles.settingsDrawer} ${settingsOpen ? styles.settingsDrawerOpen : ""}`} aria-hidden={!settingsOpen}>
        <div className={styles.settingsPanelHeader}>
          <strong>Cài đặt hiển thị</strong>
          <button type="button" className={styles.settingsClose} aria-label="Đóng cài đặt" onClick={() => setSettingsOpen(false)}>
            ×
          </button>
        </div>
        <div className={styles.settingsSection}>
          <h3>Chung</h3>
          <SettingsToggle label="Tóm tắt đầu trang" checked={displaySettings.summary} onToggle={() => updateSetting(DISPLAY_QUERY_KEYS.summary, !displaySettings.summary)} />
          <SettingsToggle label="Thẻ khu vực" checked={displaySettings.cards} onToggle={() => updateSetting(DISPLAY_QUERY_KEYS.cards, !displaySettings.cards)} />
          <SettingsToggle label="Bảng khu vực" checked={displaySettings.table} onToggle={() => updateSetting(DISPLAY_QUERY_KEYS.table, !displaySettings.table)} />
          <SettingsToggle label="Bản đồ" checked={displaySettings.map} onToggle={() => updateSetting(DISPLAY_QUERY_KEYS.map, !displaySettings.map)} />
        </div>
        <div className={styles.settingsSection}>
          <h3>Khu vực</h3>
          <SettingsToggle
            label="Hiển thị khu vực đã hủy"
            description={`${formatNumber(canceledCount)} khu vực đã hủy`}
            checked={showCanceled}
            onToggle={() => updateSetting(SHOW_CANCELED_QUERY_KEY, !showCanceled, false)}
          />
        </div>
      </aside>

      <main className={styles.contentArea}>
        <div className={styles.topBar}>
          <div>
            <p className={styles.eyebrow}>Khu vực trang trại</p>
            <h2>Quản lý khu vực</h2>
          </div>
          <ZoneActionMenu context="overview" backHref="/dashboard" onOpenSettings={() => setSettingsOpen(true)} canWrite={canWrite} canOpenSettings={canOpenSettings} />
        </div>

        <div className={styles.tabRow}>
          {visibleTabs.map((filter) => {
            const active = activeFilter === filter.slug;
            return (
              <button key={filter.slug} className={`${styles.filterChip} ${active ? styles.filterChipActive : ""}`} type="button" onClick={() => setActiveFilter(filter.slug)}>
                <span>{filter.label}</span>
                <strong>{filter.count}</strong>
              </button>
            );
          })}
        </div>

        {displaySettings.summary && (
          <section className={styles.summaryGrid} aria-label="Tóm tắt khu vực">
            {summaryCards.map((item) => (
              <article key={item.label} className={styles.summaryCard}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.meta}</small>
              </article>
            ))}
          </section>
        )}

        {displaySettings.cards && (
          <section className={styles.gridCards}>
            {filteredZones.length > 0 ? (
              filteredZones.map((zone) => (
                <article key={zone.id} className={styles.zoneCard}>
                  <div className={styles.zoneCardInner}>
                    <div className={styles.zoneInfo}>
                      <div className={styles.zoneCardHeader}>
                        <div>
                          <h3>{zone.name}</h3>
                          <p className={styles.zoneSub}>{zone.typeLabel}</p>
                        </div>
                        <span className={`${styles.badge} ${zoneStatusClass(zone)}`}>
                          {zone.statusLabel}
                        </span>
                      </div>
                      <div className={styles.zoneFacts}>
                        <div><span>Mã khu</span><strong>{zone.code}</strong></div>
                        <div><span>Diện tích</span><strong>{zone.areaHa.toFixed(2)} ha</strong></div>
                        <div><span>Chu vi</span><strong>{zone.perimeterM ? `${zone.perimeterM.toFixed(0)} m` : "-"}</strong></div>
                        <div><span>Sức chứa</span><strong>{zone.stockingRate ?? "-"}</strong></div>
                      </div>
                      <div className={styles.zoneFooter}>
                        <span>{zone.updatedAt ?? "Chưa có cập nhật"}</span>
                      </div>
                    </div>
                    <ZoneMiniMap zone={zone} />
                  </div>
                  <Link href={`/dashboard/khu-vuc/${zone.id}`} className={styles.zoneCardLink} aria-label={`Xem chi tiết ${zone.name}`} />
                </article>
              ))
            ) : (
              <article className={styles.emptyCard}>Chưa có khu vực nào khớp bộ lọc hiện tại.</article>
            )}
          </section>
        )}

        {displaySettings.table && (
          <section className={styles.tableSection}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.eyebrow}>Bảng quản lý</p>
                <h3>Khu vực theo bộ lọc</h3>
              </div>
              <span className={styles.panelBadge}>{formatNumber(filteredZones.length)} khu vực</span>
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.zoneTable}>
                <thead>
                  <tr>
                    <th>Tên khu vực</th>
                    <th>Mã khu</th>
                    <th>Loại</th>
                    <th>Trạng thái</th>
                    <th>Diện tích</th>
                    <th>Chu vi</th>
                    <th>Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredZones.length > 0 ? (
                    filteredZones.map((zone) => (
                      <tr key={zone.id}>
                        <td>
                          <Link href={`/dashboard/khu-vuc/${zone.id}`} className={styles.tableName}>
                            <span className={styles.zoneColorDot} style={{ backgroundColor: zone.color }} />
                            {zone.name}
                          </Link>
                        </td>
                        <td>{zone.code}</td>
                        <td>{zone.typeLabel}</td>
                        <td><span className={`${styles.badge} ${zoneStatusClass(zone)}`}>{zone.statusLabel}</span></td>
                        <td>{formatArea(zone.areaHa)}</td>
                        <td>{zone.perimeterM ? `${formatNumber(Math.round(zone.perimeterM))} m` : "-"}</td>
                        <td>{zone.updatedAt ?? "Chưa có cập nhật"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className={styles.emptyTableCell}>Chưa có khu vực nào khớp bộ lọc hiện tại.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {displaySettings.map && <section className={styles.mapSection}>
          <div className={styles.mapHeader}>
            <div>
              <p className={styles.eyebrow}>Bản đồ tính năng</p>
              <h3>Bản đồ khu vực</h3>
            </div>
            <span className={styles.mapPill}>Trực tiếp</span>
          </div>
          <div className={styles.mapToolbar}>
            {visibleTabs.map((item) => (
              <button key={item.slug} type="button" className={`${styles.mapToggle} ${activeFilter === item.slug ? styles.mapToggleActive : ""}`} onClick={() => setActiveFilter(item.slug)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className={styles.mapFrame}>
            <MapViewSwitcher lat={focus.latitude} lng={focus.longitude} zoom={17} title={`${farmName} - Khu vực`} frameClassName={styles.mapCanvas} zones={mapZones} fitToPolygon={mapZones.length > 0} hideModeTabs hideEcoNote lockMap={false} />
          </div>
          <p className={styles.mapSummary}>Tổng diện tích đang xem: {totalArea.toFixed(1)} ha</p>
        </section>}

        {!hasVisibleDisplaySection && (
          <section className={styles.emptyCard}>Tất cả khối hiển thị của trang đang tắt. Mở Tác vụ &gt; Cài đặt hiển thị để bật lại.</section>
        )}
      </main>
    </div>
  );
}
