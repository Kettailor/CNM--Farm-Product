"use client";

import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
type FarmType = "cattle" | "sheep" | "pig" | "poultry" | "crop";

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

type ZoneMetadata = {
  areaHecta: number;
  usage: string;
  soilType: string;
  waterSource: string;
  manager: string;
  plantingStatus: string;
  priority: "low" | "medium" | "high";
  notes: string;
  farmType: FarmType;
  shapeRatio: number;
};

type Zone = {
  id: string;
  name: string;
  code: string;
  status: ZoneStatus;
  occupancy: number;
  coverage: string;
  geo: ZoneGeo;
  metadata: ZoneMetadata;
  resources: ResourceItem[];
};

type ViewportSize = { width: number; height: number };
type DragState = {
  startX: number;
  startY: number;
  startCenterX: number;
  startCenterY: number;
  moved: boolean;
};

const TILE_SIZE = 256;
const DEFAULT_VIEWPORT: ViewportSize = { width: 960, height: 720 };
const MIN_ZOOM = 14;
const MAX_ZOOM = 19;
const METERS_PER_DEGREE_LAT = 111_320;

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
    name: "Khu Cừu A1",
    code: "A1",
    status: "healthy",
    occupancy: 72,
    coverage: "4.3 ha",
    geo: { lat: 10.8228, lng: 106.6267, latSpan: 0.0019, lngSpan: 0.0024 },
    metadata: {
      areaHecta: 4.3,
      usage: "Khu nuôi cừu sinh sản",
      soilType: "Đất phù sa",
      waterSource: "Bể chứa số 01",
      manager: "Nguyễn Văn A",
      plantingStatus: "Ổn định",
      priority: "medium",
      notes: "Theo dõi khẩu phần sáng và độ ẩm nền chuồng.",
      farmType: "sheep",
      shapeRatio: 1.35,
    },
    resources: [
      { id: "z1-r1", type: "water", name: "Tank 01", status: "healthy", lastSeen: "2 phút trước", quantity: 3 },
      { id: "z1-r2", type: "livestock", name: "Đàn cừu A1", status: "healthy", lastSeen: "5 phút trước", quantity: 22 },
      { id: "z1-r3", type: "sensors", name: "Sensor hub A1", status: "healthy", lastSeen: "Trực tuyến", quantity: 4 },
    ],
  },
  {
    id: "z2",
    name: "Khu Bò A2",
    code: "A2",
    status: "warning",
    occupancy: 58,
    coverage: "3.8 ha",
    geo: { lat: 10.8231, lng: 106.6288, latSpan: 0.0021, lngSpan: 0.0022 },
    metadata: {
      areaHecta: 3.8,
      usage: "Khu bò thịt tăng trọng",
      soilType: "Đất thịt nhẹ",
      waterSource: "Ống tưới line 02",
      manager: "Trần Thu Hà",
      plantingStatus: "Theo dõi tăng trưởng",
      priority: "high",
      notes: "Cần kiểm tra nước uống và bóng mát khu vực phía đông.",
      farmType: "cattle",
      shapeRatio: 1.6,
    },
    resources: [
      { id: "z2-r1", type: "water", name: "Water line 02", status: "warning", lastSeen: "12 phút trước", quantity: 2 },
      { id: "z2-r2", type: "livestock", name: "Đàn bò A2", status: "healthy", lastSeen: "7 phút trước", quantity: 15 },
      { id: "z2-r3", type: "sensors", name: "Moisture rack A2", status: "warning", lastSeen: "8 phút trước", quantity: 2 },
    ],
  },
  {
    id: "z3",
    name: "Khu Heo B1",
    code: "B1",
    status: "healthy",
    occupancy: 66,
    coverage: "5.1 ha",
    geo: { lat: 10.8225, lng: 106.631, latSpan: 0.0022, lngSpan: 0.0025 },
    metadata: {
      areaHecta: 5.1,
      usage: "Khu heo giống và hậu bị",
      soilType: "Đất đỏ bazan",
      waterSource: "Ao B1",
      manager: "Lê Minh Quân",
      plantingStatus: "Đang vận hành",
      priority: "medium",
      notes: "Tăng tần suất kiểm tra nhiệt độ chuồng buổi chiều.",
      farmType: "pig",
      shapeRatio: 1.2,
    },
    resources: [
      { id: "z3-r1", type: "water", name: "Reservoir B1", status: "healthy", lastSeen: "4 phút trước", quantity: 4 },
      { id: "z3-r2", type: "livestock", name: "Đàn heo B1", status: "healthy", lastSeen: "10 phút trước", quantity: 18 },
      { id: "z3-r3", type: "sensors", name: "Weather node B1", status: "healthy", lastSeen: "Trực tuyến", quantity: 3 },
    ],
  },
  {
    id: "z4",
    name: "Khu Gia Cầm B2",
    code: "B2",
    status: "critical",
    occupancy: 84,
    coverage: "2.9 ha",
    geo: { lat: 10.8201, lng: 106.6279, latSpan: 0.0017, lngSpan: 0.0022 },
    metadata: {
      areaHecta: 2.9,
      usage: "Khu gia cầm cách ly",
      soilType: "Đất pha cát",
      waterSource: "Pump line B2",
      manager: "Phạm Tuấn Dũng",
      plantingStatus: "Tạm ngưng",
      priority: "high",
      notes: "Đang xử lý cảnh báo nhiệt độ cao và thông gió.",
      farmType: "poultry",
      shapeRatio: 1.5,
    },
    resources: [
      { id: "z4-r1", type: "water", name: "Pump line B2", status: "critical", lastSeen: "28 phút trước", quantity: 1 },
      { id: "z4-r2", type: "livestock", name: "Khu cách ly B2", status: "warning", lastSeen: "14 phút trước", quantity: 7 },
      { id: "z4-r3", type: "sensors", name: "Thermal camera B2", status: "critical", lastSeen: "Mất kết nối", quantity: 1 },
    ],
  },
  {
    id: "z5",
    name: "Khu Cây Trồng C1",
    code: "C1",
    status: "warning",
    occupancy: 49,
    coverage: "3.2 ha",
    geo: { lat: 10.8197, lng: 106.6299, latSpan: 0.0018, lngSpan: 0.0023 },
    metadata: {
      areaHecta: 3.2,
      usage: "Khu trồng dược liệu",
      soilType: "Đất thịt pha hữu cơ",
      waterSource: "Drip line C1",
      manager: "Hoàng Ngọc Lan",
      plantingStatus: "Mới gieo",
      priority: "medium",
      notes: "Giữ ẩm ổn định 7 ngày đầu.",
      farmType: "crop",
      shapeRatio: 2.1,
    },
    resources: [
      { id: "z5-r1", type: "water", name: "Drip line C1", status: "healthy", lastSeen: "6 phút trước", quantity: 2 },
      { id: "z5-r2", type: "livestock", name: "Tổ chăm sóc C1", status: "warning", lastSeen: "13 phút trước", quantity: 10 },
      { id: "z5-r3", type: "sensors", name: "pH sensor C1", status: "warning", lastSeen: "11 phút trước", quantity: 2 },
    ],
  },
  {
    id: "z6",
    name: "Khu Bò C2",
    code: "C2",
    status: "healthy",
    occupancy: 63,
    coverage: "4.8 ha",
    geo: { lat: 10.82, lng: 106.6322, latSpan: 0.002, lngSpan: 0.0026 },
    metadata: {
      areaHecta: 4.8,
      usage: "Bãi chăn bò mở rộng",
      soilType: "Đất xám",
      waterSource: "Lake C2",
      manager: "Ngô Bảo Anh",
      plantingStatus: "Chuẩn bị mở rộng",
      priority: "low",
      notes: "Sẵn sàng cho đợt mở rộng A7/N7.",
      farmType: "cattle",
      shapeRatio: 1.75,
    },
    resources: [
      { id: "z6-r1", type: "water", name: "Lake C2", status: "healthy", lastSeen: "3 phút trước", quantity: 3 },
      { id: "z6-r2", type: "livestock", name: "Đàn bò C2", status: "healthy", lastSeen: "4 phút trước", quantity: 14 },
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

const priorityLabels: Record<ZoneMetadata["priority"], string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

const farmTypeLabels: Record<FarmType, string> = {
  cattle: "Bò",
  sheep: "Cừu",
  pig: "Heo",
  poultry: "Gia cầm",
  crop: "Cây trồng",
};

const farmTypeIcons: Record<FarmType, string> = {
  cattle: "🐄",
  sheep: "🐑",
  pig: "🐖",
  poultry: "🐓",
  crop: "🌿",
};

const statusOptions: Array<ZoneStatus | "all"> = ["all", "healthy", "warning", "critical"];
const resourceTypeOptions: Array<ResourceType | "all"> = ["all", "water", "livestock", "sensors", "vehicle"];

const latLngToWorldPixel = (lat: number, lng: number, zoom: number) => {
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
};

const worldPixelToLatLng = (x: number, y: number, zoom: number) => {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
};

const clampLat = (lat: number) => Math.max(-85, Math.min(85, lat));
const tileCount = (zoom: number) => 2 ** zoom;
const metersPerDegreeLng = (lat: number) => Math.max(1, METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));

const geoToAreaHecta = (geo: ZoneGeo) => {
  const heightMeters = Math.max(1, geo.latSpan * METERS_PER_DEGREE_LAT);
  const widthMeters = Math.max(1, geo.lngSpan * metersPerDegreeLng(geo.lat));
  return (heightMeters * widthMeters) / 10_000;
};

const syncGeoSizeToArea = (lat: number, areaHecta: number, shapeRatio: number) => {
  const safeArea = Math.max(0.05, areaHecta) * 10_000;
  const safeRatio = Math.max(0.35, shapeRatio);
  const heightMeters = Math.sqrt(safeArea / safeRatio);
  const widthMeters = safeArea / heightMeters;

  return {
    latSpan: heightMeters / METERS_PER_DEGREE_LAT,
    lngSpan: widthMeters / metersPerDegreeLng(lat),
  };
};

export default function SmartFarmDashboard({ profile }: SmartFarmDashboardProps) {
  const farmName = profile?.farmName || "Ket Farm";
  const areaUnit = profile?.areaUnit || "Hecta";
  const defaultGridArea = profile?.defaultGridArea || 1;
  const originLat = profile?.lat ?? 10.8216;
  const originLng = profile?.lng ?? 106.6295;
  const [activeMenu, setActiveMenu] = useState("Farm Map");
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ paddocks: true, water: true, vehicles: true, fences: true, sensors: true });
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [selectedZone, setSelectedZone] = useState(initialZones[0].id);
  const [resourceMode, setResourceMode] = useState<ResourceType>("water");
  const [timeScale, setTimeScale] = useState("Hiện tại");
  const [statusFilter, setStatusFilter] = useState<ZoneStatus | "all">("all");
  const [resourceFilter, setResourceFilter] = useState<ResourceType | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [zoom, setZoom] = useState(16);
  const [viewport, setViewport] = useState<ViewportSize>(DEFAULT_VIEWPORT);
  const [mapCenter, setMapCenter] = useState(() => ({ lat: originLat, lng: originLng }));
  const [detailOpen, setDetailOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;

    const updateSize = () => {
      setViewport({ width: element.clientWidth || DEFAULT_VIEWPORT.width, height: element.clientHeight || DEFAULT_VIEWPORT.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
        zone.metadata.usage.toLowerCase().includes(keyword) ||
        zone.metadata.manager.toLowerCase().includes(keyword) ||
        farmTypeLabels[zone.metadata.farmType].toLowerCase().includes(keyword) ||
        zone.resources.some((resource) => resource.name.toLowerCase().includes(keyword));
      const matchesResource = resourceFilter === "all" || zone.resources.some((resource) => resource.type === resourceFilter);

      return matchesStatus && matchesSearch && matchesResource;
    });
  }, [resourceFilter, searchTerm, statusFilter, zones]);

  const selected = useMemo(() => zones.find((zone) => zone.id === selectedZone) ?? zones[0], [selectedZone, zones]);
  const selectedDimensions = useMemo(() => ({
    widthMeters: selected.geo.lngSpan * metersPerDegreeLng(selected.geo.lat),
    heightMeters: selected.geo.latSpan * METERS_PER_DEGREE_LAT,
  }), [selected]);

  useEffect(() => {
    if (!filteredZones.some((zone) => zone.id === selectedZone) && filteredZones[0]) {
      setSelectedZone(filteredZones[0].id);
      setDetailOpen(false);
    }
  }, [filteredZones, selectedZone]);

  const summaryColumns = useMemo(
    () => [
      {
        title: "Map vệ tinh thật",
        value: `Zoom ${zoom}`,
        detail: "Area được vẽ theo bounds địa lý nên giữ vị trí đúng khi zoom và pan.",
      },
      {
        title: "Area mặc định",
        value: `${defaultGridArea.toFixed(1)} ${areaUnit}`,
        detail: "Diện tích ha nhập vào sẽ tự ánh xạ sang kích thước overlay thực tế trên map.",
      },
      {
        title: "Area cần xử lý",
        value: `${zones.filter((zone) => zone.status !== "healthy").length}`,
        detail: "Bao gồm warning + critical.",
      },
      {
        title: "Điều khiển map",
        value: "Ctrl + wheel / kéo",
        detail: "Giữ Ctrl + lăn chuột để zoom map, kéo chuột để pan khu vực xem.",
      },
    ],
    [areaUnit, defaultGridArea, zoom, zones]
  );

  const updateZoneGeo = (zoneId: string, field: keyof ZoneGeo, value: number) => {
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId) return zone;
        const nextGeo = { ...zone.geo, [field]: value };
        const nextArea = geoToAreaHecta(nextGeo);
        const nextRatio = Math.max(0.35, (nextGeo.lngSpan * metersPerDegreeLng(nextGeo.lat)) / Math.max(1, nextGeo.latSpan * METERS_PER_DEGREE_LAT));

        return {
          ...zone,
          geo: nextGeo,
          coverage: `${nextArea.toFixed(1)} ha`,
          metadata: {
            ...zone.metadata,
            areaHecta: Number(nextArea.toFixed(2)),
            shapeRatio: Number(nextRatio.toFixed(2)),
          },
        };
      })
    );
  };

  const updateZoneMetadata = (zoneId: string, field: keyof ZoneMetadata, value: string | number) => {
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId) return zone;
        const nextMetadata = { ...zone.metadata, [field]: value } as ZoneMetadata;

        if (field === "areaHecta" || field === "shapeRatio") {
          const nextGeoSize = syncGeoSizeToArea(zone.geo.lat, Number(nextMetadata.areaHecta), Number(nextMetadata.shapeRatio));
          return {
            ...zone,
            metadata: nextMetadata,
            geo: { ...zone.geo, ...nextGeoSize },
            coverage: `${Number(nextMetadata.areaHecta).toFixed(1)} ha`,
          };
        }

        return { ...zone, metadata: nextMetadata, coverage: `${Number(nextMetadata.areaHecta).toFixed(1)} ha` };
      })
    );
  };

  const addZone = () => {
    const nextIndex = zones.length + 1;
    const code = `N${nextIndex}`;
    const newZone: Zone = {
      id: `z-${Date.now()}`,
      name: `Khu ${farmTypeLabels["cattle"]} ${code}`,
      code,
      status: "healthy",
      occupancy: 40,
      coverage: `${defaultGridArea.toFixed(1)} ha`,
      geo: {
        lat: mapCenter.lat + 0.0008 - (nextIndex % 3) * 0.0006,
        lng: mapCenter.lng - 0.0012 + (nextIndex % 4) * 0.0009,
        latSpan: 0.0018,
        lngSpan: 0.0022,
      },
      metadata: {
        areaHecta: defaultGridArea,
        usage: "Area mới",
        soilType: "Chưa khai báo",
        waterSource: "Chưa khai báo",
        manager: "Chưa gán phụ trách",
        plantingStatus: "Chưa lên kế hoạch",
        priority: "medium",
        notes: "Cần cập nhật đầy đủ thông số trước khi vận hành.",
        farmType: "cattle",
        shapeRatio: 1.5,
      },
      resources: [],
    };

    setZones((prev) => [...prev, newZone]);
    setSelectedZone(newZone.id);
    setDetailOpen(true);
  };

  const centerPixel = useMemo(() => latLngToWorldPixel(mapCenter.lat, mapCenter.lng, zoom), [mapCenter.lat, mapCenter.lng, zoom]);

  const tileLayer = useMemo(() => {
    const halfWidth = viewport.width / 2;
    const halfHeight = viewport.height / 2;
    const startX = Math.floor((centerPixel.x - halfWidth) / TILE_SIZE);
    const endX = Math.floor((centerPixel.x + halfWidth) / TILE_SIZE);
    const startY = Math.floor((centerPixel.y - halfHeight) / TILE_SIZE);
    const endY = Math.floor((centerPixel.y + halfHeight) / TILE_SIZE);
    const maxTileIndex = tileCount(zoom) - 1;
    const tiles: Array<{ key: string; src: string; left: number; top: number }> = [];

    for (let x = startX - 1; x <= endX + 1; x += 1) {
      for (let y = startY - 1; y <= endY + 1; y += 1) {
        if (y < 0 || y > maxTileIndex) continue;
        const wrappedX = ((x % (maxTileIndex + 1)) + (maxTileIndex + 1)) % (maxTileIndex + 1);
        const left = x * TILE_SIZE - (centerPixel.x - halfWidth);
        const top = y * TILE_SIZE - (centerPixel.y - halfHeight);
        tiles.push({
          key: `${zoom}-${wrappedX}-${y}`,
          src: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${wrappedX}`,
          left,
          top,
        });
      }
    }

    return tiles;
  }, [centerPixel.x, centerPixel.y, viewport.height, viewport.width, zoom]);

  const projectZone = (zone: Zone): CSSProperties => {
    const northWest = latLngToWorldPixel(clampLat(zone.geo.lat + zone.geo.latSpan / 2), zone.geo.lng - zone.geo.lngSpan / 2, zoom);
    const southEast = latLngToWorldPixel(clampLat(zone.geo.lat - zone.geo.latSpan / 2), zone.geo.lng + zone.geo.lngSpan / 2, zoom);
    const originX = centerPixel.x - viewport.width / 2;
    const originY = centerPixel.y - viewport.height / 2;

    return {
      left: `${northWest.x - originX}px`,
      top: `${northWest.y - originY}px`,
      width: `${Math.max(28, southEast.x - northWest.x)}px`,
      height: `${Math.max(28, southEast.y - northWest.y)}px`,
    };
  };

  const changeZoom = useCallback((nextZoom: number, anchor?: { clientX: number; clientY: number }) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    if (clamped === zoom) return;

    if (!mapRef.current || !anchor) {
      setZoom(clamped);
      return;
    }

    const rect = mapRef.current.getBoundingClientRect();
    const offsetX = anchor.clientX - rect.left;
    const offsetY = anchor.clientY - rect.top;
    const worldX = centerPixel.x - viewport.width / 2 + offsetX;
    const worldY = centerPixel.y - viewport.height / 2 + offsetY;
    const geographicAnchor = worldPixelToLatLng(worldX, worldY, zoom);
    const nextAnchorPixel = latLngToWorldPixel(geographicAnchor.lat, geographicAnchor.lng, clamped);
    const nextCenterX = nextAnchorPixel.x - offsetX + viewport.width / 2;
    const nextCenterY = nextAnchorPixel.y - offsetY + viewport.height / 2;
    const nextCenter = worldPixelToLatLng(nextCenterX, nextCenterY, clamped);

    setZoom(clamped);
    setMapCenter({ lat: clampLat(nextCenter.lat), lng: nextCenter.lng });
  }, [centerPixel.x, centerPixel.y, viewport.height, viewport.width, zoom]);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;

    const handleNativeWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();

      const delta = event.deltaY < 0 ? 1 : -1;
      changeZoom(zoom + delta, { clientX: event.clientX, clientY: event.clientY });
    };

    element.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleNativeWheel);
  }, [changeZoom, zoom]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const pointerTarget = event.target as HTMLElement;
    if (pointerTarget.closest("button")) return;

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startCenterX: centerPixel.x,
      startCenterY: centerPixel.y,
      moved: false,
    };
    setIsDragging(true);
    mapRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    const nextCenter = worldPixelToLatLng(drag.startCenterX - dx, drag.startCenterY - dy, zoom);
    setMapCenter({ lat: clampLat(nextCenter.lat), lng: nextCenter.lng });
  };

  const endDrag = (pointerId?: number) => {
    dragRef.current = null;
    setIsDragging(false);
    if (pointerId !== undefined && mapRef.current?.hasPointerCapture(pointerId)) {
      mapRef.current.releasePointerCapture(pointerId);
    }
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
                  ? { ...resource, quantity: resource.quantity + 1, lastSeen: "Vừa cập nhật", status: resource.status === "critical" ? resource.status : nextStatus }
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
    setDetailOpen(true);
  };

  const handleSelectZone = (zoneId: string) => {
    if (dragRef.current?.moved) return;
    setSelectedZone(zoneId);
    setDetailOpen(true);
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h2>farmdeck</h2>
        <ul>
          {sidebarMenus.map((item) => (
            <li key={item} className={activeMenu === item ? styles.activeMenu : ""} onClick={() => setActiveMenu(item)}>
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
                <p>Map vệ tinh có pan/zoom nội bộ. Area chỉ hiển thị icon nhận biết; click để mở thông tin chi tiết của ô farm.</p>
              </div>
              <span>
                {profile?.address || "Long Thành, Đồng Nai"}
                {` · ${mapCenter.lat.toFixed(4)}, ${mapCenter.lng.toFixed(4)}`}
              </span>
            </header>

            <article className={styles.noticeCard}>
              <h3>Map tương tác đúng theo vị trí thật</h3>
              <p>
                Area được lưu bằng toạ độ tâm + bounds địa lý + loại farm. Khi zoom bằng <strong>Ctrl + lăn chuột</strong> hoặc kéo map, overlay sẽ được chiếu lại cùng hệ Web Mercator nên không bị lệch vùng đã set.
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
                  <button key={layer.key} className={layers[layer.key] ? styles.toggleActive : styles.toggleBtn} onClick={() => setLayers((prev) => ({ ...prev, [layer.key]: !prev[layer.key] }))}>
                    {layer.label}
                  </button>
                ))}
              </div>

              <div className={styles.zoomBar}>
                <div>
                  <strong>Điều khiển map</strong>
                  <span>Giữ Ctrl + lăn chuột để zoom map, kéo chuột trái để di chuyển, click vào icon area để xem chi tiết.</span>
                </div>
                <div className={styles.zoomActions}>
                  <button onClick={() => changeZoom(zoom - 1)}>-</button>
                  <b>{zoom}</b>
                  <button onClick={() => changeZoom(zoom + 1)}>+</button>
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
                  Tìm area / loại ô / công năng / tài nguyên
                  <input type="text" value={searchTerm} placeholder="Ví dụ: cừu, bò, A7, tank..." onChange={(e) => setSearchTerm(e.target.value)} />
                </label>
              </div>
            </section>

            <section className={styles.mapWidget}>
              <div
                className={`${styles.mapFrame} ${isDragging ? styles.isDragging : ""}`}
                ref={mapRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => endDrag(event.pointerId)}
                onPointerLeave={() => {
                  if (dragRef.current) endDrag();
                }}
                onPointerCancel={(event) => endDrag(event.pointerId)}
              >
                <div className={styles.tileMap}>
                  {tileLayer.map((tile) => (
                    <img key={tile.key} src={tile.src} alt="Satellite tile" style={{ left: tile.left, top: tile.top }} />
                  ))}
                </div>
                <div className={styles.overlayHint}>Ctrl + wheel để zoom · kéo để pan · click icon để mở chi tiết area.</div>
                <div className={styles.gridOverlay} aria-hidden="true" />
                <div className={styles.areaLayer}>
                  {filteredZones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      title={`${zone.name} · ${farmTypeLabels[zone.metadata.farmType]}`}
                      aria-label={`Mở chi tiết ${zone.name}`}
                      className={`${styles.areaBox} ${styles[zone.metadata.farmType]} ${zone.id === selectedZone && detailOpen ? styles.areaSelected : ""}`}
                      style={projectZone(zone)}
                      onClick={() => handleSelectZone(zone.id)}
                    >
                      <span className={styles.areaIcon}>{farmTypeIcons[zone.metadata.farmType]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <aside className={styles.resourcePanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <small>Thông tin area</small>
                    <h3>{detailOpen ? selected.name : "Chưa chọn area"}</h3>
                  </div>
                  {detailOpen ? (
                    <button className={styles.allocateBtn} onClick={() => allocateResource(selected.id)}>
                      + Gán {resourceTypeLabels[resourceMode]}
                    </button>
                  ) : null}
                </div>

                {!detailOpen ? (
                  <div className={styles.emptyState}>
                    <strong>Map đang ở chế độ xem tổng quan</strong>
                    <p>Chỉ còn icon trên mỗi ô farm để dễ nhìn. Hãy click vào một area trên map để mở phần thông tin chi tiết.</p>
                    <ul>
                      <li>Màu ô thể hiện loại area: bò, cừu, heo, gia cầm hoặc cây trồng.</li>
                      <li>Ctrl + lăn chuột chỉ zoom trong map, không phóng to toàn bộ giao diện web.</li>
                      <li>Kéo chuột để di chuyển đến khu vực khác trên bản đồ.</li>
                    </ul>
                  </div>
                ) : (
                  <>
                    <div className={styles.zoneMeta}>
                      <article><span>Loại area</span><strong>{farmTypeLabels[selected.metadata.farmType]}</strong></article>
                      <article><span>Trạng thái</span><strong>{statusLabels[selected.status]}</strong></article>
                      <article><span>Diện tích</span><strong>{selected.metadata.areaHecta.toFixed(1)} ha</strong></article>
                      <article><span>Kích thước thực</span><strong>{selectedDimensions.widthMeters.toFixed(0)}m × {selectedDimensions.heightMeters.toFixed(0)}m</strong></article>
                      <article><span>Phụ trách</span><strong>{selected.metadata.manager}</strong></article>
                      <article><span>Ưu tiên</span><strong>{priorityLabels[selected.metadata.priority]}</strong></article>
                    </div>

                    <div className={styles.editorPanel}>
                      <div className={styles.resourceListHeader}>
                        <h4>Thông số area</h4>
                        <span>{selected.code}</span>
                      </div>
                      <div className={styles.editorGrid}>
                        <label>
                          Tên area
                          <input type="text" value={selected.name} onChange={(e) => setZones((prev) => prev.map((zone) => (zone.id === selected.id ? { ...zone, name: e.target.value } : zone)))} />
                        </label>
                        <label>
                          Loại area
                          <select value={selected.metadata.farmType} onChange={(e) => updateZoneMetadata(selected.id, "farmType", e.target.value)}>
                            {Object.entries(farmTypeLabels).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Mức ưu tiên
                          <select value={selected.metadata.priority} onChange={(e) => updateZoneMetadata(selected.id, "priority", e.target.value)}>
                            <option value="low">Thấp</option>
                            <option value="medium">Trung bình</option>
                            <option value="high">Cao</option>
                          </select>
                        </label>
                        <label>
                          Tâm latitude
                          <input type="range" min={originLat - 0.02} max={originLat + 0.02} step={0.0001} value={selected.geo.lat} onChange={(e) => updateZoneGeo(selected.id, "lat", Number(e.target.value))} />
                        </label>
                        <label>
                          Tâm longitude
                          <input type="range" min={originLng - 0.02} max={originLng + 0.02} step={0.0001} value={selected.geo.lng} onChange={(e) => updateZoneGeo(selected.id, "lng", Number(e.target.value))} />
                        </label>
                        <label>
                          Span vĩ độ
                          <input type="range" min={0.0008} max={0.005} step={0.0001} value={selected.geo.latSpan} onChange={(e) => updateZoneGeo(selected.id, "latSpan", Number(e.target.value))} />
                        </label>
                        <label>
                          Span kinh độ
                          <input type="range" min={0.0008} max={0.005} step={0.0001} value={selected.geo.lngSpan} onChange={(e) => updateZoneGeo(selected.id, "lngSpan", Number(e.target.value))} />
                        </label>
                        <label>
                          Diện tích (ha)
                          <input type="number" min={0.05} step={0.1} value={selected.metadata.areaHecta} onChange={(e) => updateZoneMetadata(selected.id, "areaHecta", Number(e.target.value) || 0.05)} />
                        </label>
                        <label>
                          Tỷ lệ ngang/dọc
                          <input type="number" min={0.35} step={0.05} value={selected.metadata.shapeRatio} onChange={(e) => updateZoneMetadata(selected.id, "shapeRatio", Number(e.target.value) || 1)} />
                        </label>
                        <label>
                          Công năng
                          <input type="text" value={selected.metadata.usage} onChange={(e) => updateZoneMetadata(selected.id, "usage", e.target.value)} />
                        </label>
                        <label>
                          Loại đất
                          <input type="text" value={selected.metadata.soilType} onChange={(e) => updateZoneMetadata(selected.id, "soilType", e.target.value)} />
                        </label>
                        <label>
                          Nguồn nước
                          <input type="text" value={selected.metadata.waterSource} onChange={(e) => updateZoneMetadata(selected.id, "waterSource", e.target.value)} />
                        </label>
                        <label>
                          Phụ trách
                          <input type="text" value={selected.metadata.manager} onChange={(e) => updateZoneMetadata(selected.id, "manager", e.target.value)} />
                        </label>
                        <label>
                          Tình trạng vận hành
                          <input type="text" value={selected.metadata.plantingStatus} onChange={(e) => updateZoneMetadata(selected.id, "plantingStatus", e.target.value)} />
                        </label>
                        <label className={styles.searchField}>
                          Ghi chú vận hành
                          <input type="text" value={selected.metadata.notes} onChange={(e) => updateZoneMetadata(selected.id, "notes", e.target.value)} />
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
                  </>
                )}
              </aside>
            </section>

            <section className={styles.allocationPanel}>
              <div className={styles.panelTitle}>
                <h3>Danh sách area tóm tắt</h3>
                <p>Mỗi area hiện có thêm kiểu dữ liệu loại farm để tô màu và hiển thị icon nhận biết trên map.</p>
              </div>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Area</th>
                      <th>Loại</th>
                      <th>Toạ độ tâm</th>
                      <th>Bounds span</th>
                      <th>Diện tích</th>
                      <th>Kích thước thực</th>
                      <th>Công năng</th>
                      <th>Phụ trách</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredZones.map((zone) => (
                      <tr key={zone.id} onClick={() => handleSelectZone(zone.id)}>
                        <td><strong>{zone.code}</strong><span>{zone.name}</span></td>
                        <td>{farmTypeLabels[zone.metadata.farmType]}</td>
                        <td>{zone.geo.lat.toFixed(5)}, {zone.geo.lng.toFixed(5)}</td>
                        <td>{zone.geo.latSpan.toFixed(4)} × {zone.geo.lngSpan.toFixed(4)}</td>
                        <td>{zone.metadata.areaHecta.toFixed(1)} ha</td>
                        <td>{(zone.geo.lngSpan * metersPerDegreeLng(zone.geo.lat)).toFixed(0)}m × {(zone.geo.latSpan * METERS_PER_DEGREE_LAT).toFixed(0)}m</td>
                        <td>{zone.metadata.usage}</td>
                        <td>{zone.metadata.manager}</td>
                      </tr>
                    ))}
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
                <article key={pill.label}><b>{pill.value}</b><small>{pill.label}</small></article>
              ))}
            </section>

            <section className={styles.mapWidget}>
              <div className={styles.mapPreview} ref={mapRef}>
                <div className={styles.tileMap}>
                  {tileLayer.map((tile) => (
                    <img key={tile.key} src={tile.src} alt="Satellite tile" style={{ left: tile.left, top: tile.top }} />
                  ))}
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
