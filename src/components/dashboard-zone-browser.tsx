"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
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

const tabs = ["tat-ca", "trong-trot", "dong-co", "chan-nuoi", "kho-luong-thuc", "kho-dung-cu", "bai-do-xe"] as const;
function ZoneMiniMap({ zone }: { zone: ZoneListItem }) {
  return <ZonePreviewCard zone={zone} />;
}

export default function ZoneBrowser({ farmName, location, zones, filters }: Props) {
  const [activeFilter, setActiveFilter] = useState<(typeof tabs)[number]>("tat-ca");

  const filteredZones = useMemo(
    () => (activeFilter === "tat-ca" ? zones : zones.filter((zone) => zone.typeSlug === activeFilter)),
    [activeFilter, zones]
  );

  const mapZones = useMemo(
    () => filteredZones.filter((zone) => zone.polygon.length >= 3).map((zone) => ({ id: zone.id, label: zone.name, color: zone.color, polygon: zone.polygon, kind: zone.typeSlug })),
    [filteredZones]
  );

  const totalArea = filteredZones.reduce((sum, zone) => sum + zone.areaHa, 0);
  const focus = location ?? { latitude: 10.762622, longitude: 106.660172, locationName: null };

  const visibleTabs = filters.length
    ? filters
    : [
        { slug: "tat-ca", label: "Tất cả", count: zones.length },
        { slug: "trong-trot", label: "Trồng trọt", count: zones.filter((z) => z.typeSlug === "trong-trot").length },
        { slug: "dong-co", label: "Đồng cỏ", count: zones.filter((z) => z.typeSlug === "dong-co").length },
        { slug: "chan-nuoi", label: "Chăn nuôi", count: zones.filter((z) => z.typeSlug === "chan-nuoi").length },
        { slug: "kho-luong-thuc", label: "Kho lương thực", count: zones.filter((z) => z.typeSlug === "kho-luong-thuc").length },
        { slug: "kho-dung-cu", label: "Kho dụng cụ", count: zones.filter((z) => z.typeSlug === "kho-dung-cu").length },
        { slug: "bai-do-xe", label: "Bãi đỗ xe", count: zones.filter((z) => z.typeSlug === "bai-do-xe").length },
      ];

  return (
    <div className={styles.page}>
      <main className={styles.contentArea}>
        <div className={styles.topBar}>
          <div>
            <p className={styles.eyebrow}>Khu vực trang trại</p>
            <h2>Quản lý khu vực</h2>
          </div>
          <Link href="/dashboard/khu-vuc/tao-moi" className={styles.primaryButton}>Tạo khu vực</Link>
        </div>

        <div className={styles.tabRow}>
          {tabs.map((slug) => {
            const filter = visibleTabs.find((item) => item.slug === slug);
            if (!filter) return null;
            const active = activeFilter === slug;
            return (
              <button key={slug} className={`${styles.filterChip} ${active ? styles.filterChipActive : ""}`} type="button" onClick={() => setActiveFilter(slug)}>
                <span>{filter.label}</span>
                <strong>{filter.count}</strong>
              </button>
            );
          })}
        </div>

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
                      <span className={`${styles.badge} ${zone.status.toLowerCase().includes("active") ? styles.statusActive : zone.status.toLowerCase().includes("draft") ? styles.statusDraft : styles.statusMuted}`}>
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
              <button key={item.slug} type="button" className={`${styles.mapToggle} ${activeFilter === item.slug ? styles.mapToggleActive : ""}`} onClick={() => setActiveFilter(item.slug as (typeof tabs)[number])}>
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
