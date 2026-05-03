"use client";

import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

type Props = {
  mapRef: MutableRefObject<MapLibreMap | null>;
  active: boolean;
};

export default function MapDrawOverlay({ mapRef, active }: Props) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = active ? "crosshair" : "grab";
  }, [mapRef, active]);

  return null;
}
