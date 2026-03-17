"use client";

import React, { useMemo, useState } from "react";
import styles from "./SmartFarmDashboard.module.scss";

type DashboardProfile = {
  fullName: string;
  farmName: string;
  address: string;
  lat?: number;
  lng?: number;
};

type SmartFarmDashboardProps = {
  profile?: DashboardProfile;
};

type LayerKey = "paddocks" | "water" | "vehicles" | "fences" | "sensors";

type Zone = {
  id: string;
  name: string;
  status: "healthy" | "warning" | "critical";
  resources: { water: number; livestock: number; sensors: number };
};

const sidebarMenus = [
  "Dashboard",
  "Farm Map",
  "Livestock",
  "Animal Counting",
  "Livestock Tracking",
  "Paddocks & Fields",
  "Water Resources",
  "Vehicle Tracking",
  "Fencing",
  "Energy Consumption",
  "Alerts & Notifications",
  "Food Traceability",
  "Air Quality Monitoring",
  "Weather",
  "Settings",
];

const metricPills = [
  { label: "Farm", value: "1" },
  { label: "Users", value: "1 / 3" },
  { label: "Assets", value: "57" },
  { label: "Paddocks", value: "12" },
  { label: "Sensors", value: "36" },
  { label: "Dams", value: "1" },
  { label: "Fences", value: "9" },
  { label: "Pumps", value: "1" },
  { label: "Rain Gauges", value: "4" },
  { label: "Tanks", value: "3" },
];

const widgets = [
  { title: "Livestock", rows: ["Cattle: 109", "Sheep: 97", "Goats: 0", "Pigs: 0"] },
  { title: "Animal Counting", rows: ["Camera: 3", "Today: 133", "Yesterday: 142", "Last 7 days: 1203"] },
  { title: "Livestock Tracking", rows: ["Tags: 109", "In paddock: 1", "Groups: 6", "Exp paddock: 5"] },
  { title: "Paddocks & Fields", rows: ["Paddocks: 12", "Grazing: 5", "Hay: 5", "Resting: 2"] },
  { title: "Water Resources", rows: ["Sensors: 6", "Tanks: 3", "Dams: 1", "Pumps: 1"] },
  { title: "Rainfall", rows: ["Day: 2mm", "Week: 89mm", "Month: 112mm", "Rolling Yr: 1198mm"] },
  { title: "Cold Storage", rows: ["Sensors: 4", "Fridges: 4", "Freezers: 2", "Status: Warning"] },
  { title: "Soil Health", rows: ["Moisture: 68%", "Temp: 27°C", "Salinity: 8.5", "Sensors: 2"] },
];

const initialZones: Zone[] = [
  { id: "z1", name: "Paddock A1", status: "healthy", resources: { water: 3, livestock: 22, sensors: 4 } },
  { id: "z2", name: "Paddock A2", status: "warning", resources: { water: 2, livestock: 15, sensors: 2 } },
  { id: "z3", name: "Paddock B1", status: "healthy", resources: { water: 4, livestock: 18, sensors: 3 } },
  { id: "z4", name: "Paddock B2", status: "critical", resources: { water: 1, livestock: 7, sensors: 1 } },
  { id: "z5", name: "Paddock C1", status: "warning", resources: { water: 2, livestock: 10, sensors: 2 } },
  { id: "z6", name: "Paddock C2", status: "healthy", resources: { water: 3, livestock: 14, sensors: 3 } },
];

const layerOptions: { key: LayerKey; label: string }[] = [
  { key: "paddocks", label: "Paddocks (12)" },
  { key: "water", label: "Water (10)" },
  { key: "vehicles", label: "Vehicles (7)" },
  { key: "fences", label: "Fences (9)" },
  { key: "sensors", label: "Sensors (36)" },
];

export default function SmartFarmDashboard({ profile }: SmartFarmDashboardProps) {
  const farmName = profile?.farmName || "Ket Farm";
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    paddocks: true,
    water: true,
    vehicles: true,
    fences: true,
    sensors: true,
  });
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [selectedZone, setSelectedZone] = useState(initialZones[0].id);
  const [resourceMode, setResourceMode] = useState<"water" | "livestock" | "sensors">("water");
  const [timeScale, setTimeScale] = useState("Hiện tại");
  const [zoom, setZoom] = useState(7);

  const selected = useMemo(() => zones.find((z) => z.id === selectedZone) ?? zones[0], [zones, selectedZone]);
  const totals = useMemo(
    () =>
      zones.reduce(
        (acc, z) => {
          acc.water += z.resources.water;
          acc.livestock += z.resources.livestock;
          acc.sensors += z.resources.sensors;
          return acc;
        },
        { water: 0, livestock: 0, sensors: 0 }
      ),
    [zones]
  );

  const allocateResource = (zoneId: string) => {
    setZones((prev) =>
      prev.map((zone) =>
        zone.id === zoneId
          ? { ...zone, resources: { ...zone.resources, [resourceMode]: zone.resources[resourceMode] + 1 } }
          : zone
      )
    );
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h2>farmdeck</h2>
        <ul>
          {sidebarMenus.map((item) => (
            <li
              key={item}
              className={activeMenu === item ? styles.activeMenu : ""}
              onClick={() => setActiveMenu(item)}
            >
              {item}
            </li>
          ))}
        </ul>
      </aside>

      <main className={styles.main}>
        {activeMenu === "Farm Map" ? (
          <section>
            <header className={styles.topbar}>
              <div>
                <h1>Farm Map</h1>
                <p>Phân bổ tài nguyên theo vị trí và theo từng thời điểm vận hành.</p>
              </div>
              <span>
                {profile?.address || "Long Thành, Đồng Nai"}
                {profile?.lat !== undefined && profile?.lng !== undefined
                  ? ` · ${profile.lat.toFixed(4)}, ${profile.lng.toFixed(4)}`
                  : ""}
              </span>
            </header>

            <article className={styles.noticeCard}>
              <h3>Farm Map Dashboard Update</h3>
              <p>
                Quản lý tài nguyên theo khu vực bản đồ: nước tưới, vật nuôi, cảm biến và thiết bị.
                Chọn lớp dữ liệu, mức zoom, khung thời gian và bấm vào ô khu vực để cấp thêm tài nguyên.
              </p>
            </article>

            <section className={styles.kpiGrid}>
              <article><b>{totals.water + totals.livestock + totals.sensors}</b><small>Assets</small></article>
              <article><b>{totals.sensors}</b><small>Sensors</small></article>
              <article><b>{totals.livestock}</b><small>Livestock</small></article>
              <article><b>{zones.length}</b><small>Paddocks</small></article>
            </section>

            <section className={styles.mapControls}>
              <div className={styles.toggleRow}>
                {layerOptions.map((layer) => (
                  <button
                    key={layer.key}
                    className={layers[layer.key] ? styles.toggleActive : styles.toggleBtn}
                    onClick={() => setLayers((prev) => ({ ...prev, [layer.key]: !prev[layer.key] }))}
                  >
                    {layer.label}
                  </button>
                ))}
              </div>

              <div className={styles.configRow}>
                <label>
                  Kích cỡ lúc:
                  <select value={timeScale} onChange={(e) => setTimeScale(e.target.value)}>
                    <option>Hiện tại</option>
                    <option>Ca sáng</option>
                    <option>Ca chiều</option>
                    <option>Theo tuần</option>
                  </select>
                </label>
                <label>
                  Chế độ phân bổ:
                  <select
                    value={resourceMode}
                    onChange={(e) => setResourceMode(e.target.value as "water" | "livestock" | "sensors")}
                  >
                    <option value="water">Nước tưới</option>
                    <option value="livestock">Vật nuôi</option>
                    <option value="sensors">Cảm biến</option>
                  </select>
                </label>
                <label>
                  Zoom: {zoom}
                  <input
                    type="range"
                    min={4}
                    max={12}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                  />
                </label>
              </div>
            </section>

            <section className={styles.mapFrame}>
              <img src="/assets/img/gallery/gl1.jpg" alt="Farm satellite" />
              <div className={styles.overlayHint}>Sử dụng ctrl + cuộn để thu phóng bản đồ</div>
              <div className={styles.hexGrid}>
                {zones.map((zone) => (
                  <button
                    key={zone.id}
                    className={`${styles.hex} ${styles[zone.status]} ${zone.id === selectedZone ? styles.hexSelected : ""}`}
                    onClick={() => {
                      setSelectedZone(zone.id);
                      allocateResource(zone.id);
                    }}
                  >
                    <strong>{zone.name}</strong>
                    <span>Nước: {zone.resources.water}</span>
                    <span>Vật nuôi: {zone.resources.livestock}</span>
                    <span>Sensor: {zone.resources.sensors}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.allocationPanel}>
              <h3>Khu vực đang chọn: {selected.name}</h3>
              <p>
                Trạng thái: <b>{selected.status}</b> • Khung thời gian: <b>{timeScale}</b>
              </p>
              <p>
                Mỗi lần bấm vào một ô trên map sẽ tự tăng 1 đơn vị tài nguyên theo chế độ phân bổ hiện tại.
              </p>
            </section>
          </section>
        ) : (
          <section>
            <header className={styles.topbar}>
              <div>
                <h1>{farmName}</h1>
                <p>Tổng quan vận hành nông trại thông minh cho {profile?.fullName || "quản trị viên"}.</p>
              </div>
              <span>
                {profile?.address || "Long Thành, Đồng Nai"}
                {profile?.lat !== undefined && profile?.lng !== undefined
                  ? ` · ${profile.lat.toFixed(4)}, ${profile.lng.toFixed(4)}`
                  : ""}
              </span>
            </header>

            <section className={styles.pillRow}>
              {metricPills.map((pill) => (
                <article key={pill.label}>
                  <b>{pill.value}</b>
                  <small>{pill.label}</small>
                </article>
              ))}
            </section>

            <section className={styles.mapWidget}>
              <div>
                <h3>Farm Snapshot</h3>
                <p>Nhiệt độ hiện tại: 32°C • Theo dõi nhanh toàn bộ vùng trồng và tài sản.</p>
              </div>
              <img src="/assets/img/gallery/gl1.jpg" alt="Farm map" />
            </section>

            <section className={styles.widgetGrid}>
              {widgets.map((widget) => (
                <article key={widget.title} className={styles.widgetCard}>
                  <div className={styles.widgetHeader}>
                    <h4>{widget.title}</h4>
                    <span>Demo</span>
                  </div>
                  <ul>
                    {widget.rows.map((row) => (
                      <li key={row}>{row}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>
          </section>
        )}
      </main>
    </div>
  );
}
