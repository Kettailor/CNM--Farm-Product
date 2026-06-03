"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { PublicFarmDocument, PublicFarmMapItem } from "@/lib/public-farm-map";
import styles from "./public-farm-map-client.module.css";

type Props = {
  farms: PublicFarmMapItem[];
};

type LeafletModule = typeof import("leaflet");

const FALLBACK_COORD = { latitude: 10.762622, longitude: 106.660172 };
const DEFAULT_AVATAR_SVG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
      <rect width="96" height="96" rx="28" fill="#E6F4EA"/>
      <path d="M25 60c0-12.7 10.3-23 23-23s23 10.3 23 23v7H25v-7Z" fill="#76B36A"/>
      <path d="M30 37c0-9.9 8-18 18-18s18 8.1 18 18-8 18-18 18-18-8.1-18-18Z" fill="#4C8C3F"/>
      <path d="M23 66h50a4 4 0 0 1 4 4v6H19v-6a4 4 0 0 1 4-4Z" fill="#2F6F3D"/>
      <circle cx="39" cy="38" r="4" fill="#fff"/>
      <circle cx="57" cy="38" r="4" fill="#fff"/>
    </svg>
  `);

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  giay_kiem_nghiem: "Giấy kiểm nghiệm",
  giay_phep_kinh_doanh: "Giấy phép kinh doanh",
  bang_khen: "Bằng khen",
  giay_kiem_dinh: "Giấy kiểm định",
  ban_anh: "Bản ảnh",
  ban_dien_tu: "Bản điện tử",
  khac: "Chứng từ khác",
};

function valueOrEmpty(value: string | number | null | undefined, fallback = "Chưa cập nhật") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function displayDocumentType(value: string | null | undefined) {
  const cleanValue = String(value ?? "").trim();
  return DOCUMENT_TYPE_LABELS[cleanValue] ?? valueOrEmpty(cleanValue, "Chứng từ");
}

function formatDateValue(value: string | null | undefined) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "0";
  return `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}${suffix}`;
}

function getSafeHref(value: string | null | undefined) {
  const href = String(value ?? "").trim();
  if (!href) return null;
  if (href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://")) return href;
  return null;
}

function createMarkerHtml(farmName: string, avatarUrl: string | null) {
  const safeFarmName = escapeHtml(farmName);
  const src = avatarUrl || DEFAULT_AVATAR_SVG;
  const avatarStyle = escapeHtml(`background-image:url(${JSON.stringify(src)})`);

  return `
    <div style="display:grid;justify-items:center;gap:6px;width:152px;transform:translateY(-8px);pointer-events:auto;">
      <div style="width:58px;height:58px;border-radius:999px;background:linear-gradient(180deg,#fff 0%,#e4f0df 100%);border:3px solid #2f7d46;box-shadow:0 14px 30px rgba(18,62,32,.26);display:grid;place-items:center;position:relative;">
        <span aria-hidden="true" style="${avatarStyle};width:44px;height:44px;border-radius:999px;background-size:cover;background-position:center;display:block;"></span>
        <div style="position:absolute;left:50%;bottom:-12px;width:16px;height:16px;background:#2f7d46;transform:translateX(-50%) rotate(45deg);border-radius:4px;"></div>
      </div>
      <div style="max-width:152px;padding:5px 10px;border-radius:999px;background:rgba(17,44,24,.82);color:#fff;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 6px 14px rgba(0,0,0,.12);">
        ${safeFarmName}
      </div>
    </div>
  `;
}

function createPopupDocumentHtml(document: PublicFarmDocument) {
  const href = getSafeHref(document.fileUrl);
  const safeName = escapeHtml(document.name);
  const safeType = escapeHtml(displayDocumentType(document.type));
  const safeDate = escapeHtml(formatDateValue(document.expiresAt));
  const body = `
    <span style="display:block;color:#173123;font-weight:800;font-size:12px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeName}</span>
    <span style="display:block;color:#6b776c;font-size:11px;line-height:1.35;">${safeType} · Hết hạn: ${safeDate}</span>
  `;

  if (!href) {
    return `<div style="padding:8px 10px;border-radius:12px;background:#f6faf5;border:1px solid rgba(47,125,70,.12);">${body}</div>`;
  }

  return `
    <a href="${escapeHtml(href)}" target="_blank" rel="noreferrer" style="display:block;text-decoration:none;padding:8px 10px;border-radius:12px;background:#f6faf5;border:1px solid rgba(47,125,70,.12);">
      ${body}
    </a>
  `;
}

function createPopupHtml(farm: PublicFarmMapItem) {
  const safeFarmName = escapeHtml(farm.farmName);
  const safeLocation = escapeHtml(farm.locationName || farm.address || "Chưa khai báo vị trí");
  const safeOwnerName = escapeHtml(farm.ownerName || "Nông dân");
  const safeSpecialFactors = escapeHtml(farm.overview.specialFactors || "Chưa cập nhật ghi chú tổng quan.");
  const src = farm.ownerAvatarUrl || DEFAULT_AVATAR_SVG;
  const avatarStyle = escapeHtml(`background-image:url(${JSON.stringify(src)})`);
  const sharedDocuments = farm.sharedDocuments.slice(0, 3);
  const remainingDocumentCount = Math.max(farm.sharedDocuments.length - sharedDocuments.length, 0);
  const documentsHtml = sharedDocuments.length
    ? `
      <div style="display:grid;gap:6px;">
        ${sharedDocuments.map(createPopupDocumentHtml).join("")}
        ${remainingDocumentCount > 0 ? `<span style="color:#6b776c;font-size:11px;">+${remainingDocumentCount} chứng từ chia sẻ khác</span>` : ""}
      </div>
    `
    : `<div style="padding:8px 10px;border-radius:12px;background:#f6faf5;border:1px dashed rgba(47,125,70,.28);color:#6b776c;font-size:12px;">Chưa có chứng từ được chia sẻ.</div>`;

  return `
    <div style="width:292px;display:grid;gap:12px;">
      <div style="display:flex;align-items:center;gap:10px">
        <span aria-hidden="true" style="${avatarStyle};width:48px;height:48px;border-radius:14px;background-size:cover;background-position:center;flex:0 0 auto"></span>
        <div style="display:grid;min-width:0">
          <strong style="color:#173123;font-size:16px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeFarmName}</strong>
          <span style="color:#5a6a5d;font-size:13px;line-height:1.25;">${safeOwnerName}</span>
        </div>
      </div>
      <div style="color:#617164;font-size:13px;line-height:1.45">${safeLocation}</div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">
        <div style="padding:8px;border-radius:12px;background:#eef8f1;"><strong style="display:block;color:#173123;font-size:15px;">${farm.overview.zoneCount}</strong><span style="color:#617164;font-size:11px;">Khu vực</span></div>
        <div style="padding:8px;border-radius:12px;background:#eef8f1;"><strong style="display:block;color:#173123;font-size:15px;">${farm.overview.livestockCount}</strong><span style="color:#617164;font-size:11px;">Vật nuôi</span></div>
        <div style="padding:8px;border-radius:12px;background:#eef8f1;"><strong style="display:block;color:#173123;font-size:15px;">${farm.overview.sharedDocumentCount}</strong><span style="color:#617164;font-size:11px;">Chứng từ</span></div>
      </div>
      <div style="color:#617164;font-size:12px;line-height:1.45">${safeSpecialFactors}</div>
      <div style="display:grid;gap:7px;">
        <strong style="color:#173123;font-size:13px;">Chứng từ chia sẻ</strong>
        ${documentsHtml}
      </div>
    </div>
  `;
}

function avatarBackground(src: string): CSSProperties {
  return { backgroundImage: `url(${JSON.stringify(src)})` };
}

export function PublicFarmMapClient({ farms }: Props) {
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.farmId ?? null);
  const [mapReady, setMapReady] = useState(false);
  const [satelliteMode, setSatelliteMode] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const tileLayerRef = useRef<{ streets: import("leaflet").TileLayer; satellite: import("leaflet").TileLayer } | null>(null);

  const selectedFarm = useMemo(() => farms.find((farm) => farm.farmId === selectedFarmId) ?? farms[0] ?? null, [farms, selectedFarmId]);

  const center = useMemo<[number, number]>(() => {
    const validFarms = farms.filter((farm) => Number.isFinite(farm.latitude) && Number.isFinite(farm.longitude));
    if (!validFarms.length) return [FALLBACK_COORD.latitude, FALLBACK_COORD.longitude];
    const lat = validFarms.reduce((sum, farm) => sum + farm.latitude, 0) / validFarms.length;
    const lng = validFarms.reduce((sum, farm) => sum + farm.longitude, 0) / validFarms.length;
    return [lat, lng];
  }, [farms]);

  useEffect(() => {
    let cancelled = false;

    async function mountMap() {
      if (!mapNodeRef.current || mapRef.current) return;
      const leafletModule = (await import("leaflet")) as LeafletModule;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !mapNodeRef.current) return;

      const L = leafletModule;
      const map = L.map(mapNodeRef.current, { zoomControl: true });

      const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
      const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles &copy; Esri",
        maxZoom: 19,
      });

      tileLayerRef.current = { streets, satellite };
      (satelliteMode ? satellite : streets).addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      map.setView(center, farms.length > 1 ? 6 : 10);

      mapRef.current = map;
      setMapReady(true);
      queueMicrotask(() => map.invalidateSize());
    }

    void mountMap();
    return () => {
      cancelled = true;
    };
  }, [center, farms.length, satelliteMode]);
  useEffect(() => {
    let cancelled = false;

    async function renderMarkers() {
      const map = mapRef.current;
      const markerLayer = markerLayerRef.current;
      if (!map || !markerLayer || !mapReady) return;

      const leafletModule = (await import("leaflet")) as LeafletModule;
      if (cancelled) return;
      const L = leafletModule;

      markerLayer.clearLayers();

      const bounds = L.latLngBounds([]);
      const validFarms = farms.filter((farm) => Number.isFinite(farm.latitude) && Number.isFinite(farm.longitude));

      validFarms.forEach((farm) => {
        const marker = L.marker([farm.latitude, farm.longitude], {
          icon: L.divIcon({
            className: "",
            html: createMarkerHtml(farm.farmName, farm.ownerAvatarUrl),
            iconSize: [152, 120],
            iconAnchor: [76, 108],
            popupAnchor: [0, -92],
          }),
          keyboard: true,
          riseOnHover: true,
        });

        marker.bindPopup(createPopupHtml(farm), {
          closeButton: true,
          maxWidth: 340,
          minWidth: 292,
        });
        marker.on("click", () => {
          setSelectedFarmId(farm.farmId);
          map.flyTo([farm.latitude, farm.longitude], 18, { animate: true, duration: 0.6 });
        });
        marker.addTo(markerLayer);
        bounds.extend([farm.latitude, farm.longitude]);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2), { animate: true, duration: 0.6 });
      } else {
        map.setView(center, 10);
      }

      setTimeout(() => map.invalidateSize(), 0);
    }

    void renderMarkers();
    return () => {
      cancelled = true;
    };
  }, [center, farms, mapReady]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedFarm) return;
    if (!Number.isFinite(selectedFarm.latitude) || !Number.isFinite(selectedFarm.longitude)) return;
    map.flyTo([selectedFarm.latitude, selectedFarm.longitude], 18, { animate: true, duration: 0.6 });
  }, [selectedFarm]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = tileLayerRef.current;
    if (!map || !layers) return;

    map.eachLayer((layer) => {
      if (layer === layers.streets || layer === layers.satellite) {
        map.removeLayer(layer);
      }
    });

    (satelliteMode ? layers.satellite : layers.streets).addTo(map);
    setTimeout(() => map.invalidateSize(), 0);
  }, [satelliteMode]);

  return (
    <section className={styles.mapShell}>
      <aside className={styles.sidebar}>
        <div>
          <h2 className={styles.title}>Bản đồ nông trại công khai</h2>
          <p className={styles.description}>
            Khám phá mạng lưới đối tác KetKat-EcoFarm qua một hành trình bản đồ sống động, nơi mỗi điểm đến đều kể một câu chuyện về chất lượng và sự tin cậy.
          </p>
        </div>

        <div className={styles.statsRow}>
          <div>
            <strong>{farms.length}</strong>
            <span>Trang trại</span>
          </div>
          <div>
            <strong>Đang hoạt động</strong>
            <span>Trạng thái hệ thống</span>
          </div>
        </div>

        <div className={styles.list}>
          {farms.map((farm) => {
            const active = farm.farmId === selectedFarmId;
            return (
              <button key={farm.farmId} className={`${styles.listItem} ${active ? styles.listItemActive : ""}`} onClick={() => setSelectedFarmId(farm.farmId)}>
                <span className={styles.avatar} style={avatarBackground(farm.ownerAvatarUrl || DEFAULT_AVATAR_SVG)} aria-hidden="true" />
                <div className={styles.listCopy}>
                  <strong>{farm.farmName}</strong>
                  <span>{farm.locationName || "Chưa khai báo vị trí"}</span>
                </div>
              </button>
            );
          })}
          {farms.length === 0 && <p className={styles.empty}>Hiện chưa có nông trại nào bật chia sẻ.</p>}
        </div>

        {selectedFarm && (
          <section className={styles.detailPanel} aria-label={`Chi tiết ${selectedFarm.farmName}`}>
            <div className={styles.detailHeader}>
              <span className={styles.avatarSmall} style={avatarBackground(selectedFarm.ownerAvatarUrl || DEFAULT_AVATAR_SVG)} aria-hidden="true" />
              <div>
                <p>Đang xem</p>
                <h3>{selectedFarm.farmName}</h3>
              </div>
            </div>

            <dl className={styles.overviewList}>
              <div>
                <dt>Chủ trang trại</dt>
                <dd>{valueOrEmpty(selectedFarm.ownerName, "Nông dân")}</dd>
              </div>
              <div>
                <dt>Địa điểm</dt>
                <dd>{valueOrEmpty(selectedFarm.locationName ?? selectedFarm.address)}</dd>
              </div>
              <div>
                <dt>Diện tích</dt>
                <dd>{selectedFarm.overview.areaHectare ? formatNumber(selectedFarm.overview.areaHectare, " ha") : "Chưa cập nhật"}</dd>
              </div>
              <div>
                <dt>Hoạt động</dt>
                <dd>{valueOrEmpty(selectedFarm.overview.otherActivity)}</dd>
              </div>
            </dl>

            <div className={styles.detailMetrics}>
              <span><strong>{selectedFarm.overview.zoneCount}</strong>Khu vực</span>
              <span><strong>{selectedFarm.overview.livestockCount}</strong>Vật nuôi</span>
              <span><strong>{selectedFarm.overview.assetCount}</strong>Tài sản</span>
            </div>

            {selectedFarm.overview.specialFactors && <p className={styles.detailNote}>{selectedFarm.overview.specialFactors}</p>}

            <div className={styles.sharedDocuments}>
              <div className={styles.sharedDocumentsHeader}>
                <strong>Chứng từ chia sẻ</strong>
                <span>{selectedFarm.overview.sharedDocumentCount}</span>
              </div>
              {selectedFarm.sharedDocuments.length ? (
                <div className={styles.documentList}>
                  {selectedFarm.sharedDocuments.map((document) => {
                    const href = getSafeHref(document.fileUrl);
                    const content = (
                      <>
                        <strong>{document.name}</strong>
                        <span>{displayDocumentType(document.type)} · Hết hạn: {formatDateValue(document.expiresAt)}</span>
                      </>
                    );

                    return href ? (
                      <a key={document.id} className={styles.documentLink} href={href} target="_blank" rel="noreferrer">
                        {content}
                      </a>
                    ) : (
                      <div key={document.id} className={styles.documentLink}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.empty}>Trang trại này chưa bật chia sẻ chứng từ nào.</p>
              )}
            </div>
          </section>
        )}
      </aside>

      <div className={styles.mapPanel}>
        <div className={styles.mapHeader}>
          <div>
            <h3 className={styles.mapTitle}>Khám phá trang trại trên bản đồ</h3>
          </div>
          <div className={styles.mapControls}>
            <button type="button" className={`${styles.modeButton} ${!satelliteMode ? styles.modeButtonActive : ""}`} onClick={() => setSatelliteMode(false)}>
              Bản đồ thường
            </button>
            <button type="button" className={`${styles.modeButton} ${satelliteMode ? styles.modeButtonActive : ""}`} onClick={() => setSatelliteMode(true)}>
              Vệ tinh
            </button>
          </div>
          {selectedFarm && (
            <div className={styles.selectedBadge}>
              <span className={styles.avatarSmall} style={avatarBackground(selectedFarm.ownerAvatarUrl || DEFAULT_AVATAR_SVG)} aria-hidden="true" />
              <div>
                <strong>{selectedFarm.farmName}</strong>
                <span>{selectedFarm.overview.sharedDocumentCount} chứng từ chia sẻ</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.mapStage} ref={mapNodeRef}>
          {!mapReady && (
            <div className={styles.mapLoadingHint}>
              <p>Đang tải bản đồ...</p>
            </div>
          )}
          {!farms.length && mapReady && (
            <div className={styles.mapEmptyState}>
              <p>Chưa có dữ liệu trang trại để hiển thị.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
