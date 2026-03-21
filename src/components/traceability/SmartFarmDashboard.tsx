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

const TILE_SIZE = 256;
const DEFAULT_VIEWPORT: ViewportSize = { width: 960, height: 720 };
const MIN_ZOOM = 14;
const MAX_ZOOM = 19;
const METERS_PER_DEGREE_LAT = 111_320;

const sidebarMenus = [
  "Tổng quan",
  "Bản đồ nông trại",
  "Vật nuôi",
  "Đếm đàn",
  "Theo dõi vật nuôi",
  "Ô đất & khu vực",
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

const metricPills = [
  { label: "Nông trại", value: "" },
  { label: "Người dùng", value: "" },
  { label: "Tài sản", value: "" },
  { label: "Ô đất", value: "" },
  { label: "Cảm biến", value: "" },
  { label: "Hồ chứa", value: "" },
  { label: "Hàng rào", value: "" },
  { label: "Máy bơm", value: "" },
  { label: "Trạm mưa", value: "" },
  { label: "Bồn chứa", value: "" },
];

const widgets = [
  { title: "Vật nuôi", rows: ["", "", "", ""] },
  { title: "Đếm đàn", rows: ["", "", "", ""] },
  { title: "Theo dõi vật nuôi", rows: ["", "", "", ""] },
  { title: "Ô đất & khu vực", rows: ["", "", "", ""] },
  { title: "Nguồn nước", rows: ["", "", "", ""] },
  { title: "Lượng mưa", rows: ["", "", "", ""] },
  { title: "Kho lạnh", rows: ["", "", "", ""] },
  { title: "Sức khỏe đất", rows: ["", "", "", ""] },
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

const iconAssets = {
  dashboard: "/assets/img/08dbb3ce-1822-40ad-8549-b6180ff05bc2.svg",
  traceability: "/assets/img/08dbb3ce-181d-4aa1-8c6b-fc19d42c08e3.svg",
  data: "/assets/img/08dbb3ce-181e-4882-8370-5de4d5fc601b.svg",
  map: "/assets/img/08dbb3ce-1821-4dfc-8234-2243edad2577.svg",
  livestock: "/assets/img/08dbb3ce-1822-4840-8a96-4933641eaaee.svg",
  irrigation: "/assets/img/08dbb3ce-181d-4d5e-8a49-76b8a0c18122.svg",
  analytics: "/assets/img/08dbb3ce-1823-4389-801c-c707e29462a0.svg",
};

const menuIcons: Record<string, string> = {
  "Tổng quan": iconAssets.dashboard,
  "Bản đồ nông trại": iconAssets.map,
  "Vật nuôi": iconAssets.livestock,
  "Đếm đàn": iconAssets.analytics,
  "Theo dõi vật nuôi": iconAssets.traceability,
  "Ô đất & khu vực": iconAssets.map,
  "Nguồn nước": iconAssets.irrigation,
  "Theo dõi phương tiện": iconAssets.dashboard,
  "Hàng rào": iconAssets.traceability,
  "Tiêu thụ năng lượng": iconAssets.data,
  "Cảnh báo & thông báo": iconAssets.analytics,
  "Truy xuất nguồn gốc": iconAssets.traceability,
  "Theo dõi chất lượng không khí": iconAssets.data,
  "Thời tiết": iconAssets.analytics,
  "Cài đặt": iconAssets.dashboard,
};

const resourceTypeIcons: Record<ResourceType, string> = {
  water: iconAssets.irrigation,
  livestock: iconAssets.livestock,
  sensors: iconAssets.data,
  vehicle: iconAssets.dashboard,
};

const statusOptions: Array<ZoneStatus | "all"> = ["all", "healthy", "warning", "critical"];
const resourceTypeOptions: Array<ResourceType | "all"> = ["all", "water", "livestock", "sensors", "vehicle"];
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
  return `farmdeck.smart.map.${rawKey.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "default"}`;
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
  const [activeMenu, setActiveMenu] = useState("Bản đồ nông trại");
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ paddocks: true, water: true, vehicles: true, fences: true, sensors: true });
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [selectedZone, setSelectedZone] = useState<string | null>(initialZones[0]?.id ?? null);
  const [resourceMode, setResourceMode] = useState<ResourceType>("water");
  const [timeScale, setTimeScale] = useState("Hiện tại");
  const [statusFilter, setStatusFilter] = useState<ZoneStatus | "all">("all");
  const [resourceFilter, setResourceFilter] = useState<ResourceType | "all">("all");
  const [farmTypeFilter, setFarmTypeFilter] = useState<FarmType | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [zoom, setZoom] = useState(16);
  const [viewport, setViewport] = useState<ViewportSize>(DEFAULT_VIEWPORT);
  const [mapCenter, setMapCenter] = useState(() => ({ lat: originLat, lng: originLng }));
  const [detailOpen, setDetailOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const rotateRef = useRef<RotateState | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PersistedMapState>;
        setZones(Array.isArray(parsed.zones) ? parsed.zones : []);
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
    } finally {
      hydratedRef.current = true;
    }
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
        title: "Map vệ tinh thật",
        value: `Zoom ${zoom}`,
        detail: "Area được vẽ theo bounds địa lý nên giữ vị trí đúng khi zoom và pan.",
        icon: iconAssets.map,
      },
      {
        title: "Diện tích mặc định",
        value: `${defaultGridArea.toFixed(1)} ${areaUnit}`,
        detail: "Diện tích ha nhập vào sẽ tự ánh xạ sang kích thước overlay thực tế trên map.",
        icon: iconAssets.analytics,
      },
      {
        title: "Ô cần xử lý",
        value: `${zones.filter((zone) => zone.status !== "healthy").length}`,
        detail: "Bao gồm warning + critical.",
        icon: iconAssets.traceability,
      },
      {
        title: "Điều khiển map",
        value: "Ctrl + wheel / kéo",
        detail: "Giữ Ctrl + lăn chuột để zoom map, kéo chuột để pan khu vực xem.",
        icon: iconAssets.dashboard,
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

  const addZone = () => {
    const nextIndex = zones.length + 1;
    const newZone = createEmptyZone(nextIndex, mapCenter, defaultGridArea);

    setZones((prev) => [...prev, newZone]);
    setSelectedZone(newZone.id);
    setDetailOpen(true);
  };

  const removeZone = (zoneId: string) => {
    setZones((prev) => {
      const nextZones = prev.filter((zone) => zone.id !== zoneId);
      const nextSelectedZone = nextZones[0]?.id ?? null;
      setSelectedZone(nextSelectedZone);
      setDetailOpen(Boolean(nextSelectedZone));
      return nextZones;
    });
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
              <img src={menuIcons[item]} alt="" aria-hidden="true" className={styles.menuIcon} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </aside>

      <main className={styles.main}>
        {activeMenu === "Bản đồ nông trại" ? (
          <section>
            <header className={styles.topbar}>
              <div>
                <h1>Bản đồ nông trại</h1>
                <p>Bản đồ vệ tinh có pan/zoom nội bộ. Mỗi ô area hiển thị theo loại và chỉ hiện icon nhận biết; bấm vào để xem chi tiết.</p>
              </div>
              <span>
                {profile?.address ? `${profile.address} · ` : ""}
                {`${mapCenter.lat.toFixed(4)}, ${mapCenter.lng.toFixed(4)}`}
              </span>
            </header>

            <article className={styles.noticeCard}>
              <h3>Map tương tác đúng theo vị trí thật</h3>
              <p>
                Dữ liệu area được lưu bằng toạ độ tâm + bounds địa lý + loại farm. Khi zoom bằng <strong>Ctrl + lăn chuột</strong> hoặc kéo map, overlay sẽ được chiếu lại cùng hệ Web Mercator nên không bị lệch vùng đã set.
              </p>
            </article>

            <section className={styles.summaryColumns}>
              {summaryColumns.map((item) => (
                <article key={item.title}>
                  <div className={styles.cardIcon}>
                    <img src={item.icon} alt="" aria-hidden="true" />
                  </div>
                  <small>{item.title}</small>
                  <strong>{item.value}</strong>
                  <span>{item.detail}</span>
                </article>
              ))}
            </section>

            <section className={styles.kpiGrid}>
              <article><div className={styles.cardIcon}><img src={iconAssets.data} alt="" aria-hidden="true" /></div><b>{totals.totalAssets}</b><small>Tài sản</small></article>
              <article><div className={styles.cardIcon}><img src={resourceTypeIcons.sensors} alt="" aria-hidden="true" /></div><b>{totals.sensors}</b><small>Cảm biến</small></article>
              <article><div className={styles.cardIcon}><img src={resourceTypeIcons.livestock} alt="" aria-hidden="true" /></div><b>{totals.livestock}</b><small>Vật nuôi</small></article>
              <article><div className={styles.cardIcon}><img src={iconAssets.map} alt="" aria-hidden="true" /></div><b>{zones.length}</b><small>Ô area</small></article>
            </section>

            <section className={styles.mapControls}>
              <div className={styles.toggleRow}>
                {layerOptions.map((layer) => (
                  <button key={layer.key} className={layers[layer.key] ? styles.toggleActive : styles.toggleBtn} onClick={() => setLayers((prev) => ({ ...prev, [layer.key]: !prev[layer.key] }))}>
                    <img src={layer.key === "water" ? iconAssets.irrigation : layer.key === "sensors" ? iconAssets.data : layer.key === "vehicles" ? iconAssets.dashboard : iconAssets.map} alt="" aria-hidden="true" />
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
                  <button className={styles.createBtn} onClick={addZone}>+ Thêm area</button>
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
                  Lọc theo loại area
                  <select value={farmTypeFilter} onChange={(e) => setFarmTypeFilter(e.target.value as FarmType | "all")}>
                    {farmTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type === "all" ? "Tất cả loại area" : farmTypeLabels[type]}
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
                  <input type="text" value={searchTerm} placeholder="Ví dụ: cừu, bò, A7, nguồn nước..." onChange={(e) => setSearchTerm(e.target.value)} />
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
                  {filteredZones.length === 0 ? (
                    <div className={styles.mapEmptyState}>
                      Chưa có area nào phù hợp trên bản đồ. Bấm <strong>+ Thêm area</strong> để tạo mới hoặc đổi bộ lọc.
                    </div>
                  ) : null}
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
                      <span className={styles.areaAsset}>
                        <img src={zone.metadata.farmType === "crop" ? iconAssets.analytics : iconAssets.livestock} alt="" aria-hidden="true" />
                      </span>
                      {zone.id === selectedZone && detailOpen ? (
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
                    <small>Thông tin area</small>
                    <h3>{detailOpen && selected ? selected.name : zones.length === 0 ? "Chưa có area" : "Chưa chọn area"}</h3>
                  </div>
                  {detailOpen && selected ? (
                    <div className={styles.panelActions}>
                      <button className={styles.ghostBtn} onClick={() => removeZone(selected.id)}>
                        Xóa area
                      </button>
                      <button className={styles.allocateBtn} onClick={() => allocateResource(selected.id)}>
                        + Gán {resourceTypeLabels[resourceMode]}
                      </button>
                    </div>
                  ) : null}
                </div>

                {!detailOpen || !selected ? (
                  <div className={styles.emptyState}>
                    <strong>{zones.length === 0 ? "Chưa có dữ liệu area" : "Map đang ở chế độ xem tổng quan"}</strong>
                    <p>
                      {zones.length === 0
                        ? "Trang web hiện không nạp area demo. Bạn có thể bấm + Area để tự tạo vùng mới, sau đó dữ liệu sẽ được lưu lại cho lần tải trang sau."
                        : "Chỉ còn icon trên mỗi ô farm để dễ nhìn. Hãy click vào một area trên map để mở phần thông tin chi tiết."}
                    </p>
                    <ul>
                      <li>Màu ô thể hiện loại area: bò, cừu, heo, gia cầm hoặc cây trồng.</li>
                      <li>Ctrl + lăn chuột chỉ zoom trong map, không phóng to toàn bộ giao diện web.</li>
                      <li>Kéo chuột để di chuyển đến khu vực khác trên bản đồ.</li>
                      <li>Dữ liệu area được lưu trên trình duyệt hiện tại, nên refresh trang sẽ không bắt đầu lại từ đầu.</li>
                    </ul>
                  </div>
                ) : (
                  <>
                    <div className={styles.editorIntro}>
                      <strong>{selected.code}</strong>
                      <span>Điền thông số ở khung bên phải hoặc kéo trực tiếp góc/điểm xoay trên map để chỉnh vùng đất.</span>
                    </div>
                    <div className={styles.zoneMeta}>
                      <article><div className={styles.cardIcon}><img src={selected.metadata.farmType === "crop" ? iconAssets.analytics : iconAssets.livestock} alt="" aria-hidden="true" /></div><span>Loại area</span><strong>{farmTypeLabels[selected.metadata.farmType]}</strong></article>
                      <article><div className={styles.cardIcon}><img src={iconAssets.traceability} alt="" aria-hidden="true" /></div><span>Trạng thái</span><strong>{statusLabels[selected.status]}</strong></article>
                      <article><div className={styles.cardIcon}><img src={iconAssets.analytics} alt="" aria-hidden="true" /></div><span>Diện tích</span><strong>{selected.metadata.areaHecta.toFixed(1)} ha</strong></article>
                      <article><div className={styles.cardIcon}><img src={iconAssets.map} alt="" aria-hidden="true" /></div><span>Kích thước thực</span><strong>{selectedDimensions.widthMeters.toFixed(0)}m × {selectedDimensions.heightMeters.toFixed(0)}m</strong></article>
                      <article><div className={styles.cardIcon}><img src={iconAssets.dashboard} alt="" aria-hidden="true" /></div><span>Phụ trách</span><strong>{selected.metadata.manager || "Chưa nhập"}</strong></article>
                      <article><div className={styles.cardIcon}><img src={iconAssets.data} alt="" aria-hidden="true" /></div><span>Ưu tiên</span><strong>{priorityLabels[selected.metadata.priority]}</strong></article>
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
                            Chọn area trên map rồi kéo các góc để chỉnh khung phủ, hoặc kéo nút xoay phía trên để xoay ô theo đúng hướng thực tế ngoài hiện trường.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.resourceListHeader}>
                      <h4>Tài nguyên đã gán trong area</h4>
                      <span>{selected.resources.length} nhóm tài nguyên</span>
                    </div>
                    <div className={styles.resourceList}>
                      {selected.resources.length === 0 ? (
                        <article className={styles.resourceCard}>
                          <div>
                            <small>Chưa có tài nguyên</small>
                            <strong>Ô area này chưa được gán nước tưới, vật nuôi, cảm biến hoặc phương tiện.</strong>
                          </div>
                          <ul>
                            <li>Bạn có thể bấm nút “Gán tài nguyên” phía trên để thêm dữ liệu sau.</li>
                          </ul>
                        </article>
                      ) : (
                        selected.resources.map((resource) => (
                          <article key={resource.id} className={styles.resourceCard}>
                            <div>
                              <img src={resourceTypeIcons[resource.type]} alt="" aria-hidden="true" className={styles.resourceIcon} />
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
                    {filteredZones.length === 0 ? (
                      <tr>
                        <td colSpan={8}>Chưa có area nào phù hợp. Hãy thêm area mới hoặc thay đổi bộ lọc loại/trạng thái/tài nguyên.</td>
                      </tr>
                    ) : (
                      filteredZones.map((zone) => (
                        <tr key={zone.id} onClick={() => handleSelectZone(zone.id)}>
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
          </section>
        ) : (
          <section>
            <header className={styles.topbar}>
              <div>
                <h1>{farmName}</h1>
                <p>Tổng quan vận hành số cho nông trại. Chọn “Bản đồ nông trại” ở menu trái để xem area trên bản đồ.</p>
              </div>
              <span>{profile?.fullName || ""}</span>
            </header>

            <section className={styles.pillRow}>
              {metricPills.map((pill) => (
                <article key={pill.label}><div className={styles.cardIcon}><img src={iconAssets.data} alt="" aria-hidden="true" /></div><b>{pill.value}</b><small>{pill.label}</small></article>
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
                    <div className={styles.cardIcon}><img src={widget.title.includes("Vật nuôi") ? iconAssets.livestock : widget.title.includes("nước") || widget.title.includes("mưa") ? iconAssets.irrigation : iconAssets.data} alt="" aria-hidden="true" /></div>
                    <h3>{widget.title}</h3>
                    <ul>
                      {widget.rows.every((row) => row === "") ? (
                        <li>Chưa có dữ liệu</li>
                      ) : (
                        widget.rows.map((row, index) => (
                          <li key={`${widget.title}-${index}`}>{row}</li>
                        ))
                      )}
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
