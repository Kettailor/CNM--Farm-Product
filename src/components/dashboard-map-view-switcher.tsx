"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import maplibregl, { type LngLatLike, type Map as MapLibreMap, type NavigationControl, type StyleSpecification } from "maplibre-gl";
import CowLoading from "./cow-loading";
import MapDrawOverlay from "./dashboard-map-draw-overlay";
import {
  toolbarButtonStyle,
  toolbarIconMap,
  toolbarTooltipMap,
  type ToolbarAction,
} from "./dashboard-map-tool-icons";

type ViewMode = "satellite" | "terrain" | "roadmap" | "vegetation";
type MapPolygon = { lat: number; lng: number };
type MapZone = { id: string; label?: string; color?: string; polygon: MapPolygon[]; kind?: string };
type MapObject = { id: string; label?: string; color?: string; geometry: { type: "Point"; coordinates: [number, number] } | { type: "Polygon"; coordinates: [number, number][][] }; kind?: string };

type Props = {
  lat: number;
  lng: number;
  zoom?: number;
  title: string;
  initialMode?: ViewMode;
  frameClassName?: string;
  polygon?: MapPolygon[];
  zones?: MapZone[];
  objects?: MapObject[];
  fitToPolygon?: boolean;
  frameOverlay?: ReactNode;
  hideModeTabs?: boolean;
  hideEcoNote?: boolean;
  lockMap?: boolean;
  showToolbar?: boolean;
  toolbarAboveMap?: boolean;
  onViewChange?: (v: { lat: number; lng: number; zoom: number }) => void;
  onMapClick?: (v: { lat: number; lng: number }) => void;
  activeTool?: ToolbarAction | null;
  onToolbarAction?: (action: ToolbarAction) => void;
  onPixelMetricsChange?: (v: { zoom: number; size: { x: number; y: number }; pixelBounds: { minX: number; minY: number; maxX: number; maxY: number } }) => void;
};

const STORAGE_KEY = "ketkat-map-view-mode";
const VEGETATION_DATE = "2024-01-01";
const SATELLITE_MAX_ZOOM = 18;
const DEFAULT_MAX_ZOOM = 20;
const getMaxZoomForMode = (viewMode: ViewMode) => (viewMode === "satellite" ? SATELLITE_MAX_ZOOM : DEFAULT_MAX_ZOOM);
const clampZoomToMode = (zoom: number, viewMode: ViewMode) => Math.min(Number.isFinite(zoom) ? zoom : getMaxZoomForMode(viewMode), getMaxZoomForMode(viewMode));
const viewItems: Array<{ key: ViewMode; label: string; description: string }> = [
  { key: "satellite", label: "Vệ tinh", description: "Ảnh nền có độ chi tiết cao" },
  { key: "terrain", label: "Địa hình", description: "Đường đồng mức và địa hình" },
  { key: "roadmap", label: "Sơ đồ", description: "Nhìn tuyến đường và hạ tầng" },
  { key: "vegetation", label: "Thảm thực vật", description: "Lớp phủ thực vật & nhiệt độ" },
];
const toolbarItems: ToolbarAction[] = ["add", "undo", "clear"];

const baseStyles: Record<ViewMode, StyleSpecification> = {
  satellite: { version: 8, glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", sources: { imagery: { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 19, attribution: "Esri, OpenStreetMap contributors" } }, layers: [{ id: "imagery", type: "raster", source: "imagery", paint: { "raster-opacity": 1, "raster-resampling": "linear", "raster-fade-duration": 0 } }] },
  terrain: { version: 8, glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", sources: { terrain: { type: "raster", tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "OpenTopoMap, OpenStreetMap contributors" } }, layers: [{ id: "terrain", type: "raster", source: "terrain", paint: { "raster-opacity": 1, "raster-fade-duration": 0 } }] },
  roadmap: { version: 8, glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", sources: { roadmap: { type: "raster", tiles: ["https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"], tileSize: 256, attribution: "CARTO, OpenStreetMap contributors" } }, layers: [{ id: "roadmap", type: "raster", source: "roadmap", paint: { "raster-opacity": 1, "raster-fade-duration": 0 } }] },
  vegetation: { version: 8, glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", sources: { vegetation: { type: "raster", tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${VEGETATION_DATE}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`], tileSize: 256, maxzoom: 9, attribution: "NASA GIBS" }, shade: { type: "raster", tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Esri" } }, layers: [{ id: "vegetation-base", type: "raster", source: "vegetation", paint: { "raster-opacity": 0.92, "raster-fade-duration": 0 } }, { id: "vegetation-shade", type: "raster", source: "shade", paint: { "raster-opacity": 0.15, "raster-fade-duration": 0 } }] },
};

const formatLngLat = (lat: number | string, lng: number | string) => `${Number.isFinite(Number(lat)) ? Number(lat).toFixed(5) : "0.00000"}, ${Number.isFinite(Number(lng)) ? Number(lng).toFixed(5) : "0.00000"}`;
const polygonToGeoJSON = (polygon: MapPolygon[]) => ({
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "Polygon" as const,
    coordinates: [[...polygon.map((p) => [p.lng, p.lat]), [polygon[0].lng, polygon[0].lat]]],
  },
});

const getPolygonBounds = (points: MapPolygon[]) => {
  if (!points.length) return null;
  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ] as [[number, number], [number, number]];
};

export default function MapViewSwitcher({ lat, lng, zoom = 16, title, initialMode = "satellite", frameClassName, polygon = [], zones = [], objects = [], fitToPolygon = false, frameOverlay, hideModeTabs = false, hideEcoNote = false, lockMap = false, showToolbar = false, toolbarAboveMap = false, activeTool = null, onViewChange, onMapClick, onToolbarAction, onPixelMetricsChange }: Props) {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const initialModeRef = useRef<ViewMode>(initialMode);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<HTMLDivElement | null>(null);
  const activeToolRef = useRef<ToolbarAction | null>(activeTool ?? null);
  const onMapClickRef = useRef<Props["onMapClick"]>(onMapClick);
  const onViewChangeRef = useRef<Props["onViewChange"]>(onViewChange);
  const onPixelMetricsChangeRef = useRef<Props["onPixelMetricsChange"]>(onPixelMetricsChange);
  const onToolbarActionRef = useRef<Props["onToolbarAction"]>(onToolbarAction);
  const renderTokenRef = useRef(0);
  const clickLockRef = useRef(false);
  const lastClickAtRef = useRef(0);
  const cameraRef = useRef<{ lat: number; lng: number; zoom: number }>({ lat: Number(lat) || 0, lng: Number(lng) || 0, zoom: Number(zoom) || 16 });
  const validPolygon = useMemo(() => polygon.filter((p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))), [polygon]);
  const validZones = useMemo(() => zones.map((zone) => ({ ...zone, polygon: Array.isArray(zone.polygon) ? zone.polygon.filter((p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))) : [] })).filter((zone) => zone.polygon.length >= 3), [zones]);
  const validObjects = useMemo(() => objects.filter((obj) => obj?.geometry && (obj.geometry.type === "Point" || obj.geometry.type === "Polygon")), [objects]);
  const shouldFitToPolygon = fitToPolygon && (validPolygon.length >= 3 || validZones.length > 0 || validObjects.length > 0);

  useEffect(() => { activeToolRef.current = activeTool ?? null; }, [activeTool]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onViewChangeRef.current = onViewChange; }, [onViewChange]);
  useEffect(() => { onPixelMetricsChangeRef.current = onPixelMetricsChange; }, [onPixelMetricsChange]);
  useEffect(() => { onToolbarActionRef.current = onToolbarAction; }, [onToolbarAction]);
  useEffect(() => { if (hideModeTabs) { setMode(initialModeRef.current); return; } const saved = localStorage.getItem(STORAGE_KEY) as ViewMode | null; if (saved && viewItems.some((item) => item.key === saved)) setMode(saved); }, [hideModeTabs]);
  useEffect(() => { if (!hideModeTabs) localStorage.setItem(STORAGE_KEY, mode); }, [hideModeTabs, mode]);

  useEffect(() => {
    let alive = true;
    let loadingTimer: ReturnType<typeof window.setTimeout> | null = null;
    const initMap = async () => {
      if (!hostRef.current || mapRef.current) return;
      const initialCenter = cameraRef.current;
      const map = new maplibregl.Map({ container: hostRef.current, style: baseStyles[mode], center: [initialCenter.lng, initialCenter.lat] as LngLatLike, zoom: clampZoomToMode(initialCenter.zoom, mode), maxZoom: getMaxZoomForMode(mode), minZoom: 3, pitch: 0, bearing: 0, interactive: !lockMap });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false, showZoom: true }) as NavigationControl, "top-right");
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      const finishLoading = () => {
        if (!alive) return;
        setMapReady(true);
        setIsLoading(false);
      };
      const updateMetrics = () => {
        try {
          const center = map.getCenter();
          const currentZoom = map.getZoom();
          cameraRef.current = { lat: Number(center.lat), lng: Number(center.lng), zoom: Number(currentZoom) };
          onViewChangeRef.current?.(cameraRef.current);
          const size = map.getCanvas().getBoundingClientRect();
          onPixelMetricsChangeRef.current?.({ zoom: Number(currentZoom), size: { x: Number(size.width), y: Number(size.height) }, pixelBounds: { minX: 0, minY: 0, maxX: Number(size.width), maxY: Number(size.height) } });
        } catch {}
      };
      loadingTimer = window.setTimeout(finishLoading, 2500) as unknown as ReturnType<typeof window.setTimeout>;
      map.on("load", () => { if (!alive) return; if (loadingTimer) window.clearTimeout(loadingTimer); finishLoading(); updateMetrics(); });
      map.on("error", () => { if (!alive) return; if (loadingTimer) window.clearTimeout(loadingTimer); finishLoading(); });
      map.on("moveend", updateMetrics);
      map.on("zoomend", updateMetrics);
      map.on("resize", updateMetrics);
      map.on("click", (e) => {
        if (activeToolRef.current !== "add") return;
        const now = Date.now();
        if (clickLockRef.current || now - lastClickAtRef.current < 120) return;
        clickLockRef.current = true;
        lastClickAtRef.current = now;
        window.setTimeout(() => { clickLockRef.current = false; }, 0);
        onMapClickRef.current?.({ lat: Number(e.lngLat.lat), lng: Number(e.lngLat.lng) });
      });
      map.on("dblclick", (e) => { if (activeToolRef.current !== "add") return; e.preventDefault(); });
    };
    initMap();
    return () => { alive = false; if (loadingTimer) window.clearTimeout(loadingTimer); mapRef.current?.remove(); mapRef.current = null; setMapReady(false); };
  }, [lockMap, mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    renderTokenRef.current += 1;
    const token = renderTokenRef.current;
    const nextMaxZoom = getMaxZoomForMode(mode);

    const applyLayerState = () => {
      if (!mapRef.current || token !== renderTokenRef.current) return;
      const currentMap = mapRef.current;
      if (!currentMap.isStyleLoaded()) return;

      const removeLayer = (layerId: string) => { if (currentMap.getLayer(layerId)) currentMap.removeLayer(layerId); };
      const removeSource = (sourceId: string) => { if (currentMap.getSource(sourceId)) currentMap.removeSource(sourceId); };

      removeLayer("farm-polygon-fill");
      removeLayer("farm-polygon-line");
      removeLayer("farm-draft-points-layer");
      removeLayer("farm-draft-point-labels");
      removeLayer("farm-zone-fill");
      removeLayer("farm-zone-line");
      removeLayer("farm-zone-label");
      removeLayer("farm-object-points");
      removeLayer("farm-object-labels");
      removeSource("farm-polygons");
      removeSource("farm-draft-points");
      removeSource("farm-zones");
      removeSource("farm-objects");

      if (validPolygon.length >= 3) {
        currentMap.addSource("farm-polygons", { type: "geojson", data: polygonToGeoJSON(validPolygon) });
        currentMap.addLayer({ id: "farm-polygon-fill", type: "fill", source: "farm-polygons", paint: { "fill-color": "#2ca25f", "fill-opacity": 0.22 } });
        currentMap.addLayer({ id: "farm-polygon-line", type: "line", source: "farm-polygons", paint: { "line-color": "#2ca25f", "line-width": 2.25 } });
      }

      if (validPolygon.length > 0) {
        const pointCollection = { type: "FeatureCollection" as const, features: validPolygon.map((point, index) => ({ type: "Feature" as const, properties: { index: index + 1 }, geometry: { type: "Point" as const, coordinates: [point.lng, point.lat] } })) };
        currentMap.addSource("farm-draft-points", { type: "geojson", data: pointCollection });
        currentMap.addLayer({ id: "farm-draft-points-layer", type: "circle", source: "farm-draft-points", paint: { "circle-radius": 6, "circle-color": activeToolRef.current === "add" ? "#fb7185" : "#2ca25f", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
        currentMap.addLayer({ id: "farm-draft-point-labels", type: "symbol", source: "farm-draft-points", layout: { "text-field": ["get", "index"], "text-size": 11, "text-offset": [0, 1.1] }, paint: { "text-color": "#111827", "text-halo-color": "#ffffff", "text-halo-width": 1.5 } });
      }

      if (validZones.length > 0) {
        const features = validZones.map((zone) => ({ type: "Feature" as const, properties: { id: zone.id, label: zone.label || "Ô khu vực", color: zone.color || "#2ca25f", kind: zone.kind || "khu_vuc" }, geometry: { type: "Polygon" as const, coordinates: [[...zone.polygon.map((p) => [p.lng, p.lat]), [zone.polygon[0].lng, zone.polygon[0].lat]]] } }));
        currentMap.addSource("farm-zones", { type: "geojson", data: { type: "FeatureCollection" as const, features } });
        currentMap.addLayer({ id: "farm-zone-fill", type: "fill", source: "farm-zones", paint: { "fill-color": ["coalesce", ["get", "color"], "#2ca25f"], "fill-opacity": 0.18 } });
        currentMap.addLayer({ id: "farm-zone-line", type: "line", source: "farm-zones", paint: { "line-color": ["coalesce", ["get", "color"], "#2ca25f"], "line-width": 2 } });
        currentMap.addLayer({ id: "farm-zone-label", type: "symbol", source: "farm-zones", layout: { "text-field": ["get", "label"], "text-size": 12, "text-offset": [0, 1.1] }, paint: { "text-color": "#1f2937", "text-halo-color": "#ffffff", "text-halo-width": 1.5 } });
      }

      if (validObjects.length > 0) {
        const objectFeatures = validObjects.map((object) => ({ type: "Feature" as const, properties: { id: object.id, label: object.label || "Đối tượng", color: object.color || "#2563eb", kind: object.kind || "doi_tuong_ban_do" }, geometry: object.geometry }));
        currentMap.addSource("farm-objects", { type: "geojson", data: { type: "FeatureCollection" as const, features: objectFeatures } });
        currentMap.addLayer({ id: "farm-object-points", type: "circle", source: "farm-objects", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 6, "circle-color": ["coalesce", ["get", "color"], "#2563eb"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
        currentMap.addLayer({ id: "farm-object-labels", type: "symbol", source: "farm-objects", filter: ["==", ["geometry-type"], "Point"], layout: { "text-field": ["get", "label"], "text-size": 11, "text-offset": [0, 1.2] }, paint: { "text-color": "#1f2937", "text-halo-color": "#ffffff", "text-halo-width": 1.5 } });
      }

      currentMap.setMaxZoom(nextMaxZoom);
      if (currentMap.getZoom() > nextMaxZoom) currentMap.setZoom(nextMaxZoom);
      if (shouldFitToPolygon) {
        const bounds = getPolygonBounds(validPolygon.length >= 3 ? validPolygon : validZones[0]?.polygon ?? []);
        if (bounds) currentMap.fitBounds(bounds, { padding: 24, duration: 0 });
      }
      setIsLoading(false);
    };

    const run = () => {
      if (token !== renderTokenRef.current) return;
      if (!map.isStyleLoaded()) {
        map.once("idle", run);
        return;
      }
      applyLayerState();
    };

    run();
  }, [mode, mapReady, validPolygon, validZones, validObjects, shouldFitToPolygon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const marker = markerRef.current ?? document.createElement("div");
    markerRef.current = marker;
    marker.className = "map-marker-dot";
    marker.innerHTML = "<span></span>";
    const popup = new maplibregl.Popup({ offset: 18, closeButton: false, closeOnClick: false }).setText(title);
    const lngLat = [Number(lng) || 0, Number(lat) || 0] as LngLatLike;
    const markerInstance = new maplibregl.Marker({ element: marker, anchor: "center" }).setLngLat(lngLat).setPopup(popup).addTo(map);
    if (map.getZoom() > getMaxZoomForMode(mode)) map.setZoom(getMaxZoomForMode(mode));
    return () => {
      markerInstance.remove();
    };
  }, [lat, lng, title, mapReady, mode]);

  return (
    <div className="map-view-switcher">
      {!hideModeTabs && <div className="map-view-switcher-tabs" role="tablist" aria-label="Kiểu hiển thị bản đồ">{viewItems.map((item) => <button key={item.key} type="button" role="tab" aria-selected={mode === item.key} className={mode === item.key ? "active" : ""} onClick={() => setMode(item.key)}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div>}
      {showToolbar && toolbarAboveMap && <div className="map-toolbar-top-shell"><div className="map-toolbar-horizontal" aria-label="Thanh công cụ vẽ khu vực">{toolbarItems.map((item) => <button key={item} type="button" className={`map-tool-btn ${activeTool === item ? "is-active" : ""}`} onClick={() => onToolbarActionRef.current?.(item)} title={toolbarTooltipMap[item]} aria-label={toolbarTooltipMap[item]} style={toolbarButtonStyle}><span className="map-tool-icon">{toolbarIconMap[item]}</span></button>)}</div></div>}
      <div className="map-view-switcher-frame">
        {!toolbarAboveMap && showToolbar && <div className="map-left-toolbar-shell"><div className="map-left-toolbar" aria-label="Thanh công cụ vẽ khu vực">{toolbarItems.map((item) => <button key={item} type="button" className={`map-tool-btn ${activeTool === item ? "is-active" : ""}`} onClick={() => onToolbarActionRef.current?.(item)} title={toolbarTooltipMap[item]} aria-label={toolbarTooltipMap[item]} style={toolbarButtonStyle}><span className="map-tool-icon">{toolbarIconMap[item]}</span></button>)}</div></div>}
        <div ref={hostRef} aria-label={title} className={`${frameClassName ?? ""} maplibre-map-host`} />
        <MapDrawOverlay mapRef={mapRef} active={activeTool === "add"} />
        {frameOverlay}
        {isLoading && <div className="map-eco-loading"><CowLoading label="Đang tải..." /></div>}
        {!hideEcoNote && <div className="map-view-switcher-note">Hiển thị lớp nền nhanh, hỗ trợ vệ tinh, địa hình, thảm thực vật và thao tác trực quan hơn.</div>}
      </div>
      <div className="map-view-switcher-footer"><span>{formatLngLat(lat, lng)}</span><span>Kéo để di chuyển bản đồ · Bấm icon để bật/tắt ghim điểm</span></div>
    </div>
  );
}
