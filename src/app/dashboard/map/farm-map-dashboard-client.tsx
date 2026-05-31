"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import styles from "./page.module.css";

export type FarmMapStats = {
  employees: number;
  livestock: number;
  paddocks: number;
  grazingPlans: number;
};

export type FarmMapZone = {
  id: string;
  name: string;
  type: string;
  status: string;
  updatedAt: string;
  kind: string;
  color: string;
  polygon: Array<{ lat: number; lng: number }>;
};

export type FarmMapObject = {
  id: string;
  label?: string;
  color?: string;
  kind?: string;
  geometry:
    | { type: "Point"; coordinates: [number, number] }
    | { type: "Polygon"; coordinates: [number, number][][] };
};

export type FarmMapAssetRow = {
  id: string;
  farm: string;
  name: string;
  category: string;
  type: string;
  description: string;
  color: string;
};

type SettingsState = {
  updateMessage: boolean;
  headerSummary: boolean;
  map: boolean;
  table: boolean;
  farmAssets: boolean;
};

type Props = {
  farmName: string;
  locationName: string;
  lat: number;
  lng: number;
  stats: FarmMapStats;
  zones: FarmMapZone[];
  objects: FarmMapObject[];
  assetRows: FarmMapAssetRow[];
};

const initialSettings: SettingsState = {
  updateMessage: true,
  headerSummary: true,
  map: true,
  table: true,
  farmAssets: true,
};

function Icon({ name }: { name: string }) {
  switch (name) {
    case "map":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" />
          <path d="M9 4v14M15 6v14" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
          <path d="M19.4 15a8 8 0 0 0 .1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L15 6.5h-4L10.6 9a8 8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a8 8 0 0 0 .1 2l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1l.3 2.5h4l.4-2.5a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2.1-1.5Z" />
        </svg>
      );
    case "back":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      );
    case "assets":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19h16M7 19v-7h4v7M13 19V9h4v10M9 12V7h6v2" />
        </svg>
      );
    case "mapped":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 18 9 6l5 12 5-10" />
          <path d="M5 18h14" />
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="14" cy="18" r="1.5" />
          <circle cx="19" cy="8" r="1.5" />
        </svg>
      );
    case "sensors":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M8 9a5 5 0 0 0 0 6M16 9a5 5 0 0 1 0 6M5 6a9 9 0 0 0 0 12M19 6a9 9 0 0 1 0 12" />
        </svg>
      );
    case "employees":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M17 10a3 3 0 1 0 0-6" />
          <path d="M18.5 20H22a5 5 0 0 0-5-5" />
        </svg>
      );
    case "groups":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 13c0-2.2 1.8-4 4-4s4 1.8 4 4" />
          <path d="M4 18c1.8-2.4 4.2-3.5 7-3.5s5.2 1.1 7 3.5" />
          <path d="M16 10c1.7.2 3 1.6 3 3.3M5 13.3c0-1.7 1.3-3.1 3-3.3" />
        </svg>
      );
    case "plans":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4h10v16H7z" />
          <path d="M10 8h4M10 12h4M10 16h2" />
          <path d="M4 8h3M4 16h3M17 8h3M17 16h3" />
        </svg>
      );
    case "paddocks":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5v14M19 5v14M3 9h18M3 15h18" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12h16" />
        </svg>
      );
  }
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className={styles.toggleTrack} aria-hidden="true" />
    </label>
  );
}

export default function FarmMapDashboardClient({
  farmName,
  locationName,
  lat,
  lng,
  stats,
  zones,
  objects,
  assetRows,
}: Props) {
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "category" | "type">("name");
  const [groupBy, setGroupBy] = useState<"none" | "category" | "farm">("none");
  const [filterBy, setFilterBy] = useState<"all" | "zone" | "asset">("all");
  const router = useRouter();
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!actionsOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) setActionsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActionsOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionsOpen]);

  const visibleZones = settings.farmAssets
    ? zones.filter((zone) => zone.polygon.length >= 3).map((zone) => ({ id: zone.id, label: zone.name, color: zone.color, polygon: zone.polygon, kind: zone.kind }))
    : [];
  const visibleObjects = settings.farmAssets ? objects : [];
  const summaryCards = [
    { label: "Khu vực", value: stats.paddocks, caption: "đang quản lý", icon: "paddocks" },
    { label: "Nhân viên", value: stats.employees, caption: "trong nông trại", icon: "employees" },
    { label: "Vật nuôi", value: stats.livestock, caption: "ghi nhận", icon: "groups" },
    { label: "Kế hoạch chăn thả", value: stats.grazingPlans, caption: "đang quản lý", icon: "plans" },
  ];

  const tableRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return assetRows
      .filter((row) => {
        if (!settings.farmAssets) return false;
        if (filterBy === "zone" && row.category !== "Khu vực" && row.category !== "Chăn nuôi") return false;
        if (filterBy === "asset" && row.category === "Khu vực") return false;
        if (!needle) return true;
        return [row.id, row.farm, row.name, row.category, row.type, row.description].some((value) => value.toLowerCase().includes(needle));
      })
      .sort((a, b) => a[sortBy].localeCompare(b[sortBy], "vi"));
  }, [assetRows, filterBy, search, settings.farmAssets, sortBy]);

  const groupedRows = useMemo(() => {
    if (groupBy === "none") return [{ label: "", rows: tableRows }];
    const groups = new Map<string, FarmMapAssetRow[]>();
    tableRows.forEach((row) => {
      const key = row[groupBy] || "Khác";
      groups.set(key, [...(groups.get(key) ?? []), row]);
    });
    return Array.from(groups.entries()).map(([label, rows]) => ({ label, rows }));
  }, [groupBy, tableRows]);

  const updateSetting = (key: keyof SettingsState, value: boolean) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className={styles.farmMapPage}>
      <header className={styles.pageHeader}>
        <div className={styles.titleWrap}>
          <span className={styles.titleIcon}>
            <Icon name="map" />
          </span>
          <div>
            <p className={styles.eyebrow}>Bản đồ trang trại</p>
            <h1>Bản đồ trang trại</h1>
          </div>
        </div>

        <div className={styles.tools} ref={actionsRef}>
          <button type="button" className={styles.backButton} onClick={() => router.back()}>
            <span className={styles.buttonIcon}>
              <Icon name="back" />
            </span>
            <span>Quay lại</span>
          </button>
          <div className={styles.actionMenu}>
            <button type="button" className={styles.actionButton} onClick={() => setActionsOpen((value) => !value)} aria-haspopup="menu" aria-expanded={actionsOpen}>
              <span className={styles.buttonIcon}>
                <Icon name="settings" />
              </span>
              <span>Tác vụ</span>
              <span className={styles.chevron} aria-hidden="true">▾</span>
            </button>
            {actionsOpen && (
              <div className={styles.dropdown} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.dropdownItem}
                  data-tone="blue"
                  onClick={() => {
                    setSettingsOpen(true);
                    setActionsOpen(false);
                  }}
                >
                  <span className={styles.menuIcon}>
                    <Icon name="settings" />
                  </span>
                  <span>Cài đặt hiển thị</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {settings.updateMessage && (
        <section className={styles.noticeCard}>
          <button type="button" className={styles.closeButton} onClick={() => updateSetting("updateMessage", false)} aria-label="Ẩn thông báo">
            ×
          </button>
          <h2>Cập nhật bảng điều khiển bản đồ trang trại</h2>
          <p>
            Bảng điều khiển bản đồ đã được nâng cấp để cung cấp góc nhìn rõ hơn về tài sản, khu vực canh tác, vật nuôi,
            nguồn nước, phương tiện, hàng rào, kho và các dữ liệu cảm biến trong trang trại.
          </p>
          <p>
            Bạn có thể quản lý dữ liệu trực tiếp trên bản đồ hoặc trong bảng chi tiết. Dùng mục Cài đặt trong nút Hành
            động để bật tắt các phần cần theo dõi.
          </p>
        </section>
      )}

      {settings.headerSummary && (
        <section className={styles.summaryGrid}>
          {summaryCards.map((item) => (
            <article key={item.label} className={styles.summaryCard}>
              <div className={styles.summaryLabel}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </div>
              <strong>{item.value}</strong>
              <small>{item.caption}</small>
            </article>
          ))}
        </section>
      )}

      {settings.map && (
        <section className={styles.mapCard}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Bản đồ trang trại</h2>
              <p>{farmName} · {locationName}</p>
            </div>
          </div>
          <MapViewSwitcher
            lat={lat}
            lng={lng}
            zoom={17}
            title="Bản đồ khu vực trang trại"
            frameClassName={styles.mapCanvas}
            zones={visibleZones}
            objects={visibleObjects}
            fitToPolygon={visibleZones.length > 0 || visibleObjects.length > 0}
            hideModeTabs
            hideEcoNote
          />
          <div className={styles.mapNotes}>
            <strong>Ghi chú:</strong>
            <ol>
              <li>Chỉ hiển thị các khu vực và tài sản có dữ liệu vị trí hợp lệ.</li>
              <li>Khu vực có đa giác sẽ được tô màu theo loại hoặc màu đã cấu hình.</li>
              <li>Chấm đánh dấu thể hiện vị trí trang trại hoặc đối tượng bản đồ.</li>
              <li>Có thể bật tắt bản đồ, bảng và phần tóm tắt trong Cài đặt hiển thị.</li>
            </ol>
          </div>
        </section>
      )}

      {settings.table && (
        <section className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2>Tất cả tài sản</h2>
            <div className={styles.tableTools}>
              <label className={styles.searchBox}>
                <span aria-hidden="true">⌕</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm..." />
              </label>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} aria-label="Sắp xếp">
                <option value="name">Sắp xếp theo tên</option>
                <option value="category">Sắp xếp theo nhóm</option>
                <option value="type">Sắp xếp theo loại</option>
              </select>
              <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as typeof groupBy)} aria-label="Nhóm">
                <option value="none">Không nhóm</option>
                <option value="category">Nhóm theo danh mục</option>
                <option value="farm">Nhóm theo trang trại</option>
              </select>
              <select value={filterBy} onChange={(event) => setFilterBy(event.target.value as typeof filterBy)} aria-label="Lọc">
                <option value="all">Tất cả</option>
                <option value="zone">Khu vực</option>
                <option value="asset">Tài sản khác</option>
              </select>
            </div>
          </div>

          <div className={styles.tableScroller}>
            <table className={styles.assetTable}>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Trang trại</th>
                  <th>Tên</th>
                  <th>Danh mục</th>
                  <th>Loại</th>
                  <th>Mô tả</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((group, groupIndex) => (
                  <Fragment key={group.label || `rows-${groupIndex}`}>
                    {group.label && (
                      <tr key={`${group.label}-group`} className={styles.groupRow}>
                        <td colSpan={6}>{group.label}</td>
                      </tr>
                    )}
                    {group.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.farm}</td>
                        <td>
                          <span className={styles.colorDot} style={{ backgroundColor: row.color }} />
                          {row.name}
                        </td>
                        <td>{row.category}</td>
                        <td>{row.type}</td>
                        <td>{row.description}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {tableRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className={styles.emptyCell}>
                      Chưa có dữ liệu phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className={styles.tableFooter}>
            <span>Kích thước trang</span>
            <select defaultValue="25" aria-label="Kích thước trang">
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <strong>1</strong>
          </div>
        </section>
      )}

      {settingsOpen && (
        <div className={styles.settingsLayer}>
          <button type="button" className={styles.settingsBackdrop} onClick={() => setSettingsOpen(false)} aria-label="Đóng cài đặt" />
          <aside className={styles.settingsPanel} aria-label="Cài đặt bản đồ">
            <button type="button" className={styles.settingsClose} onClick={() => setSettingsOpen(false)} aria-label="Đóng cài đặt">
              ×
            </button>
            <h2>Cài đặt</h2>

            <section className={styles.settingSection}>
              <h3>Chung</h3>
              <ToggleRow label="Thông báo cập nhật" checked={settings.updateMessage} onChange={(value) => updateSetting("updateMessage", value)} />
              <ToggleRow label="Tóm tắt đầu trang" checked={settings.headerSummary} onChange={(value) => updateSetting("headerSummary", value)} />
              <ToggleRow label="Bản đồ" checked={settings.map} onChange={(value) => updateSetting("map", value)} />
              <ToggleRow label="Bảng dữ liệu" checked={settings.table} onChange={(value) => updateSetting("table", value)} />
              <p>Ẩn hoặc hiện các phần chính của màn hình bản đồ.</p>
            </section>

            <section className={styles.settingSection}>
              <h3>Tài sản trang trại</h3>
              <ToggleRow label="Bao gồm tất cả" checked={settings.farmAssets} onChange={(value) => updateSetting("farmAssets", value)} />
              <p>Bật hoặc tắt các lớp tài sản và khu vực trên bản đồ.</p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
