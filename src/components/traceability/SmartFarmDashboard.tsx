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
  rotationDeg: number;
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

type ResizeCorner = "nw" | "ne" | "sw" | "se";

type ResizeState = {
  zoneId: string;
  corner: ResizeCorner;
  startX: number;
  startY: number;
  startWidthPx: number;
  startHeightPx: number;
  startWidthMeters: number;
  startHeightMeters: number;
  rotationDeg: number;
};

type RotateState = {
  zoneId: string;
  centerX: number;
  centerY: number;
};

type PersistedMapState = {
  zones: Zone[];
  selectedZone: string | null;
  zoom: number;
  mapCenter: { lat: number; lng: number };
  detailOpen: boolean;
};

type MapApiState = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  fromDb: boolean;
};

const TILE_SIZE = 256;
const DEFAULT_VIEWPORT: ViewportSize = { width: 960, height: 720 };
const MIN_ZOOM = 14;
const MAX_ZOOM = 19;
const METERS_PER_DEGREE_LAT = 111_320;

const sidebarMenus = [
  "Tổng quan",
  "Bản đồ trực quan",
  "Vật nuôi",
  "Đếm đàn",
  "Theo dõi vật nuôi",
  "Quản lý khu",
  "Nguồn nước",
  "Theo dõi phương tiện",
  "Hàng rào",
  "Tiêu thụ năng lượng",
  "Cảnh báo & thông báo",
  "Truy xuất nguồn gốc",
  "Theo dõi chất lượng không khí",
  "Thời tiết",
  "Cài đặt",
];

const OVERVIEW_ICON_FALLBACK = "/assets/img/08dbb3ce-181c-49e9-8306-22abec26b4fa.svg";

const overviewIconMap: Record<string, string> = {
  farm: "/assets/img/08dbb3ce-181c-4a06-8eec-9d43bca8ed8e.svg",
  user: "/assets/img/08dbb3ce-181c-4a17-87ae-cd831646cfae.svg",
  area: "/assets/img/08dbb3ce-181c-4a25-8e37-317bfbaef7ce.svg",
  sensor: "/assets/img/08dbb3ce-181c-4a33-8410-90cf62243bf5.svg",
  alert: "/assets/img/08dbb3ce-181c-4a42-8800-2ee233c68de2.svg",
  water: "/assets/img/08dbb3ce-181c-4a50-8c4e-ecebe4b01c5b.svg",
  livestock: "/assets/img/08dbb3ce-181c-4a5f-804b-29cfcea22dd7.svg",
  weather: "/assets/img/08dbb3ce-181c-4a6d-8dd8-73bc4f978eff.svg",
  schedule: "/assets/img/08dbb3ce-181c-4a7b-80a5-a8d51cf438a8.svg",
  map: "/assets/img/08dbb3ce-181c-4a89-8a26-5d1010ddf30e.svg",
};

const overviewModuleTemplates = [
  { title: "Vật nuôi", icon: "livestock", description: "Số liệu đàn và chuồng trại", metric: "1.248 con", note: "Tăng 3,2% so với tuần trước" },
  { title: "Nguồn nước", icon: "water", description: "Mực nước và lịch tưới", metric: "82% dung tích", note: "2 hồ cần bổ sung" },
  { title: "Thời tiết", icon: "weather", description: "Mưa, độ ẩm, nhiệt độ", metric: "29°C · 76% RH", note: "Khả năng mưa: 63%" },
  { title: "Lịch vận hành", icon: "schedule", description: "Công việc trong ngày", metric: "12 tác vụ", note: "4 tác vụ ưu tiên cao" },
];

const initialZones: Zone[] = [];

const layerOptions: { key: LayerKey; label: string }[] = [
  { key: "paddocks", label: "Ô đất" },
  { key: "water", label: "Nguồn nước" },
  { key: "vehicles", label: "Phương tiện" },
  { key: "fences", label: "Hàng rào" },
  { key: "sensors", label: "Cảm biến" },
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
const farmTypeOptions: Array<FarmType | "all"> = ["all", "cattle", "sheep", "pig", "poultry", "crop"];

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

const angleToCursor = (centerX: number, centerY: number, clientX: number, clientY: number) =>
  (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI + 90;

const createStorageKey = (profile?: DashboardProfile) => {
  const rawKey = `${profile?.farmName || "farm"}-${profile?.address || "default"}`.toLowerCase();
  return `ketkat.ecofarm.map.${rawKey.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "default"}`;
};


const createEmptyZone = (
  nextIndex: number,
  mapCenter: { lat: number; lng: number },
  defaultGridArea: number
): Zone => {
  const code = `A${nextIndex}`;
  const geoSize = syncGeoSizeToArea(mapCenter.lat, defaultGridArea, 1.4);

  return {
    id: `z-${Date.now()}-${nextIndex}`,
    name: `Ô ${code}`,
    code,
    status: "healthy",
    occupancy: 0,
    coverage: `${defaultGridArea.toFixed(1)} ha`,
    geo: {
      lat: mapCenter.lat,
      lng: mapCenter.lng,
      ...geoSize,
    },
    metadata: {
      areaHecta: defaultGridArea,
      usage: "",
      soilType: "",
      waterSource: "",
      manager: "",
      plantingStatus: "",
      priority: "medium",
      notes: "",
      farmType: "cattle",
      shapeRatio: 1.4,
      rotationDeg: 0,
    },
    resources: [],
  };
};

export default function SmartFarmDashboard({ profile }: SmartFarmDashboardProps) {
  const farmName = profile?.farmName || "";
  const areaUnit = profile?.areaUnit || "";
  const defaultGridArea = profile?.defaultGridArea ?? 0;
  const originLat = profile?.lat ?? 10.8216;
  const originLng = profile?.lng ?? 106.6295;
  const storageKey = useMemo(() => createStorageKey(profile), [profile]);
  const [activeMenu, setActiveMenu] = useState("Bản đồ trực quan");
  const isManagementMode = activeMenu === "Quản lý khu";
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ paddocks: true, water: true, vehicles: true, fences: true, sensors: true });
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [selectedZone, setSelectedZone] = useState<string | null>(initialZones[0]?.id ?? null);
  const [resourceMode] = useState<ResourceType>("water");
  const [timeScale, setTimeScale] = useState("Hiện tại");
  const [statusFilter, setStatusFilter] = useState<ZoneStatus | "all">("all");
  const [resourceFilter] = useState<ResourceType | "all">("all");
  const [farmTypeFilter, setFarmTypeFilter] = useState<FarmType | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField] = useState<"code" | "name" | "area">("code");
  const [sortDir] = useState<"asc" | "desc">("asc");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [baselineZones, setBaselineZones] = useState<Zone[]>(initialZones);
  const [zoom, setZoom] = useState(16);
  const [viewport, setViewport] = useState<ViewportSize>(DEFAULT_VIEWPORT);
  const [mapCenter, setMapCenter] = useState(() => ({ lat: originLat, lng: originLng }));
  const [detailOpen, setDetailOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mapApi, setMapApi] = useState<MapApiState>({ loading: true, saving: false, error: null, fromDb: false });
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const rotateRef = useRef<RotateState | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadZones = async () => {
      setMapApi((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await fetch("/api/map/zones", { cache: "no-store" });
        if (!response.ok) throw new Error("API không phản hồi");
        const payload = (await response.json()) as { zones?: Zone[] };
        const dbZones = Array.isArray(payload.zones) ? payload.zones : [];
        setZones(dbZones);
        setBaselineZones(dbZones);
        setSelectedZone(dbZones[0]?.id ?? null);
        setMapApi({ loading: false, saving: false, error: null, fromDb: true });
      } catch {
        try {
          const stored = window.localStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored) as Partial<PersistedMapState>;
            const localZones = Array.isArray(parsed.zones) ? parsed.zones : [];
            setZones(localZones);
            setBaselineZones(localZones);
            setSelectedZone(typeof parsed.selectedZone === "string" ? parsed.selectedZone : null);
            setZoom(typeof parsed.zoom === "number" ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parsed.zoom)) : 16);
            setMapCenter(
              parsed.mapCenter && typeof parsed.mapCenter.lat === "number" && typeof parsed.mapCenter.lng === "number"
                ? parsed.mapCenter
                : { lat: originLat, lng: originLng }
            );
            setDetailOpen(Boolean(parsed.detailOpen));
          }
        } catch {
          window.localStorage.removeItem(storageKey);
        }
        setMapApi({ loading: false, saving: false, error: "Không kết nối được DB/API. Đang dùng dữ liệu tạm trên trình duyệt.", fromDb: false });
      } finally {
        hydratedRef.current = true;
      }
    };

    loadZones();
  }, [originLat, originLng, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydratedRef.current) return;

    const payload: PersistedMapState = {
      zones,
      selectedZone,
      zoom,
      mapCenter,
      detailOpen,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [detailOpen, mapCenter, selectedZone, storageKey, zoom, zones]);

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
      const matchesFarmType = farmTypeFilter === "all" || zone.metadata.farmType === farmTypeFilter;
      const matchesSearch =
        keyword.length === 0 ||
        zone.name.toLowerCase().includes(keyword) ||
        zone.code.toLowerCase().includes(keyword) ||
        zone.metadata.usage.toLowerCase().includes(keyword) ||
        zone.metadata.manager.toLowerCase().includes(keyword) ||
        farmTypeLabels[zone.metadata.farmType].toLowerCase().includes(keyword) ||
        zone.resources.some((resource) => resource.name.toLowerCase().includes(keyword));
      const matchesResource = resourceFilter === "all" || zone.resources.some((resource) => resource.type === resourceFilter);

      return matchesStatus && matchesFarmType && matchesSearch && matchesResource;
    });
  }, [farmTypeFilter, resourceFilter, searchTerm, statusFilter, zones]);

  const selected = useMemo(() => zones.find((zone) => zone.id === selectedZone) ?? zones[0] ?? null, [selectedZone, zones]);
  const sortedFilteredZones = useMemo(() => {
    const items = [...filteredZones];
    items.sort((a, b) => {
      const direction = sortDir === "asc" ? 1 : -1;
      if (sortField === "area") return (a.metadata.areaHecta - b.metadata.areaHecta) * direction;
      const left = (sortField === "name" ? a.name : a.code).toLowerCase();
      const right = (sortField === "name" ? b.name : b.code).toLowerCase();
      return left.localeCompare(right) * direction;
    });
    return items;
  }, [filteredZones, sortDir, sortField]);
  const selectedDimensions = useMemo(() => {
    if (!selected) {
      return { widthMeters: 0, heightMeters: 0 };
    }

    return {
      widthMeters: selected.geo.lngSpan * metersPerDegreeLng(selected.geo.lat),
      heightMeters: selected.geo.latSpan * METERS_PER_DEGREE_LAT,
    };
  }, [selected]);

  useEffect(() => {
    if (filteredZones.length === 0) {
      if (!zones.some((zone) => zone.id === selectedZone)) {
        setSelectedZone(zones[0]?.id ?? null);
      }
      return;
    }

    if (!filteredZones.some((zone) => zone.id === selectedZone) && filteredZones[0]) {
      setSelectedZone(filteredZones[0].id);
      setDetailOpen(false);
    }
  }, [filteredZones, selectedZone, zones]);

  const summaryColumns = useMemo(
    () => [
      {
        title: "Bản đồ vệ tinh",
        value: `Thu phóng ${zoom}`,
        detail: "Khu vực được vẽ theo bounds địa lý nên giữ vị trí đúng khi thu phóng và kéo bản đồ.",
      },
      {
        title: "Diện tích mặc định",
        value: `${defaultGridArea.toFixed(1)} ${areaUnit}`,
        detail: "Diện tích ha nhập vào sẽ tự ánh xạ sang kích thước lớp phủ thực tế trên bản đồ.",
      },
      {
        title: "Ô cần xử lý",
        value: `${zones.filter((zone) => zone.status !== "healthy").length}`,
        detail: "Bao gồm mức cần kiểm tra + khẩn cấp.",
      },
      {
        title: "Điều khiển bản đồ",
        value: "Ctrl + lăn / kéo",
        detail: "Giữ Ctrl + lăn chuột để thu phóng, kéo chuột để di chuyển khu vực xem.",
      },
    ],
    [areaUnit, defaultGridArea, zoom, zones]
  );

  const overviewMetrics = useMemo(
    () => [
      { key: "farm", label: "Nông trại đang quản lý", value: "01", note: farmName || "KetKat-EcoFarm" },
      { key: "user", label: "Nhân sự trực ca", value: "18", note: `${profile?.fullName || "Quản trị viên"} phụ trách` },
      { key: "area", label: "Tổng số khu canh tác", value: `${zones.length || 12}`, note: `${zones.filter((zone) => zone.status === "healthy").length || 8} khu ổn định` },
      { key: "sensor", label: "Cảm biến hoạt động", value: `${totals.sensors || 36}`, note: "Đồng bộ 5 phút/lần" },
      { key: "alert", label: "Cảnh báo mở", value: `${totals.alerts || 4}`, note: "Ưu tiên xử lý trong ngày" },
    ],
    [farmName, profile?.fullName, totals.alerts, totals.sensors, zones]
  );

  const overviewStatusRows = useMemo(() => {
    if (zones.length > 0) {
      return zones.slice(0, 4).map((zone, index) => ({
        name: `${zone.code} - ${zone.name}`,
        status: statusLabels[zone.status],
        priority: priorityLabels[zone.metadata.priority],
        manager: zone.metadata.manager || "Chưa phân công",
        updatedAt: `${9 - index}:${index === 0 ? "20" : index === 1 ? "12" : index === 2 ? "05" : "48"}`,
      }));
    }

    return [
      { name: "Khu A1 - Rau thủy canh", status: "Ổn định", priority: "Thấp", manager: "Tổ trưởng Minh", updatedAt: "09:20" },
      { name: "Khu B2 - Chăn nuôi", status: "Cần kiểm tra", priority: "Trung bình", manager: "Tổ trưởng Duyên", updatedAt: "09:12" },
      { name: "Khu C4 - Nhà màng", status: "Khẩn cấp", priority: "Cao", manager: "Tổ trưởng Hưng", updatedAt: "08:57" },
      { name: "Khu D1 - Hồ chứa", status: "Ổn định", priority: "Thấp", manager: "Tổ trưởng Lộc", updatedAt: "08:40" },
    ];
  }, [zones]);

  const overviewAlerts = useMemo(
    () => [
      { title: "Cảnh báo độ ẩm thấp", detail: "Khu C4 dưới ngưỡng 34%", time: "7 phút trước", level: "Khẩn cấp" },
      { title: "Máy bơm số 2 trễ lịch", detail: "Khu B2 chưa hoàn thành tưới sáng", time: "18 phút trước", level: "Cần kiểm tra" },
      { title: "Trạm mưa đồng bộ thành công", detail: "Dữ liệu thời tiết cập nhật bình thường", time: "31 phút trước", level: "Ổn định" },
    ],
    []
  );

  const resolveOverviewIcon = useCallback((key: string) => overviewIconMap[key] || OVERVIEW_ICON_FALLBACK, []);


  const saveZoneToDb = useCallback(async (zone: Zone) => {
    setMapApi((prev) => ({ ...prev, saving: true, error: null }));
    try {
      const isNew = zone.id.startsWith("z-");
      const response = await fetch("/api/map/zones", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zone),
      });
      if (!response.ok) throw new Error("Lưu khu thất bại");
      const payload = (await response.json()) as { zone: Zone };
      setZones((prev) => prev.map((item) => (item.id === zone.id ? payload.zone : item)));
      setBaselineZones((prev) => prev.map((item) => (item.id === zone.id ? payload.zone : item)));
      setSelectedZone(payload.zone.id);
      setMapApi((prev) => ({ ...prev, saving: false, fromDb: true }));
      return payload.zone;
    } catch {
      setMapApi((prev) => ({ ...prev, saving: false, error: "Lưu khu thất bại. Vui lòng thử lại." }));
      return null;
    }
  }, []);

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
            rotationDeg: zone.metadata.rotationDeg,
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

  const addZone = async () => {
    const nextIndex = zones.length + 1;
    const newZone = createEmptyZone(nextIndex, mapCenter, defaultGridArea || 1);

    setFormError(null);
    setFormSuccess(null);
    setZones((prev) => [...prev, newZone]);
    setBaselineZones((prev) => [...prev, newZone]);
    setSelectedZone(newZone.id);
    setDetailOpen(true);
    await saveZoneToDb(newZone);
  };

  const removeZone = async (zoneId: string) => {
    const backup = zones;
    const nextZones = zones.filter((zone) => zone.id !== zoneId);
    const nextSelectedZone = nextZones[0]?.id ?? null;
    setFormError(null);
    setFormSuccess(null);
    setZones(nextZones);
    setBaselineZones((prev) => prev.filter((zone) => zone.id !== zoneId));
    setSelectedZone(nextSelectedZone);
    setDetailOpen(Boolean(nextSelectedZone));

    if (zoneId.startsWith("z-")) return;

    try {
      await fetch("/api/map/zones", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: zoneId }),
      });
      setFormSuccess("Đã xóa khu thành công.");
    } catch {
      setZones(backup);
      setBaselineZones(backup);
      setMapApi((prev) => ({ ...prev, error: "Xóa khu thất bại. Dữ liệu đã được khôi phục." }));
    }
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

  const getZoneRenderBox = (zone: Zone) => {
    const northWest = latLngToWorldPixel(clampLat(zone.geo.lat + zone.geo.latSpan / 2), zone.geo.lng - zone.geo.lngSpan / 2, zoom);
    const southEast = latLngToWorldPixel(clampLat(zone.geo.lat - zone.geo.latSpan / 2), zone.geo.lng + zone.geo.lngSpan / 2, zoom);
    const originX = centerPixel.x - viewport.width / 2;
    const originY = centerPixel.y - viewport.height / 2;

    const width = Math.max(28, southEast.x - northWest.x);
    const height = Math.max(28, southEast.y - northWest.y);
    const left = northWest.x - originX;
    const top = northWest.y - originY;

    return {
      left,
      top,
      width,
      height,
      centerX: left + width / 2,
      centerY: top + height / 2,
    };
  };

  const projectZone = (zone: Zone): CSSProperties => {
    const box = getZoneRenderBox(zone);
    return {
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
      transform: `rotate(${zone.metadata.rotationDeg}deg)`,
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

  const beginResize = (
    event: React.PointerEvent<HTMLSpanElement>,
    zone: Zone,
    corner: ResizeCorner
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const box = getZoneRenderBox(zone);
    resizeRef.current = {
      zoneId: zone.id,
      corner,
      startX: event.clientX,
      startY: event.clientY,
      startWidthPx: box.width,
      startHeightPx: box.height,
      startWidthMeters: zone.geo.lngSpan * metersPerDegreeLng(zone.geo.lat),
      startHeightMeters: zone.geo.latSpan * METERS_PER_DEGREE_LAT,
      rotationDeg: zone.metadata.rotationDeg,
    };
    mapRef.current?.setPointerCapture(event.pointerId);
  };

  const beginRotate = (event: React.PointerEvent<HTMLSpanElement>, zone: Zone) => {
    event.preventDefault();
    event.stopPropagation();
    const box = getZoneRenderBox(zone);
    rotateRef.current = {
      zoneId: zone.id,
      centerX: box.centerX + mapRef.current!.getBoundingClientRect().left,
      centerY: box.centerY + mapRef.current!.getBoundingClientRect().top,
    };
    mapRef.current?.setPointerCapture(event.pointerId);
  };

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
    if (resizeRef.current) {
      const resizeState = resizeRef.current;
      const dx = event.clientX - resizeState.startX;
      const dy = event.clientY - resizeState.startY;
      const angle = (resizeState.rotationDeg * Math.PI) / 180;
      const localDx = dx * Math.cos(angle) + dy * Math.sin(angle);
      const localDy = -dx * Math.sin(angle) + dy * Math.cos(angle);
      const signX = resizeState.corner.includes("e") ? 1 : -1;
      const signY = resizeState.corner.includes("s") ? 1 : -1;
      const nextWidthPx = Math.max(28, resizeState.startWidthPx + signX * localDx);
      const nextHeightPx = Math.max(28, resizeState.startHeightPx + signY * localDy);
      const metersPerPxX = resizeState.startWidthMeters / Math.max(1, resizeState.startWidthPx);
      const metersPerPxY = resizeState.startHeightMeters / Math.max(1, resizeState.startHeightPx);
      const nextWidthMeters = Math.max(12, nextWidthPx * metersPerPxX);
      const nextHeightMeters = Math.max(12, nextHeightPx * metersPerPxY);
      const nextAreaHecta = (nextWidthMeters * nextHeightMeters) / 10_000;
      const nextShapeRatio = nextWidthMeters / Math.max(1, nextHeightMeters);

      setZones((prev) =>
        prev.map((zone) => {
          if (zone.id !== resizeState.zoneId) return zone;
          const nextGeo = {
            ...zone.geo,
            latSpan: nextHeightMeters / METERS_PER_DEGREE_LAT,
            lngSpan: nextWidthMeters / metersPerDegreeLng(zone.geo.lat),
          };

          return {
            ...zone,
            geo: nextGeo,
            coverage: `${nextAreaHecta.toFixed(1)} ha`,
            metadata: {
              ...zone.metadata,
              areaHecta: Number(nextAreaHecta.toFixed(2)),
              shapeRatio: Number(nextShapeRatio.toFixed(2)),
            },
          };
        })
      );
      return;
    }

    if (rotateRef.current) {
      const rotateState = rotateRef.current;
      const nextRotation = angleToCursor(rotateState.centerX, rotateState.centerY, event.clientX, event.clientY);
      setZones((prev) =>
        prev.map((zone) =>
          zone.id === rotateState.zoneId
            ? {
                ...zone,
                metadata: {
                  ...zone.metadata,
                  rotationDeg: Number(nextRotation.toFixed(1)),
                },
              }
            : zone
        )
      );
      return;
    }

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
    resizeRef.current = null;
    rotateRef.current = null;
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
    setFormError(null);
    setFormSuccess(null);
    setSelectedZone(zoneId);
    setDetailOpen(true);
  };

  const validateZone = (zone: Zone): string | null => {
    if (!zone.code.trim()) return "Mã khu là bắt buộc.";
    if (!zone.name.trim()) return "Tên khu là bắt buộc.";
    if (!zone.metadata.farmType) return "Vui lòng chọn loại khu.";
    if (zone.geo.lat < -85 || zone.geo.lat > 85) return "Vĩ độ phải trong khoảng -85 đến 85.";
    if (zone.geo.lng < -180 || zone.geo.lng > 180) return "Kinh độ phải trong khoảng -180 đến 180.";
    if (zone.geo.latSpan <= 0 || zone.geo.lngSpan <= 0) return "Kích thước span phải lớn hơn 0.";
    if (zone.metadata.areaHecta <= 0) return "Diện tích phải lớn hơn 0 ha.";
    return null;
  };

  const handleSaveSelectedZone = async () => {
    if (!selected) return;
    const invalid = validateZone(selected);
    if (invalid) {
      setFormSuccess(null);
      setFormError(invalid);
      return;
    }
    const saved = await saveZoneToDb(selected);
    if (saved) {
      setBaselineZones((prev) => prev.map((zone) => (zone.id === selected.id ? saved : zone)));
      setFormError(null);
      setFormSuccess("Đã lưu khu thành công.");
    }
  };

  const handleCancelEdit = () => {
    if (!selected) return;
    const baseline = baselineZones.find((zone) => zone.id === selected.id);
    if (!baseline) return;
    setZones((prev) => prev.map((zone) => (zone.id === selected.id ? baseline : zone)));
    setFormError(null);
    setFormSuccess("Đã hoàn tác thay đổi chưa lưu.");
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h2>KetKat-EcoFarm</h2>
        <ul>
          {sidebarMenus.map((item) => (
            <li key={item} className={activeMenu === item ? styles.activeMenu : ""} onClick={() => setActiveMenu(item)}>
              {item}
            </li>
          ))}
        </ul>
      </aside>

      <main className={styles.main}>
        {activeMenu === "Bản đồ trực quan" || activeMenu === "Quản lý khu" ? (
          <section>
            <header className={styles.topbar}>
              <div>
                <h1>{isManagementMode ? "Farm Map - Quản lý khu" : "Farm Map - Tổng quan"}</h1>
                <p>Hiển thị nhanh toàn bộ khu vực trên bản đồ vệ tinh theo thời gian thực, ưu tiên trải nghiệm quan sát trực quan.</p>
              </div>
              <span>{profile?.address ? `${profile.address} · ` : ""}{`${mapCenter.lat.toFixed(4)}, ${mapCenter.lng.toFixed(4)}`}</span>
            </header>

            <section className={styles.kpiGrid}>
              <article><b>{zones.length}</b><small>Tổng khu</small></article>
              <article><b>{totals.sensors}</b><small>Cảm biến hoạt động</small></article>
              <article><b>{totals.alerts}</b><small>Cảnh báo mở</small></article>
              <article><b>{totals.totalAssets}</b><small>Tài sản theo dõi</small></article>
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
                  <strong>Khung hiển thị: {timeScale}</strong>
                  <span>{summaryColumns[0].detail}</span>
                </div>
                <div className={styles.zoomActions}>
                  <button onClick={() => changeZoom(zoom - 1)}>-</button>
                  <b>{zoom}</b>
                  <button onClick={() => changeZoom(zoom + 1)}>+</button>
                  {isManagementMode ? <button className={styles.createBtn} onClick={addZone}>+ Tạo mới khu</button> : <button className={styles.createBtn} onClick={() => setActiveMenu("Quản lý khu")}>Đi đến Quản lý khu</button>}
                </div>
              </div>
              <div className={styles.configRow}>
                <label>
                  Khung thời gian
                  <select value={timeScale} onChange={(e) => setTimeScale(e.target.value)}>
                    <option>Hiện tại</option><option>Ca sáng</option><option>Ca chiều</option><option>Theo tuần</option>
                  </select>
                </label>
                <label>
                  Lọc trạng thái
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ZoneStatus | "all")}>{statusOptions.map((status) => <option key={status} value={status}>{status === "all" ? "Tất cả" : statusLabels[status]}</option>)}</select>
                </label>
                <label>
                  Loại khu
                  <select value={farmTypeFilter} onChange={(e) => setFarmTypeFilter(e.target.value as FarmType | "all")}>{farmTypeOptions.map((type) => <option key={type} value={type}>{type === "all" ? "Tất cả loại khu" : farmTypeLabels[type]}</option>)}</select>
                </label>
                <label className={styles.searchField}>
                  Tìm nhanh khu vực
                  <input type="text" value={searchTerm} placeholder="Ví dụ: A1, cây trồng, hồ chứa..." onChange={(e) => setSearchTerm(e.target.value)} />
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
                    <img key={tile.key} src={tile.src} alt="Mảnh bản đồ vệ tinh" style={{ left: tile.left, top: tile.top }} />
                  ))}
                </div>
                <div className={styles.overlayHint}>Ctrl + lăn để thu phóng · kéo để pan · bấm biểu tượng để mở chi tiết khu.</div>
                <div className={styles.gridOverlay} aria-hidden="true" />
                <div className={styles.areaLayer}>
                  {sortedFilteredZones.length === 0 ? (
                    <div className={styles.mapEmptyState}>
                      Chưa có khu nào phù hợp trên bản đồ. {isManagementMode ? <>Bấm <strong>+ Tạo mới khu</strong> để thêm dữ liệu.</> : <>Vui lòng chuyển sang <strong>Quản lý khu</strong> để tạo mới hoặc đổi bộ lọc.</>}
                    </div>
                  ) : null}
                  {sortedFilteredZones.map((zone) => (
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
                      {zone.id === selectedZone && detailOpen && isManagementMode ? (
                        <>
                          <span className={`${styles.cornerHandle} ${styles.cornerNw}`} onPointerDown={(event) => beginResize(event, zone, "nw")} />
                          <span className={`${styles.cornerHandle} ${styles.cornerNe}`} onPointerDown={(event) => beginResize(event, zone, "ne")} />
                          <span className={`${styles.cornerHandle} ${styles.cornerSw}`} onPointerDown={(event) => beginResize(event, zone, "sw")} />
                          <span className={`${styles.cornerHandle} ${styles.cornerSe}`} onPointerDown={(event) => beginResize(event, zone, "se")} />
                          <span className={styles.rotateHandle} onPointerDown={(event) => beginRotate(event, zone)}>
                            ↻
                          </span>
                        </>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <aside className={styles.resourcePanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <small>Thông tin khu</small>
                    <h3>{detailOpen && selected ? selected.name : zones.length === 0 ? "Chưa có khu" : "Chưa chọn khu"}</h3>
                  </div>
                  {detailOpen && selected && isManagementMode ? (
                    <div className={styles.panelActions}>
                      <button className={styles.ghostBtn} onClick={() => removeZone(selected.id)}>
                        Xóa khu
                      </button>
                      <button className={styles.allocateBtn} onClick={() => allocateResource(selected.id)}>
                        + Gán {resourceTypeLabels[resourceMode]}
                      </button>
                      <button className={styles.allocateBtn} onClick={handleSaveSelectedZone}>
                        Lưu khu
                      </button>
                      <button className={styles.ghostBtn} onClick={handleCancelEdit}>
                        Hủy
                      </button>
                    </div>
                  ) : null}
                </div>

                {!detailOpen || !selected ? (
                  <div className={styles.emptyState}>
                    <strong>{zones.length === 0 ? "Chưa có dữ liệu khu" : "Bản đồ đang ở chế độ xem tổng quan"}</strong>
                    <p>
                      {zones.length === 0
                        ? "Trang web hiện không nạp sẵn dữ liệu mẫu. Bạn có thể bấm + Khu để tự tạo vùng mới, sau đó dữ liệu sẽ được lưu lại cho lần tải trang sau."
                        : "Chỉ còn biểu tượng trên mỗi ô khu để dễ nhìn. Hãy bấm vào một khu trên bản đồ để mở phần thông tin chi tiết."}
                    </p>
                    <ul>
                      <li>Màu ô thể hiện loại khu: bò, cừu, heo, gia cầm hoặc cây trồng.</li>
                      <li>Ctrl + lăn chuột chỉ thu phóng trong bản đồ, không phóng to toàn bộ giao diện web.</li>
                      <li>Kéo chuột để di chuyển đến khu vực khác trên bản đồ.</li>
                      <li>Dữ liệu khu được lưu trên trình duyệt hiện tại, nên tải lại trang sẽ không bắt đầu lại từ đầu.</li>
                    </ul>
                  </div>
                ) : (
                  <>
                    <div className={styles.editorIntro}>
                      <strong>{selected.code}</strong>
                      <span>
                        {isManagementMode
                          ? "Điền thông số ở khung bên phải hoặc kéo trực tiếp góc/điểm xoay trên bản đồ để chỉnh vùng đất."
                          : "Đây là chế độ xem bản đồ trực quan. Chỉ hiển thị dữ liệu khu và tài nguyên, không chỉnh sửa trực tiếp trên bản đồ."}
                      </span>
                      {formError ? <span><strong>Lỗi:</strong> {formError}</span> : null}
                      {formSuccess ? <span><strong>Thành công:</strong> {formSuccess}</span> : null}
                    </div>
                    <div className={styles.zoneMeta}>
                      <article><span>Loại khu</span><strong>{farmTypeLabels[selected.metadata.farmType]}</strong></article>
                      <article><span>Trạng thái</span><strong>{statusLabels[selected.status]}</strong></article>
                      <article><span>Diện tích</span><strong>{selected.metadata.areaHecta.toFixed(1)} ha</strong></article>
                      <article><span>Kích thước thực</span><strong>{selectedDimensions.widthMeters.toFixed(0)}m × {selectedDimensions.heightMeters.toFixed(0)}m</strong></article>
                      <article><span>Phụ trách</span><strong>{selected.metadata.manager}</strong></article>
                      <article><span>Ưu tiên</span><strong>{priorityLabels[selected.metadata.priority]}</strong></article>
                    </div>

                    {isManagementMode ? (
                    <div className={styles.editorPanel}>
                      <div className={styles.resourceListHeader}>
                        <h4>Thông số khu</h4>
                        <span>{selected.code}</span>
                      </div>
                      <div className={styles.editorGrid}>
                        <label>
                          Tên khu
                          <input type="text" value={selected.name} onChange={(e) => setZones((prev) => prev.map((zone) => (zone.id === selected.id ? { ...zone, name: e.target.value } : zone)))} />
                        </label>
                        <label>
                          Loại khu
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
                          <small>{selected.geo.lat.toFixed(6)}</small>
                          <input type="range" min={originLat - 0.02} max={originLat + 0.02} step={0.0001} value={selected.geo.lat} onChange={(e) => updateZoneGeo(selected.id, "lat", Number(e.target.value))} />
                        </label>
                        <label>
                          Tâm longitude
                          <small>{selected.geo.lng.toFixed(6)}</small>
                          <input type="range" min={originLng - 0.02} max={originLng + 0.02} step={0.0001} value={selected.geo.lng} onChange={(e) => updateZoneGeo(selected.id, "lng", Number(e.target.value))} />
                        </label>
                        <label>
                          Span vĩ độ
                          <small>{selected.geo.latSpan.toFixed(4)}</small>
                          <input type="range" min={0.0008} max={0.005} step={0.0001} value={selected.geo.latSpan} onChange={(e) => updateZoneGeo(selected.id, "latSpan", Number(e.target.value))} />
                        </label>
                        <label>
                          Span kinh độ
                          <small>{selected.geo.lngSpan.toFixed(4)}</small>
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
                          Góc xoay (độ)
                          <input type="number" step={1} value={selected.metadata.rotationDeg} onChange={(e) => updateZoneMetadata(selected.id, "rotationDeg", Number(e.target.value) || 0)} />
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
                        <div className={styles.searchField}>
                          <span className={styles.measureHint}>
                            Chọn khu trên bản đồ rồi kéo các góc để chỉnh khung phủ, hoặc kéo nút xoay phía trên để xoay ô theo đúng hướng thực tế ngoài hiện trường.
                          </span>
                        </div>
                      </div>
                    </div>
                    ) : (
                      <div className={styles.editorPanel}>
                        <div className={styles.resourceListHeader}>
                          <h4>Chế độ xem bản đồ</h4>
                        </div>
                        <p>Đây là màn hình chỉ đọc. Vui lòng chuyển sang mục <strong>Quản lý khu</strong> để chỉnh sửa dữ liệu khu.</p>
                      </div>
                    )}

                    <div className={styles.resourceListHeader}>
                      <h4>Tài nguyên đã gán trong khu</h4>
                      <span>{selected.resources.length} nhóm tài nguyên</span>
                    </div>
                    <div className={styles.resourceList}>
                      {selected.resources.length === 0 ? (
                        <article className={styles.resourceCard}>
                          <div>
                            <small>Chưa có tài nguyên</small>
                            <strong>Ô khu này chưa được gán nước tưới, vật nuôi, cảm biến hoặc phương tiện.</strong>
                          </div>
                          <ul>
                            <li>Bạn có thể bấm nút “Gán tài nguyên” phía trên để thêm dữ liệu sau.</li>
                          </ul>
                        </article>
                      ) : (
                        selected.resources.map((resource) => (
                          <article key={resource.id} className={styles.resourceCard}>
                            <div>
                              <small>{resourceTypeLabels[resource.type]}</small>
                              <strong>{resource.name}</strong>
                            </div>
                            <span className={`${styles.statusPill} ${styles[resource.status]}`}>{statusLabels[resource.status]}</span>
                            <ul>
                              <li>Số lượng: {resource.quantity}</li>
                              <li>Vị trí: Ô {selected.code}</li>
                              <li>Cập nhật: {resource.lastSeen}</li>
                            </ul>
                          </article>
                        ))
                      )}
                    </div>
                  </>
                )}
              </aside>
            </section>

            {isManagementMode ? (
            <section className={styles.allocationPanel}>
              <div className={styles.panelTitle}>
                <h3>Danh sách khu tóm tắt</h3>
                <p>Mỗi khu hiện có thêm kiểu dữ liệu loại farm để tô màu và hiển thị biểu tượng nhận biết trên bản đồ.</p>
              </div>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Khu</th>
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
                    {sortedFilteredZones.length === 0 ? (
                      <tr>
                        <td colSpan={8}>Chưa có khu nào phù hợp. Hãy thêm khu mới hoặc thay đổi bộ lọc loại/trạng thái/tài nguyên.</td>
                      </tr>
                    ) : (
                      sortedFilteredZones.map((zone) => (
                        <tr
                          key={zone.id}
                          className={zone.id === selectedZone ? styles.selectedRow : ""}
                          onClick={() => handleSelectZone(zone.id)}
                        >
                          <td><strong>{zone.code}</strong><span>{zone.name}</span></td>
                          <td>{farmTypeLabels[zone.metadata.farmType]}</td>
                          <td>{zone.geo.lat.toFixed(5)}, {zone.geo.lng.toFixed(5)}</td>
                          <td>{zone.geo.latSpan.toFixed(4)} × {zone.geo.lngSpan.toFixed(4)}</td>
                          <td>{zone.metadata.areaHecta.toFixed(1)} ha</td>
                          <td>{(zone.geo.lngSpan * metersPerDegreeLng(zone.geo.lat)).toFixed(0)}m × {(zone.geo.latSpan * METERS_PER_DEGREE_LAT).toFixed(0)}m</td>
                          <td>{zone.metadata.usage || "Chưa nhập"}</td>
                          <td>{zone.metadata.manager || "Chưa nhập"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            ) : null}
          </section>
        ) : (
          <section className={styles.overviewBoard}>
            <header className={styles.overviewHeader}>
              <div>
                <p className={styles.overviewEyebrow}>Trung tâm điều hành KetKat-EcoFarm</p>
                <h1>{farmName || "KetKat-EcoFarm"}</h1>
                <p>Theo dõi nhanh chỉ số vận hành, cảnh báo và tình trạng khu vực theo thời gian thực.</p>
              </div>
              <span>{profile?.fullName || "Quản trị viên"}</span>
            </header>

            <section className={styles.overviewMetricGrid}>
              {overviewMetrics.map((metric) => (
                <article key={metric.label} className={styles.overviewMetricCard}>
                  <div className={styles.metricIconWrap}>
                    <img src={resolveOverviewIcon(metric.key)} alt={metric.label} onError={(e) => { e.currentTarget.src = OVERVIEW_ICON_FALLBACK; }} />
                  </div>
                  <strong>{metric.value}</strong>
                  <small>{metric.label}</small>
                  <span>{metric.note}</span>
                </article>
              ))}
            </section>

            <section className={styles.overviewContentGrid}>
              <article className={styles.overviewMapCard}>
                <div className={styles.sectionHead}><h3>Bản đồ giám sát nhanh</h3><small>Phóng to: mức {zoom}</small></div>
                <div className={styles.overviewMapPreview} ref={mapRef}>
                  <div className={styles.tileMap}>
                    {tileLayer.map((tile) => (
                      <img key={tile.key} src={tile.src} alt="Mảnh bản đồ vệ tinh" style={{ left: tile.left, top: tile.top }} />
                    ))}
                  </div>
                </div>
              </article>

              <article className={styles.overviewStatusCard}>
                <div className={styles.sectionHead}><h3>Trạng thái khu vực</h3><small>Cập nhật gần nhất</small></div>
                <ul>
                  {overviewStatusRows.map((item) => (
                    <li key={item.name}>
                      <div><strong>{item.name}</strong><span>{item.manager}</span></div>
                      <p>{item.status}</p>
                      <small>{item.updatedAt} · Ưu tiên {item.priority}</small>
                    </li>
                  ))}
                </ul>
              </article>
            </section>

            <section className={styles.overviewModuleGrid}>
              {overviewModuleTemplates.map((module) => (
                <article key={module.title} className={styles.overviewModuleCard}>
                  <div className={styles.moduleTitle}><img src={resolveOverviewIcon(module.icon)} alt={module.title} onError={(e) => { e.currentTarget.src = OVERVIEW_ICON_FALLBACK; }} /><h4>{module.title}</h4></div>
                  <p>{module.description}</p>
                  <strong>{module.metric}</strong>
                  <small>{module.note}</small>
                </article>
              ))}
              <article className={`${styles.overviewModuleCard} ${styles.overviewAlertCard}`}>
                <div className={styles.moduleTitle}><img src={resolveOverviewIcon("alert")} alt="Cảnh báo vận hành" onError={(e) => { e.currentTarget.src = OVERVIEW_ICON_FALLBACK; }} /><h4>Cảnh báo vận hành</h4></div>
                <ul>
                  {overviewAlerts.map((alert) => (
                    <li key={alert.title}><strong>{alert.title}</strong><span>{alert.detail}</span><small>{alert.time} · {alert.level}</small></li>
                  ))}
                </ul>
              </article>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}
