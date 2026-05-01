"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import maplibregl, { type LngLatLike, type Map as MapLibreMap, type NavigationControl, type StyleSpecification } from "maplibre-gl";

type ViewMode = "satellite" | "terrain" | "roadmap" | "vegetation";
type InteractionMode = "navigate" | "inspect" | "measure";

type MapPolygon = { lat: number; lng: number };
type MapZone = {
  id: string;
  label?: string;
  color?: string;
  polygon: MapPolygon[];
};

type Props = {
  lat: number;
  lng: number;
  zoom?: number;
  title: string;
  initialMode?: ViewMode;
  frameClassName?: string;
  polygon?: MapPolygon[];
  zones?: MapZone[];
  fitToPolygon?: boolean;
  frameOverlay?: ReactNode;
  hideModeTabs?: boolean;
  hideEcoNote?: boolean;
  lockMap?: boolean;
  onViewChange?: (v: { lat: number; lng: number; zoom: number }) => void;
  onPixelMetricsChange?: (v: {
    zoom: number;
    size: { x: number; y: number };
    pixelBounds: { minX: number; minY: number; maxX: number; maxY: number };
  }) => void;
};

const STORAGE_KEY = "ketkat-map-view-mode";
const INTERACTION_STORAGE_KEY = "ketkat-map-interaction-mode";
const VEGETATION_DATE = "2024-01-01";

const viewItems: Array<{ key: ViewMode; label: string; description: string }> = [
  { key: "satellite", label: "Vệ tinh", description: "Ảnh nền có độ chi tiết cao" },
  { key: "terrain", label: "Địa hình", description: "Đường đồng mức và địa hình" },
  { key: "roadmap", label: "Sơ đồ", description: "Nhìn tuyến đường và hạ tầng" },
  { key: "vegetation", label: "Thảm thực vật", description: "Lớp phủ thực vật & nhiệt độ" },
];

const interactionItems: Array<{ key: InteractionMode; label: string }> = [
  { key: "navigate", label: "Điều hướng" },
  { key: "inspect", label: "Quan sát" },
  { key: "measure", label: "Đo nhanh" },
];

const baseStyles: Record<ViewMode, StyleSpecification> = {
  satellite: {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      imagery: {
        type: "raster",
        tiles: [
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "Esri, OpenStreetMap contributors",
      },
      roads: {
        type: "vector",
        url: "https://demotiles.maplibre.org/tiles/tiles.json",
      },
    },
    layers: [
      { id: "imagery", type: "raster", source: "imagery", paint: { "raster-opacity": 1 } },
      { id: "road-labels", type: "line", source: "roads", "source-layer": "roads", paint: { "line-color": "#ffffff", "line-opacity": 0.25, "line-width": 0.8 } },
    ],
  },
  terrain: {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      terrain: {
        type: "raster",
        tiles: [
          "https://tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "OpenTopoMap, OpenStreetMap contributors",
      },
    },
    layers: [{ id: "terrain", type: "raster", source: "terrain", paint: { "raster-opacity": 1 } }],
  },
  roadmap: {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      roadmap: {
        type: "raster",
        tiles: [
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "CARTO, OpenStreetMap contributors",
      },
    },
    layers: [{ id: "roadmap", type: "raster", source: "roadmap", paint: { "raster-opacity": 1 } }],
  },
  vegetation: {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      vegetation: {
        type: "raster",
        tiles: [
          `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${VEGETATION_DATE}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
          "https://tile.opentopomap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "NASA GIBS, OpenTopoMap",
      },
      shade: {
        type: "raster",
        tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        attribution: "Esri",
      },
    },
    layers: [
      { id: "vegetation-base", type: "raster", source: "vegetation", paint: { "raster-opacity": 0.82 } },
      { id: "vegetation-shade", type: "raster", source: "shade", paint: { "raster-opacity": 0.28 } },
    ],
  },
};

const formatLngLat = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

const polygonToGeoJSON = (polygon: MapPolygon[]) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "Polygon" as const, coordinates: [[...polygon.map((p) => [p.lng, p.lat]), [polygon[0].lng, polygon[0].lat]]] },
});

const ringToGeoJSON = (polygon: MapPolygon[]) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "Polygon" as const, coordinates: [[...polygon.map((p) => [p.lng, p.lat]), [polygon[0].lng, polygon[0].lat]]] },
});

export default function MapViewSwitcher({ lat, lng, zoom = 16, title, initialMode = "satellite", frameClassName, polygon = [], zones = [], fitToPolygon = false, frameOverlay, hideModeTabs = false, hideEcoNote = false, lockMap = false, onViewChange, onPixelMetricsChange }: Props) {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("navigate");
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<HTMLDivElement | null>(null);
  const polygonLayerIdRef = useRef<string | null>(null);
  const zoneLayerIdRef = useRef<string | null>(null);
  const lastFitKeyRef = useRef<string | null>(null);

  const validPolygon = useMemo(() => polygon.filter((p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))), [polygon]);
  const validZones = useMemo(() => zones.map((zone) => ({ ...zone, polygon: Array.isArray(zone.polygon) ? zone.polygon.filter((p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng))) : [] })).filter((zone) => zone.polygon.length >= 3), [zones]);

  useEffect(() => {
    if (hideModeTabs) {
      setMode(initialMode);
      return;
    }
    const saved = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (saved && viewItems.some((item) => item.key === saved)) setMode(saved);
    const savedInteraction = localStorage.getItem(INTERACTION_STORAGE_KEY) as InteractionMode | null;
    if (savedInteraction && interactionItems.some((item) => item.key === savedInteraction)) setInteractionMode(savedInteraction);
  }, [hideModeTabs, initialMode]);

  useEffect(() => {
    if (hideModeTabs) return;
    localStorage.setItem(STORAGE_KEY, mode);
  }, [hideModeTabs, mode]);

  useEffect(() => {
    localStorage.setItem(INTERACTION_STORAGE_KEY, interactionMode);
  }, [interactionMode]);

  useEffect(() => {
    let alive = true;

    const initMap = async () => {
      if (!hostRef.current || mapRef.current) return;
      const map = new maplibregl.Map({
        container: hostRef.current,
        style: baseStyles[mode],
        center: [lng, lat] as LngLatLike,
        zoom,
        interactive: !lockMap,
      });

      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }) as NavigationControl, "top-right");

      const updateMetrics = () => {
        try {
          const center = map.getCenter();
          const currentZoom = map.getZoom();
          onViewChange?.({ lat: Number(center.lat), lng: Number(center.lng), zoom: Number(currentZoom) });
          const size = map.getCanvas().getBoundingClientRect();
          onPixelMetricsChange?.({
            zoom: Number(currentZoom),
            size: { x: Number(size.width), y: Number(size.height) },
            pixelBounds: { minX: 0, minY: 0, maxX: Number(size.width), maxY: Number(size.height) },
          });
        } catch {
          // ignore transient state
        }
      };

      map.on("load", () => {
        if (!alive) return;
        setMapReady(true);
        setIsLoading(false);
        updateMetrics();
      });

      map.on("moveend", updateMetrics);
      map.on("zoomend", updateMetrics);
      map.on("resize", updateMetrics);
    };

    initMap();

    return () => {
      alive = false;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [lat, lng, zoom, lockMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    setIsLoading(true);
    map.setStyle(baseStyles[mode]);
    const onStyleLoad = () => setIsLoading(false);
    map.once("idle", onStyleLoad);
    map.once("styledata", onStyleLoad);
    map.jumpTo({ center: [lng, lat] as LngLatLike, zoom: mode === "vegetation" ? Math.min(zoom, 9) : zoom });
    map.setPitch(mode === "satellite" ? 30 : 0);
  }, [mode, lat, lng, zoom, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map[lockMap ? "dragPan" : "dragPan"].enable();
    if (lockMap) {
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.doubleClickZoom.disable();
      map.keyboard.disable();
      map.touchZoomRotate.disable();
    } else {
      map.scrollZoom.enable();
      map.boxZoom.enable();
      map.doubleClickZoom.enable();
      map.keyboard.enable();
      map.touchZoomRotate.enable();
    }
  }, [lockMap, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const sourceId = "farm-polygons";
    const zoneSourceId = "farm-zones";

    if (polygonLayerIdRef.current && map.getLayer(polygonLayerIdRef.current)) map.removeLayer(polygonLayerIdRef.current);
    if (zoneLayerIdRef.current && map.getLayer(zoneLayerIdRef.current)) map.removeLayer(zoneLayerIdRef.current);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    if (map.getSource(zoneSourceId)) map.removeSource(zoneSourceId);

    if (validPolygon.length >= 3) {
      map.addSource(sourceId, { type: "geojson", data: polygonToGeoJSON(validPolygon) });
      polygonLayerIdRef.current = "farm-polygon-fill";
      map.addLayer({ id: polygonLayerIdRef.current, type: "fill", source: sourceId, paint: { "fill-color": "#2ca25f", "fill-opacity": 0.22 } });
      map.addLayer({ id: "farm-polygon-line", type: "line", source: sourceId, paint: { "line-color": "#2ca25f", "line-width": 2.25 } });
    }

    if (validZones.length > 0) {
      const features = validZones.map((zone) => ({
        type: "Feature" as const,
        properties: { id: zone.id, label: zone.label || "Ô khu vực", color: zone.color || "#2ca25f" },
        geometry: { type: "Polygon" as const, coordinates: [[...zone.polygon.map((p) => [p.lng, p.lat]), [zone.polygon[0].lng, zone.polygon[0].lat]]] },
      }));
      map.addSource(zoneSourceId, { type: "geojson", data: { type: "FeatureCollection", features } as any });
      zoneLayerIdRef.current = "farm-zone-fill";
      map.addLayer({ id: zoneLayerIdRef.current, type: "fill", source: zoneSourceId, paint: { "fill-color": ["coalesce", ["get", "color"], "#2ca25f"], "fill-opacity": 0.18 } });
      map.addLayer({ id: "farm-zone-line", type: "line", source: zoneSourceId, paint: { "line-color": ["coalesce", ["get", "color"], "#2ca25f"], "line-width": 2 } });
      map.addLayer({ id: "farm-zone-label", type: "symbol", source: zoneSourceId, layout: { "text-field": ["get", "label"], "text-size": 12, "text-offset": [0, 1.1] }, paint: { "text-color": "#1f2937", "text-halo-color": "#ffffff", "text-halo-width": 1.5 } });
    }

    if (fitToPolygon) {
      try {
        const bounds = validPolygon.length >= 3 ? new maplibregl.LngLatBounds(validPolygon[0] as any, validPolygon[0] as any) : validZones.length > 0 ? new maplibregl.LngLatBounds(validZones[0].polygon[0] as any, validZones[0].polygon[0] as any) : null;
        validPolygon.forEach((p) => bounds?.extend([p.lng, p.lat]));
        validZones.forEach((zone) => zone.polygon.forEach((p) => bounds?.extend([p.lng, p.lat])));
        const fitKey = JSON.stringify({ polygon: validPolygon, zones: validZones.map((z) => ({ id: z.id, polygon: z.polygon })) });
        if (bounds && !bounds.isEmpty() && lastFitKeyRef.current !== fitKey) {
          lastFitKeyRef.current = fitKey;
          map.fitBounds(bounds, { padding: 24, duration: 0 });
        }
      } catch {
        // ignore invalid bounds
      }
    }
  }, [mapReady, fitToPolygon, validPolygon, validZones]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const marker = markerRef.current ?? document.createElement("div");
    markerRef.current = marker;
    marker.className = "map-marker-dot";
    marker.innerHTML = "<span></span>";
    const popup = new maplibregl.Popup({ offset: 18, closeButton: false, closeOnClick: false }).setText(title);
    const lngLat = [lng, lat] as LngLatLike;
    const markerInstance = new maplibregl.Marker({ element: marker, anchor: "center" }).setLngLat(lngLat).setPopup(popup).addTo(map);
    return () => {
      markerInstance.remove();
    };
  }, [lat, lng, title, mapReady]);

  return (
    <div className="map-view-switcher">
      {!hideModeTabs && (
        <div className="map-view-switcher-tabs" role="tablist" aria-label="Kiểu hiển thị bản đồ">
          {viewItems.map((item) => (
            <button key={item.key} type="button" role="tab" aria-selected={mode === item.key} className={mode === item.key ? "active" : ""} onClick={() => setMode(item.key)}>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      )}

      <div className="map-view-switcher-toolbar" aria-label="Chế độ thao tác bản đồ">
        {interactionItems.map((item) => (
          <button key={item.key} type="button" className={interactionMode === item.key ? "active" : ""} onClick={() => setInteractionMode(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="map-view-switcher-frame">
        <div ref={hostRef} aria-label={title} className={`${frameClassName ?? ""} maplibre-map-host`} />
        {frameOverlay}
        {isLoading && <div className="map-eco-loading">Đang tải lớp bản đồ tốc độ cao...</div>}
        {!hideEcoNote && <div className="map-view-switcher-note">Hiển thị lớp nền nhanh, hỗ trợ vệ tinh, địa hình, thảm thực vật và thao tác trực quan hơn.</div>}
      </div>

      <div className="map-view-switcher-footer">
        <span>{formatLngLat(lat, lng)}</span>
        <span>{interactionMode === "measure" ? "Nhấn để đo khoảng cách/ghi chú" : interactionMode === "inspect" ? "Tối ưu cho kiểm tra và lọc lớp dữ liệu" : "Kéo để điều hướng bản đồ"}</span>
      </div>
    </div>
  );
}
