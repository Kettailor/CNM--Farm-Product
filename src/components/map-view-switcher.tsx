"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type ViewMode = "satellite" | "terrain" | "roadmap" | "eco";

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
  frameClassName?: string;
  polygon?: MapPolygon[];
  zones?: MapZone[];
  fitToPolygon?: boolean;
  frameOverlay?: ReactNode;
  hideModeTabs?: boolean;
  hideEcoNote?: boolean;
  onViewChange?: (v: { lat: number; lng: number; zoom: number }) => void;
};

const STORAGE_KEY = "ketkat-map-view-mode";
const NDVI_DATE = "2024-01-01";

const viewItems: Array<{ key: ViewMode; label: string }> = [
  { key: "satellite", label: "Vệ tinh" },
  { key: "terrain", label: "Địa hình" },
  { key: "roadmap", label: "Đường bộ" },
  { key: "eco", label: "Độ cao & thảm thực vật" },
];

export default function MapViewSwitcher({ lat, lng, zoom = 16, title, frameClassName, polygon = [], zones = [], fitToPolygon = false, frameOverlay, hideModeTabs = false, hideEcoNote = false, onViewChange }: Props) {
  const [mode, setMode] = useState<ViewMode>("satellite");
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const zonesLayerRef = useRef<any>(null);
  const modeLayersRef = useRef<Record<ViewMode, any>>({ satellite: null, terrain: null, roadmap: null, eco: null });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (saved && ["satellite", "terrain", "roadmap", "eco"].includes(saved)) setMode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    let alive = true;

    const initMap = async () => {
      if (!hostRef.current || mapRef.current) return;
      const leaflet = await import("leaflet");
      const L = leaflet.default;
      if (!alive || !hostRef.current) return;

      leafletRef.current = L;
      const map = L.map(hostRef.current, {
        center: [lat, lng],
        zoom,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
      });
      mapRef.current = map;
      setMapReady(true);

      markerRef.current = L.circleMarker([lat, lng], { radius: 5, color: "#0f6aa7", fillColor: "#fff", fillOpacity: 1, weight: 2 }).addTo(map);
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {
          // map may be detached during fast navigation
        }
      }, 120);

      map.on("moveend zoomend", () => {
        try {
          const c = map.getCenter();
          const z = map.getZoom();
          onViewChange?.({ lat: Number(c.lat), lng: Number(c.lng), zoom: Number(z) });
        } catch {
          // ignore transient map state while unmounting
        }
      });
    };

    initMap();

    return () => {
      alive = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      polygonRef.current = null;
      zonesLayerRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
  }, [lat, lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapReady) return;

    const tileCommon = {
      maxZoom: 19,
      keepBuffer: 2,
      updateWhenIdle: true,
      updateWhenZooming: false,
    };

    const createResilientTileLayer = (urls: string[], options?: Record<string, unknown>) => {
      let currentIndex = 0;
      const layer = L.tileLayer(urls[currentIndex], { ...tileCommon, ...options });
      layer.on("tileerror", () => {
        if (currentIndex >= urls.length - 1) return;
        currentIndex += 1;
        layer.setUrl(urls[currentIndex], false);
      });
      return layer;
    };

    const buildModeLayer = (key: ViewMode) => {
      if (key === "satellite") {
        return createResilientTileLayer([
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ], { subdomains: ["a", "b", "c"] });
      }
      if (key === "terrain") {
        return createResilientTileLayer([
          "https://tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ], { subdomains: ["a", "b", "c"], maxZoom: 17 });
      }
      if (key === "roadmap") {
        return createResilientTileLayer([
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        ], { subdomains: ["a", "b", "c", "d"] });
      }
      return L.layerGroup([
        createResilientTileLayer([
          "https://tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ], { subdomains: ["a", "b", "c"], maxZoom: 17 }),
        createResilientTileLayer([
          "https://services.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
        ], { opacity: 0.45 }),
        createResilientTileLayer([
          `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${NDVI_DATE}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
        ], { opacity: 0.35, maxNativeZoom: 9 }),
      ]);
    };

    setIsLoading(true);
    map.setView([lat, lng], mode === "eco" ? Math.min(zoom, 9) : zoom, { animate: false });

    (Object.keys(modeLayersRef.current) as ViewMode[]).forEach((key) => {
      const layer = modeLayersRef.current[key];
      if (layer && map.hasLayer(layer)) map.removeLayer(layer);
    });

    if (!modeLayersRef.current[mode]) {
      modeLayersRef.current[mode] = buildModeLayer(mode);
    }

    const activeLayer = modeLayersRef.current[mode];
    const done = () => setIsLoading(false);
    activeLayer.addTo(map);

    const tileLayers: any[] = [];
    if (typeof activeLayer.eachLayer === "function") {
      activeLayer.eachLayer((layer: any) => tileLayers.push(layer));
    } else {
      tileLayers.push(activeLayer);
    }

    let pending = tileLayers.length;
    if (pending === 0) {
      done();
    } else {
      tileLayers.forEach((tile: any) => {
        tile.once?.("load", () => {
          pending -= 1;
          if (pending <= 0) done();
        });
        tile.once?.("tileerror", () => {
          pending -= 1;
          if (pending <= 0) done();
        });
      });
      setTimeout(done, 2500);
    }

    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore transient leaflet pane errors
      }
    }, 40);
  }, [mode, lat, lng, zoom, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapReady) return;

    if (polygonRef.current && map.hasLayer(polygonRef.current)) {
      map.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }
    if (zonesLayerRef.current && map.hasLayer(zonesLayerRef.current)) {
      map.removeLayer(zonesLayerRef.current);
      zonesLayerRef.current = null;
    }

    const validPolygon = polygon.filter((p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)));
    const validZones = zones
      .map((zone) => ({
        ...zone,
        polygon: Array.isArray(zone.polygon)
          ? zone.polygon.filter((p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)))
          : [],
      }))
      .filter((zone) => zone.polygon.length >= 3);

    if (validZones.length > 0) {
      zonesLayerRef.current = L.featureGroup(
        validZones.map((zone) =>
          L.polygon(zone.polygon, {
            color: zone.color || "#2ca25f",
            weight: 2,
            fillOpacity: 0.22,
          }).bindTooltip(zone.label || "Ô khu vực", { sticky: true })
        )
      );
      zonesLayerRef.current.addTo(map);
    }

    if (validPolygon.length >= 3) {
      polygonRef.current = L.polygon(validPolygon, { color: "#2ca25f", weight: 2, fillOpacity: 0.2 });
      polygonRef.current.addTo(map);
    }

    if (fitToPolygon) {
      try {
        const targetBounds =
          polygonRef.current?.getBounds?.() ||
          zonesLayerRef.current?.getBounds?.();
        if (targetBounds?.isValid?.() && hostRef.current?.isConnected) {
          setTimeout(() => {
            try {
              map.fitBounds(targetBounds, { padding: [18, 18], animate: false });
            } catch {
              // ignore transient leaflet pane errors
            }
          }, 0);
        }
      } catch {
        // ignore invalid bounds safely
      }
    }
  }, [mapReady, fitToPolygon, polygon, zones]);

  return (
    <div className="map-view-switcher">
      {!hideModeTabs && (
        <div className="map-view-switcher-tabs" role="tablist" aria-label="Kiểu hiển thị bản đồ">
          {viewItems.map((item) => (
            <button key={item.key} type="button" role="tab" aria-selected={mode === item.key} className={mode === item.key ? "active" : ""} onClick={() => setMode(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="map-view-switcher-frame">
        <div ref={hostRef} aria-label={title} className={`${frameClassName ?? ""} leaflet-map-host`} />
        {frameOverlay}
        {isLoading && <div className="map-eco-loading">Đang tải dữ liệu bản đồ...</div>}
      </div>

      {mode === "eco" && !hideEcoNote && <p className="map-ndvi-note">Đã tối ưu bằng tile CDN (ArcGIS + CARTO + NASA GIBS), giữ đúng 4 kiểu xem và giảm giật khi chuyển mode.</p>}
    </div>
  );
}

