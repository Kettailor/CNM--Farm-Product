"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
};

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

export default function ZoneBrowser({ farmName, location, zones, filters }: Props) {
  const [activeFilter, setActiveFilter] = useState("tat-ca");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);

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

  return (
    <div className={styles.page}>
      {settingsOpen && <button type="button" className={styles.settingsBackdrop} aria-label="Đóng cài đặt" onClick={() => setSettingsOpen(false)} />}
      <aside className={`${styles.settingsDrawer} ${settingsOpen ? styles.settingsDrawerOpen : ""}`} aria-hidden={!settingsOpen}>
        <div className={styles.settingsPanelHeader}>
          <div>
            <p className={styles.eyebrow}>Cài đặt</p>
            <h3>Tổng quan khu vực</h3>
          </div>
          <button type="button" className={styles.settingsClose} aria-label="Đóng cài đặt" onClick={() => setSettingsOpen(false)}>
            ×
          </button>
        </div>
        <div className={styles.settingsOption}>
          <div>
            <strong>Xem khu vực đã hủy</strong>
            <span className={styles.settingsMeta}>{canceledCount} khu vực đã hủy</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showCanceled}
            className={`${styles.switch} ${showCanceled ? styles.switchActive : ""}`}
            onClick={() => setShowCanceled((value) => !value)}
          >
            <span />
          </button>
        </div>
      </aside>

      <main className={styles.contentArea}>
        <div className={styles.topBar}>
          <div>
            <p className={styles.eyebrow}>Khu vực trang trại</p>
            <h2>Quản lý khu vực</h2>
          </div>
          <ZoneActionMenu context="overview" backHref="/dashboard" onOpenSettings={() => setSettingsOpen(true)} />
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

        <section className={styles.gridCards}>
          {filteredZones.length > 0 ? (
            filteredZones.map((zone) => {
              const cancelled = isCancelledZone(zone);
              return (
                <article key={zone.id} className={styles.zoneCard}>
                  <div className={styles.zoneCardInner}>
                    <div className={styles.zoneInfo}>
                      <div className={styles.zoneCardHeader}>
                        <div>
                          <h3>{zone.name}</h3>
                          <p className={styles.zoneSub}>{zone.typeLabel}</p>
                        </div>
                        <span className={`${styles.badge} ${cancelled ? styles.statusMuted : zone.status.toLowerCase().includes("active") ? styles.statusActive : zone.status.toLowerCase().includes("draft") ? styles.statusDraft : styles.statusMuted}`}>
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
              );
            })
          ) : (
            <article className={styles.emptyCard}>Chưa có khu vực nào khớp bộ lọc hiện tại.</article>
          )}
        </section>

        <section className={styles.mapSection}>
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
        </section>
      </main>
    </div>
  );
}
