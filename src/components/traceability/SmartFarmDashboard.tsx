"use client";

import React, { CSSProperties, useMemo, useState } from "react";
import styles from "./SmartFarmDashboard.module.scss";

type DashboardProfile = {
  fullName: string;
  farmName: string;
  address: string;
  lat?: number;
  lng?: number;
  defaultGridArea?: number;
  areaUnit?: string;
};

type SmartFarmDashboardProps = {
  profile?: DashboardProfile;
};

type LayerKey = "paddocks" | "water" | "vehicles" | "fences" | "sensors";
type ResourceType = "water" | "livestock" | "sensors" | "vehicle";
type ZoneStatus = "healthy" | "warning" | "critical";

type ResourceItem = {
  id: string;
  type: ResourceType;
  name: string;
  status: ZoneStatus;
  lastSeen: string;
  quantity: number;
};

type ZoneGeo = {
  lat: number;
  lng: number;
  latSpan: number;
  lngSpan: number;
};

type Zone = {
  id: string;
  name: string;
  code: string;
  status: ZoneStatus;
  occupancy: number;
  coverage: string;
  geo: ZoneGeo;
  resources: ResourceItem[];
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
  {
    id: "z1",
    name: "Paddock A1",
    code: "A1",
    status: "healthy",
    occupancy: 72,
    coverage: "4.3 ha",
    geo: { lat: 10.8228, lng: 106.6267, latSpan: 0.0019, lngSpan: 0.0024 },
    resources: [
      { id: "z1-r1", type: "water", name: "Tank 01", status: "healthy", lastSeen: "2 phút trước", quantity: 3 },
      { id: "z1-r2", type: "livestock", name: "Cattle group 01", status: "healthy", lastSeen: "5 phút trước", quantity: 22 },
      { id: "z1-r3", type: "sensors", name: "Sensor hub A1", status: "healthy", lastSeen: "Trực tuyến", quantity: 4 },
    ],
  },
  {
    id: "z2",
    name: "Paddock A2",
    code: "A2",
    status: "warning",
    occupancy: 58,
    coverage: "3.8 ha",
    geo: { lat: 10.8231, lng: 106.6288, latSpan: 0.0021, lngSpan: 0.0022 },
    resources: [
      { id: "z2-r1", type: "water", name: "Water line 02", status: "warning", lastSeen: "12 phút trước", quantity: 2 },
      { id: "z2-r2", type: "livestock", name: "Cattle group 02", status: "healthy", lastSeen: "7 phút trước", quantity: 15 },
      { id: "z2-r3", type: "sensors", name: "Moisture rack A2", status: "warning", lastSeen: "8 phút trước", quantity: 2 },
    ],
  },
  {
    id: "z3",
    name: "Paddock B1",
    code: "B1",
    status: "healthy",
    occupancy: 66,
    coverage: "5.1 ha",
    geo: { lat: 10.8225, lng: 106.6310, latSpan: 0.0022, lngSpan: 0.0025 },
    resources: [
      { id: "z3-r1", type: "water", name: "Reservoir B1", status: "healthy", lastSeen: "4 phút trước", quantity: 4 },
      { id: "z3-r2", type: "livestock", name: "Goat group B1", status: "healthy", lastSeen: "10 phút trước", quantity: 18 },
      { id: "z3-r3", type: "sensors", name: "Weather node B1", status: "healthy", lastSeen: "Trực tuyến", quantity: 3 },
    ],
  },
  {
    id: "z4",
    name: "Paddock B2",
    code: "B2",
    status: "critical",
    occupancy: 84,
    coverage: "2.9 ha",
    geo: { lat: 10.8201, lng: 106.6279, latSpan: 0.0017, lngSpan: 0.0022 },
    resources: [
      { id: "z4-r1", type: "water", name: "Pump line B2", status: "critical", lastSeen: "28 phút trước", quantity: 1 },
      { id: "z4-r2", type: "livestock", name: "Isolation pen B2", status: "warning", lastSeen: "14 phút trước", quantity: 7 },
      { id: "z4-r3", type: "sensors", name: "Thermal camera B2", status: "critical", lastSeen: "Mất kết nối", quantity: 1 },
    ],
  },
  {
    id: "z5",
    name: "Paddock C1",
    code: "C1",
    status: "warning",
    occupancy: 49,
    coverage: "3.2 ha",
    geo: { lat: 10.8197, lng: 106.6299, latSpan: 0.0018, lngSpan: 0.0023 },
    resources: [
      { id: "z5-r1", type: "water", name: "Drip line C1", status: "healthy", lastSeen: "6 phút trước", quantity: 2 },
      { id: "z5-r2", type: "livestock", name: "Nursery group C1", status: "warning", lastSeen: "13 phút trước", quantity: 10 },
      { id: "z5-r3", type: "sensors", name: "pH sensor C1", status: "warning", lastSeen: "11 phút trước", quantity: 2 },
    ],
  },
  {
    id: "z6",
    name: "Paddock C2",
    code: "C2",
    status: "healthy",
    occupancy: 63,
    coverage: "4.8 ha",
    geo: { lat: 10.8200, lng: 106.6322, latSpan: 0.0020, lngSpan: 0.0026 },
    resources: [
      { id: "z6-r1", type: "water", name: "Lake C2", status: "healthy", lastSeen: "3 phút trước", quantity: 3 },
      { id: "z6-r2", type: "livestock", name: "Cattle group C2", status: "healthy", lastSeen: "4 phút trước", quantity: 14 },
      { id: "z6-r3", type: "sensors", name: "Air node C2", status: "healthy", lastSeen: "Trực tuyến", quantity: 3 },
    ],
  },
];

const layerOptions: { key: LayerKey; label: string }[] = [
  { key: "paddocks", label: "Paddocks (12)" },
  { key: "water", label: "Water (10)" },
  { key: "vehicles", label: "Vehicles (7)" },
  { key: "fences", label: "Fences (9)" },
  { key: "sensors", label: "Sensors (36)" },
];

const resourceTypeLabels: Record<ResourceType, string> = {
  water: "Nước tưới",
  livestock: "Vật nuôi",
  sensors: "Cảm biến",
  vehicle: "Phương tiện",
};

const statusLabels: Record<ZoneStatus, string> = {
  healthy: "Ổn định",
  warning: "Cần kiểm tra",
  critical: "Khẩn cấp",
};

const statusOptions: Array<ZoneStatus | "all"> = ["all", "healthy", "warning", "critical"];
const resourceTypeOptions: Array<ResourceType | "all"> = ["all", "water", "livestock", "sensors", "vehicle"];

export default function SmartFarmDashboard({ profile }: SmartFarmDashboardProps) {
  const farmName = profile?.farmName || "Ket Farm";
  const areaUnit = profile?.areaUnit || "Hecta";
  const defaultGridArea = profile?.defaultGridArea || 1;
  const originLat = profile?.lat ?? 10.8216;
  const originLng = profile?.lng ?? 106.6295;
  const mapQuery = profile?.lat !== undefined && profile?.lng !== undefined
    ? `${profile.lat},${profile.lng}`
    : profile?.address || "Long Thành, Đồng Nai";
  const [activeMenu, setActiveMenu] = useState("Farm Map");
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    paddocks: true,
    water: true,
    vehicles: true,
    fences: true,
    sensors: true,
  });
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [selectedZone, setSelectedZone] = useState(initialZones[0].id);
  const [resourceMode, setResourceMode] = useState<ResourceType>("water");
  const [timeScale, setTimeScale] = useState("Hiện tại");
  const [statusFilter, setStatusFilter] = useState<ZoneStatus | "all">("all");
  const [resourceFilter, setResourceFilter] = useState<ResourceType | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [zoom, setZoom] = useState(17);
  const satelliteEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=k&z=${zoom}&ie=UTF8&iwloc=&output=embed`;

  const totals = useMemo(() => {
    return zones.reduce(
      (acc, zone) => {
        zone.resources.forEach((resource) => {
          acc.totalAssets += resource.quantity;
          acc[resource.type] += resource.quantity;
          if (resource.status === "critical") acc.alerts += 1;
        });
        return acc;
      },
      { totalAssets: 0, water: 0, livestock: 0, sensors: 0, vehicle: 0, alerts: 0 }
    );
  }, [zones]);

  const filteredZones = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return zones.filter((zone) => {
      const matchesStatus = statusFilter === "all" || zone.status === statusFilter;
      const matchesSearch =
        keyword.length === 0 ||
        zone.name.toLowerCase().includes(keyword) ||
        zone.code.toLowerCase().includes(keyword) ||
        zone.resources.some((resource) => resource.name.toLowerCase().includes(keyword));
      const matchesResource =
        resourceFilter === "all" || zone.resources.some((resource) => resource.type === resourceFilter);

      return matchesStatus && matchesSearch && matchesResource;
    });
  }, [resourceFilter, searchTerm, statusFilter, zones]);

  const selected = useMemo(() => zones.find((zone) => zone.id === selectedZone) ?? zones[0], [selectedZone, zones]);
  const zoomScale = 1 + (zoom - 17) * 0.12;

  const summaryColumns = useMemo(
    () => [
      {
        title: "Map vệ tinh cố định",
        value: `Zoom ${zoom}`,
        detail: "Khung map cố định, khóa pan, chỉ cho phóng to / thu nhỏ.",
      },
      {
        title: "Area mặc định",
        value: `${defaultGridArea.toFixed(1)} ${areaUnit}`,
        detail: "Các ô area độc lập, có thể sửa riêng từng ô.",
      },
      {
        title: "Grid cần xử lý",
        value: `${zones.filter((zone) => zone.status !== "healthy").length}`,
        detail: "Bao gồm warning + critical.",
      },
      {
        title: "Toạ độ gốc",
        value:
          profile?.lat !== undefined && profile?.lng !== undefined
            ? `${profile.lat.toFixed(4)}, ${profile.lng.toFixed(4)}`
            : "Chưa có toạ độ",
        detail: "Map luôn neo theo vị trí gốc khi tạo farm.",
      },
    ],
    [areaUnit, defaultGridArea, originLat, originLng, zoom, zones]
  );

  const updateZoneGeo = (zoneId: string, field: keyof ZoneGeo, value: number) => {
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId) return zone;
        return {
          ...zone,
          geo: {
            ...zone.geo,
            [field]: value,
          },
        };
      })
    );
  };

  const addZone = () => {
    const nextIndex = zones.length + 1;
    const code = `N${nextIndex}`;
    const newZone: Zone = {
      id: `z-${Date.now()}`,
      name: `Area ${code}`,
      code,
      status: "healthy",
      occupancy: 40,
      coverage: `${defaultGridArea.toFixed(1)} ${areaUnit}`,
      geo: {
        lat: originLat + 0.0006 - (nextIndex % 3) * 0.0005,
        lng: originLng - 0.001 + (nextIndex % 4) * 0.0008,
        latSpan: 0.0018,
        lngSpan: 0.0022,
      },
      resources: [],
    };

    setZones((prev) => [...prev, newZone]);
    setSelectedZone(newZone.id);
  };

  const projectionScale = 35000 * zoomScale;
  const lngFactor = Math.cos((originLat * Math.PI) / 180);

  const projectZone = (zone: Zone) => {
    const x = 50 + (((zone.geo.lng - originLng) * lngFactor * projectionScale) / 960) * 100;
    const y = 50 - (((zone.geo.lat - originLat) * projectionScale) / 720) * 100;
    const width = ((zone.geo.lngSpan * lngFactor * projectionScale) / 960) * 100;
    const height = ((zone.geo.latSpan * projectionScale) / 720) * 100;

    return {
      left: `${x - width / 2}%`,
      top: `${y - height / 2}%`,
      width: `${width}%`,
      height: `${height}%`,
    };
  };

  const allocateResource = (zoneId: string) => {
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId) return zone;

        const existing = zone.resources.find((resource) => resource.type === resourceMode);
        const nextStatus: ZoneStatus = resourceMode === "sensors" ? "warning" : "healthy";

        return {
          ...zone,
          status: zone.status === "critical" ? zone.status : nextStatus,
          resources: existing
            ? zone.resources.map((resource) =>
                resource.type === resourceMode
                  ? {
                      ...resource,
                      quantity: resource.quantity + 1,
                      lastSeen: "Vừa cập nhật",
                      status: resource.status === "critical" ? resource.status : nextStatus,
                    }
                  : resource
              )
            : [
                ...zone.resources,
                {
                  id: `${zone.id}-${resourceMode}-${Date.now()}`,
                  type: resourceMode,
                  name: `${resourceTypeLabels[resourceMode]} ${zone.code}`,
                  quantity: 1,
                  lastSeen: "Vừa cập nhật",
                  status: nextStatus,
                },
              ],
        };
      })
    );
    setSelectedZone(zoneId);
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
                <p>Bản đồ vệ tinh cố định, zoom đến đâu thì từng ô area scale đúng đến đó và có thể chỉnh sửa độc lập.</p>
              </div>
              <span>
                {profile?.address || "Long Thành, Đồng Nai"}
                {profile?.lat !== undefined && profile?.lng !== undefined
                  ? ` · ${profile.lat.toFixed(4)}, ${profile.lng.toFixed(4)}`
                  : ""}
              </span>
            </header>

            <article className={styles.noticeCard}>
              <h3>Chế độ area độc lập</h3>
              <p>
                Mỗi ô area giờ là một khối riêng có vị trí và kích thước độc lập. Khi zoom map, từng ô sẽ scale cùng tỉ lệ,
                giống thao tác thiết lập area trên bản đồ. Bạn cũng có thể tạo area mới hoặc chỉnh từng area riêng ngay trong panel.
              </p>
            </article>

            <section className={styles.summaryColumns}>
              {summaryColumns.map((item) => (
                <article key={item.title}>
                  <small>{item.title}</small>
                  <strong>{item.value}</strong>
                  <span>{item.detail}</span>
                </article>
              ))}
            </section>

            <section className={styles.kpiGrid}>
              <article><b>{totals.totalAssets}</b><small>Assets</small></article>
              <article><b>{totals.sensors}</b><small>Sensors</small></article>
              <article><b>{totals.livestock}</b><small>Livestock</small></article>
              <article><b>{zones.length}</b><small>Areas</small></article>
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

              <div className={styles.zoomBar}>
                <div>
                  <strong>Zoom map</strong>
                  <span>Map bị khóa pan, chỉ cho thao tác thu/phóng.</span>
                </div>
                <div className={styles.zoomActions}>
                  <button onClick={() => setZoom((prev) => Math.max(15, prev - 1))}>-</button>
                  <b>{zoom}</b>
                  <button onClick={() => setZoom((prev) => Math.min(20, prev + 1))}>+</button>
                  <button className={styles.createBtn} onClick={addZone}>+ Area</button>
                </div>
              </div>

              <div className={styles.configRow}>
                <label>
                  Khung thời gian
                  <select value={timeScale} onChange={(e) => setTimeScale(e.target.value)}>
                    <option>Hiện tại</option>
                    <option>Ca sáng</option>
                    <option>Ca chiều</option>
                    <option>Theo tuần</option>
                  </select>
                </label>
                <label>
                  Chế độ gán tài nguyên
                  <select value={resourceMode} onChange={(e) => setResourceMode(e.target.value as ResourceType)}>
                    <option value="water">Nước tưới</option>
                    <option value="livestock">Vật nuôi</option>
                    <option value="sensors">Cảm biến</option>
                    <option value="vehicle">Phương tiện</option>
                  </select>
                </label>
                <label>
                  Lọc trạng thái
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ZoneStatus | "all")}>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status === "all" ? "Tất cả" : statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Lọc loại tài nguyên
                  <select value={resourceFilter} onChange={(e) => setResourceFilter(e.target.value as ResourceType | "all")}>
                    {resourceTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type === "all" ? "Tất cả" : resourceTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.searchField}>
                  Tìm grid / tài nguyên
                  <input
                    type="text"
                    value={searchTerm}
                    placeholder="Ví dụ: A1, Sensor hub, Tank..."
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className={styles.mapWidget}>
              <div className={styles.mapFrame}>
                <div className={styles.mapViewport} style={{ "--map-scale": `${zoomScale}` } as CSSProperties}>
                  <iframe title="Farm satellite map" src={satelliteEmbedUrl} loading="lazy" tabIndex={-1} />
                </div>
                <div className={styles.overlayHint}>Area overlay scale theo zoom map và chỉnh riêng từng ô.</div>
                <div className={styles.gridOverlay} style={{ "--grid-size": `${72 * zoomScale}px` } as CSSProperties} aria-hidden="true" />
                <div className={styles.areaLayer}>
                  {filteredZones.map((zone) => {
                    const areaStyle = projectZone(zone);
                    const resourceTotal = zone.resources.reduce((sum, resource) => sum + resource.quantity, 0);

                    return (
                      <button
                        key={zone.id}
                        className={`${styles.areaBox} ${styles[zone.status]} ${zone.id === selectedZone ? styles.areaSelected : ""}`}
                        style={areaStyle}
                        onClick={() => setSelectedZone(zone.id)}
                      >
                        <em>{zone.code}</em>
                        <strong>{zone.name}</strong>
                        <span>{zone.coverage}</span>
                        <span>{resourceTotal} tài nguyên</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className={styles.resourcePanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <small>Chi tiết area</small>
                    <h3>{selected.name}</h3>
                  </div>
                  <button className={styles.allocateBtn} onClick={() => allocateResource(selected.id)}>
                    + Gán {resourceTypeLabels[resourceMode]}
                  </button>
                </div>

                <div className={styles.zoneMeta}>
                  <article>
                    <span>Trạng thái</span>
                    <strong>{statusLabels[selected.status]}</strong>
                  </article>
                  <article>
                    <span>Mức lấp đầy</span>
                    <strong>{selected.occupancy}%</strong>
                  </article>
                  <article>
                    <span>Diện tích</span>
                    <strong>{selected.coverage}</strong>
                  </article>
                  <article>
                    <span>Cảnh báo</span>
                    <strong>{totals.alerts}</strong>
                  </article>
                </div>

                <div className={styles.editorPanel}>
                  <div className={styles.resourceListHeader}>
                    <h4>Chỉnh area độc lập</h4>
                    <span>{selected.code}</span>
                  </div>
                  <div className={styles.editorGrid}>
                    <label>
                      Tâm latitude
                      <input type="range" min={originLat - 0.006} max={originLat + 0.006} step={0.0001} value={selected.geo.lat} onChange={(e) => updateZoneGeo(selected.id, "lat", Number(e.target.value))} />
                    </label>
                    <label>
                      Tâm longitude
                      <input type="range" min={originLng - 0.008} max={originLng + 0.008} step={0.0001} value={selected.geo.lng} onChange={(e) => updateZoneGeo(selected.id, "lng", Number(e.target.value))} />
                    </label>
                    <label>
                      Độ rộng kinh độ
                      <input type="range" min={0.0008} max={0.004} step={0.0001} value={selected.geo.lngSpan} onChange={(e) => updateZoneGeo(selected.id, "lngSpan", Number(e.target.value))} />
                    </label>
                    <label>
                      Độ cao vĩ độ
                      <input type="range" min={0.0008} max={0.004} step={0.0001} value={selected.geo.latSpan} onChange={(e) => updateZoneGeo(selected.id, "latSpan", Number(e.target.value))} />
                    </label>
                  </div>
                </div>

                <div className={styles.resourceListHeader}>
                  <h4>Tài nguyên đã gán trong area</h4>
                  <span>{selected.resources.length} nhóm tài nguyên</span>
                </div>
                <div className={styles.resourceList}>
                  {selected.resources.map((resource) => (
                    <article key={resource.id} className={styles.resourceCard}>
                      <div>
                        <small>{resourceTypeLabels[resource.type]}</small>
                        <strong>{resource.name}</strong>
                      </div>
                      <span className={`${styles.statusPill} ${styles[resource.status]}`}>{statusLabels[resource.status]}</span>
                      <ul>
                        <li>Số lượng: {resource.quantity}</li>
                        <li>Vị trí: Area {selected.code}</li>
                        <li>Cập nhật: {resource.lastSeen}</li>
                      </ul>
                    </article>
                  ))}
                </div>
              </aside>
            </section>

            <section className={styles.allocationPanel}>
              <div className={styles.panelTitle}>
                <h3>Danh sách area tóm tắt</h3>
                <p>Mỗi area có kích thước và vị trí riêng, đã đồng bộ với zoom của map.</p>
              </div>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Area</th>
                      <th>Trạng thái</th>
                      <th>Diện tích</th>
                      <th>Vị trí</th>
                      <th>Kích thước</th>
                      <th>Nước tưới</th>
                      <th>Vật nuôi</th>
                      <th>Cảm biến</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredZones.map((zone) => {
                      const grouped = zone.resources.reduce(
                        (acc, resource) => {
                          acc[resource.type] += resource.quantity;
                          return acc;
                        },
                        { water: 0, livestock: 0, sensors: 0, vehicle: 0 }
                      );

                      return (
                        <tr key={zone.id} onClick={() => setSelectedZone(zone.id)}>
                          <td>
                            <strong>{zone.code}</strong>
                            <span>{zone.name}</span>
                          </td>
                          <td>{statusLabels[zone.status]}</td>
                          <td>{zone.coverage}</td>
                          <td>{zone.geo.lat.toFixed(4)}, {zone.geo.lng.toFixed(4)}</td>
                          <td>{zone.geo.latSpan.toFixed(4)} × {zone.geo.lngSpan.toFixed(4)}</td>
                          <td>{grouped.water}</td>
                          <td>{grouped.livestock}</td>
                          <td>{grouped.sensors}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        ) : (
          <section>
            <header className={styles.topbar}>
              <div>
                <h1>{farmName}</h1>
                <p>Digital operations overview for your farm. Chọn “Farm Map” ở menu trái để xem area map.</p>
              </div>
              <span>{profile?.fullName || "Farm owner"}</span>
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
              <div className={styles.mapPreview}>
                <div className={styles.mapViewport} style={{ "--map-scale": `${zoomScale}` } as CSSProperties}>
                  <iframe title="Farm overview satellite map" src={satelliteEmbedUrl} loading="lazy" tabIndex={-1} />
                </div>
              </div>
              <div className={styles.widgetGrid}>
                {widgets.map((widget) => (
                  <article key={widget.title} className={styles.widgetCard}>
                    <h3>{widget.title}</h3>
                    <ul>
                      {widget.rows.map((row) => (
                        <li key={row}>{row}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}
