"use client";

import React from "react";
import styles from "./SmartFarmDashboard.module.scss";

type DashboardProfile = {
  fullName: string;
  farmName: string;
  address: string;
};

type SmartFarmDashboardProps = {
  profile?: DashboardProfile;
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
  { label: "Sensors", value: "12" },
  { label: "Dams", value: "1" },
  { label: "Fences", value: "3" },
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
  { title: "Vehicles", rows: ["Vehicles: 7", "Tracked: 7", "Tractor: 1", "Car: 1"] },
  { title: "Fencing Assets", rows: ["Fences: 3", "Energisers: 3", "Sensors: 3", "Alerts: 0"] },
  { title: "Energy", rows: ["Today: 192 kWh", "Week: 654 kWh", "Month: 6,286 kWh", "Year: 89,165 kWh"] },
  { title: "Alerts", rows: ["Alert configs: 9", "Active alerts: 8", "Notifications: 9", "Cow tags: 0"] },
  { title: "Chemical Products", rows: ["Agricultural: 2", "Veterinary: 9", "Expiry: 10", "In stock: 23"] },
  { title: "Vehicle Counting", rows: ["Sensors: 3", "4WD: 21", "Truck: 29", "Large vehicle: 36"] },
  { title: "Video Surveillance", rows: ["Sensors: 4", "Cameras: 4", "Feeds: 1", "Detections: 0"] },
  { title: "Air Quality", rows: ["Sensors: 6", "Humidity: 89%", "Temperature: 35°C", "PM10: 21"] },
];

export default function SmartFarmDashboard({ profile }: SmartFarmDashboardProps) {
  const farmName = profile?.farmName || "Ket Farm";

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h2>farmdeck</h2>
        <ul>
          {sidebarMenus.map((item, index) => (
            <li key={item} className={index === 0 ? styles.activeMenu : ""}>
              {item}
            </li>
          ))}
        </ul>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1>{farmName}</h1>
            <p>Tổng quan vận hành nông trại thông minh cho {profile?.fullName || "quản trị viên"}.</p>
          </div>
          <span>{profile?.address || "Long Thành, Đồng Nai"}</span>
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
      </main>
    </div>
  );
}
