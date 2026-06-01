"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import CowLoading from "@/components/cow-loading";
import ZoneActionMenu from "@/components/dashboard-zone-actions";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import { WAREHOUSE_TYPE_OPTIONS, isWarehouseType, type WarehouseType } from "@/lib/warehouse-types";
import styles from "./page.module.css";
import type { ZoneDetail } from "@/lib/dashboard-zone-detail";
import { ZONE_TYPE_FORM_CONFIGS, ZONE_TYPE_INFO, ZONE_TYPE_OPTIONS, type ZoneTypeKey } from "@/lib/zone-type-utils";

type Props = {
  zone: ZoneDetail;
  vegetation: unknown;
};

const ZONE_STATES = ["đang hoạt động", "bản nháp", "ngừng hoạt động", "bảo trì", "đã ngừng", "dự kiến", "hoàn thành", "đã hủy"] as const;
const MAP_TYPES = ["vệ tinh", "đường", "địa hình"] as const;
type ZoneStateValue = (typeof ZONE_STATES)[number];

function zoneStatusValueFromKey(status: string): ZoneStateValue {
  if (status === "inactive") return "ngừng hoạt động";
  if (status === "maintenance") return "bảo trì";
  if (status === "planned") return "dự kiến";
  if (status === "cancelled") return "đã hủy";
  return "đang hoạt động";
}

export default function EditZoneClient({ zone }: Props) {
  const [loading, setLoading] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const [zoneTypeKey, setZoneTypeKey] = useState<ZoneTypeKey>(zone.typeKey);
  const typeFields = ZONE_TYPE_FORM_CONFIGS[zoneTypeKey].fields;
  const [typeSpecific, setTypeSpecific] = useState<Record<string, string>>(zone.typeSpecific);
  const [warehouseTypes, setWarehouseTypes] = useState<WarehouseType[]>(zone.warehouseTypes.filter(isWarehouseType));
  const [form, setForm] = useState({
    name: zone.name,
    status: zoneStatusValueFromKey(zone.status),
    description: zone.description,
    color: zone.colorHex,
    latitude: String(zone.center.lat),
    longitude: String(zone.center.lng),
    areaHa: zone.areaHa ? String(zone.areaHa) : "",
    perimeterM: zone.perimeterM ? String(zone.perimeterM) : "",
    capacity: zone.capacity,
    mapType: "vệ tinh",
    zoomLevel: "17",
  });

  const [points] = useState(zone.polygon);
  const canSave = form.name.trim().length > 0 && (zoneTypeKey !== "storage" || warehouseTypes.length > 0);
  const toggleWarehouseType = (type: WarehouseType) => {
    setWarehouseTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  };

  const mapPreview = useMemo(
    () => (
      <MapViewSwitcher
        lat={Number(form.latitude) || zone.center.lat}
        lng={Number(form.longitude) || zone.center.lng}
        zoom={Number(form.zoomLevel) || 17}
        title={zone.name}
        initialMode={form.mapType === "vệ tinh" ? "satellite" : form.mapType === "đường" ? "roadmap" : "terrain"}
        frameClassName={styles.mapCanvas}
        polygon={points}
        fitToPolygon
        hideModeTabs={false}
        hideEcoNote
        lockMap={false}
      />
    ),
    [form.latitude, form.longitude, form.mapType, form.zoomLevel, points, zone.center.lat, zone.center.lng, zone.name]
  );

  const onSave = async () => {
    if (savingRef.current || loading) return;
    if (!canSave) return setError("Vui lòng nhập đầy đủ thông tin bắt buộc.");
    savingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const nextWarehouseTypes = zoneTypeKey === "storage" ? warehouseTypes : [];
      const capacityValue = typeSpecific.capacity ?? typeSpecific.herdCapacity ?? form.capacity;
      const before = {
        name: zone.name,
        status: zone.statusLabel,
        description: zone.description,
        color: zone.colorHex,
        areaHa: zone.areaHa,
        perimeterM: zone.perimeterM,
        capacity: zone.capacity,
        typeSpecific: zone.typeSpecific,
        zoneTypeKey: zone.typeKey,
        polygon: zone.polygon,
      };
      const after = {
        name: form.name,
        status: form.status,
        description: form.description,
        color: form.color,
        areaHa: form.areaHa,
        perimeterM: form.perimeterM,
        capacity: capacityValue,
        typeSpecific: { ...typeSpecific, zoneTypeKey, warehouseTypes: nextWarehouseTypes },
        zoneTypeKey,
        polygon: points,
      };

      const response = await fetch(`/api/dashboard/khu-vuc/${zone.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          status: form.status,
          description: form.description,
          color: form.color,
          points,
          areaHa: form.areaHa,
          perimeterM: form.perimeterM,
          capacity: capacityValue,
          typeSpecific: {
            ...typeSpecific,
            zoneTypeKey,
            warehouseTypes: nextWarehouseTypes,
          },
          before,
          after,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Không thể lưu khu vực.");
      window.dispatchEvent(new Event("farm:navigation-loading"));
      window.location.href = `/dashboard/khu-vuc/${zone.id}`;
    } catch (err) {
      savingRef.current = false;
      setLoading(false);
      setError(err instanceof Error ? err.message : "Không thể lưu khu vực.");
    }
  };

  return (
    <section className={styles.overlay} aria-label="Chỉnh sửa khu vực">
      <header className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.kicker}>Chỉnh sửa khu vực</span>
          <h1>{zone.name}</h1>
        </div>
        <ZoneActionMenu context="edit" zoneId={zone.id} zoneStatus={zone.status} backHref={`/dashboard/khu-vuc/${zone.id}`} canWrite />
      </header>

      <div className={styles.body}>
        <div className={styles.editLayout}>
          <div className={styles.formSection}>
            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeaderSmall}>
                <h3>Thông tin chung</h3>
                <p>Đặt tên, trạng thái, mô tả và màu hiển thị cho khu vực.</p>
              </div>
              <div className={styles.formGrid}>
                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label htmlFor="zone-name">Tên khu vực</label>
                    <input id="zone-name" className={styles.input} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="zone-status">Trạng thái</label>
                    <select id="zone-status" className={styles.select} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ZoneStateValue }))}>
                      {ZONE_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="zone-type">Loại khu vực</label>
                  <select id="zone-type" className={styles.select} value={zoneTypeKey} onChange={(e) => setZoneTypeKey(e.target.value as ZoneTypeKey)}>
                    {ZONE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="zone-description">Mô tả</label>
                  <textarea id="zone-description" className={styles.textarea} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <div className={styles.colorRow}>
                  <div className={styles.field}>
                    <label htmlFor="zone-color">Màu hiển thị</label>
                    <div className={styles.colorInputRow}>
                      <input id="zone-color" className={styles.input} value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} />
                      <span className={styles.colorPill} style={{ backgroundColor: form.color }} aria-hidden="true" />
                    </div>
                  </div>
                  <div className={styles.colorSwatches} aria-label="Màu gợi ý">
                    {['#1f7a4a', '#2ca25f', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={styles.colorSwatch}
                        style={{ backgroundColor: color }}
                        onClick={() => setForm((p) => ({ ...p, color }))}
                        aria-label={`Chọn màu ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeaderSmall}>
                <h3>Vị trí và polygon</h3>
                <p>Tâm bản đồ và số liệu vị trí được hiển thị để đối chiếu, không làm thay đổi dữ liệu gốc.</p>
              </div>
              <div className={styles.formGrid}>
                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label htmlFor="zone-latitude">Vĩ độ</label>
                    <input id="zone-latitude" className={styles.input} value={form.latitude} onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="zone-longitude">Kinh độ</label>
                    <input id="zone-longitude" className={styles.input} value={form.longitude} onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))} />
                  </div>
                </div>
                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label htmlFor="zone-area">Diện tích</label>
                    <input id="zone-area" className={styles.input} value={form.areaHa} onChange={(e) => setForm((p) => ({ ...p, areaHa: e.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="zone-perimeter">Chu vi</label>
                    <input id="zone-perimeter" className={styles.input} value={form.perimeterM} onChange={(e) => setForm((p) => ({ ...p, perimeterM: e.target.value }))} />
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeaderSmall}>
                <h3>Thiết lập bản đồ</h3>
                <p>Chọn kiểu bản đồ và mức zoom để xem khu vực rõ hơn.</p>
              </div>
              <div className={styles.twoCols}>
                <div className={styles.field}>
                  <label htmlFor="zone-map-type">Loại bản đồ</label>
                  <select id="zone-map-type" className={styles.select} value={form.mapType} onChange={(e) => setForm((p) => ({ ...p, mapType: e.target.value }))}>
                    {MAP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="zone-zoom">Mức thu phóng</label>
                  <select id="zone-zoom" className={styles.select} value={form.zoomLevel} onChange={(e) => setForm((p) => ({ ...p, zoomLevel: e.target.value }))}>
                    {Array.from({ length: 12 }, (_, i) => 10 + i).map((level) => (
                      <option key={level} value={String(level)}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeaderSmall}>
                <h3>{ZONE_TYPE_INFO[zoneTypeKey].detailTitle}</h3>
                <p>
                  Tùy theo loại khu vực, biểu mẫu chỉnh sửa sẽ ưu tiên các thông tin phù hợp với cách vận hành thực tế.
                </p>
              </div>
              <div className={styles.formGrid}>
                <div className={styles.twoCols}>
                  {typeFields.map((field) => (
                    <div key={field.key} className={styles.field}>
                      <label htmlFor={`zone-type-${field.key}`}>{field.label}</label>
                      <input
                        id={`zone-type-${field.key}`}
                        className={styles.input}
                        type={field.type ?? "text"}
                        step={field.step}
                        value={typeSpecific[field.key] ?? ""}
                        onChange={(e) => setTypeSpecific((current) => ({ ...current, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>
                {zoneTypeKey === "storage" && (
                  <div className={styles.field}>
                    <label>Nhóm lưu trữ trong kho</label>
                    <div className={styles.warehouseTypeChecklist}>
                      {WAREHOUSE_TYPE_OPTIONS.map((option) => (
                        <label key={option.value} className={styles.warehouseTypeOption}>
                          <input
                            type="checkbox"
                            checked={warehouseTypes.includes(option.value)}
                            onChange={() => toggleWarehouseType(option.value)}
                          />
                          <span>
                            <strong>{option.shortLabel}</strong>
                            <small>{option.purpose}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {(zoneTypeKey === "grazing" || zoneTypeKey === "livestock") && (
                  <div className={styles.typeHint}>
                    <strong>Số liệu liên quan</strong>
                    <span>
                      Hiện có {zone.metrics.livestockCount} vật nuôi và {zone.metrics.noteCount} ghi chú liên quan.
                    </span>
                  </div>
                )}
              </div>
            </section>

            <section className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <h3>Dữ liệu hiện tại</h3>
                <p>Đây là phần dữ liệu gốc đang dùng để đối chiếu trước khi lưu.</p>
              </div>
              <div className={styles.summaryItem}><span>Tên</span><strong>{zone.name}</strong></div>
              <div className={styles.summaryItem}><span>Loại</span><strong>{zone.typeLabel}</strong></div>
              <div className={styles.summaryItem}><span>Trạng thái</span><strong>{zone.statusLabel}</strong></div>
              <div className={styles.summaryItem}><span>Diện tích</span><strong>{zone.areaHa ? `${zone.areaHa.toFixed(2)} ha` : "Chưa có"}</strong></div>
            </section>
          </div>

          <aside className={`${styles.stickyPreview} ${styles.previewCard}`}>
            <section className={styles.panelCard}>
              <div className={styles.panelTitle}>
                <div>
                  <h3>Xem trước bản đồ</h3>
                  <p>Giữ nguyên polygon hiện tại trên nền bản đồ thật.</p>
                </div>
                <span className={styles.badge}>{points.length} điểm</span>
              </div>
              <div className={styles.mapBox}>{mapPreview}</div>
            </section>

            <section className={styles.panelCard}>
              <div className={styles.panelTitle}>
                <div>
                  <h3>Thông tin nhanh</h3>
                  <p>Tổng hợp dữ liệu trước khi lưu thay đổi.</p>
                </div>
              </div>
              <div className={styles.previewMeta}>
                <div className={styles.previewRow}><span>Tên khu vực</span><strong>{form.name || zone.name}</strong></div>
                <div className={styles.previewRow}><span>Trạng thái</span><strong>{form.status}</strong></div>
                <div className={styles.previewRow}><span>Màu</span><strong>{form.color}</strong></div>
                <div className={styles.previewRow}><span>Polygon</span><strong>{points.length}</strong></div>
              </div>
            </section>
          </aside>
        </div>

        {error && <p className={styles.errorText}>{error}</p>}
      </div>

      <footer className={styles.footer}>
        <div className={styles.buttonBar}>
          <Link
            href={`/dashboard/khu-vuc/${zone.id}`}
            className={styles.secondary}
            aria-disabled={loading}
            onClick={(event) => {
              if (loading) event.preventDefault();
            }}
          >
            Hủy
          </Link>
          <button type="button" className={styles.primary} onClick={onSave} disabled={!canSave || loading}>
            {loading ? <CowLoading label="Đang tải..." /> : "Lưu thay đổi"}
          </button>
        </div>
      </footer>
      {loading && (
        <div className={styles.savingOverlay} aria-live="polite" aria-label="Đang lưu thay đổi khu vực">
          <CowLoading label="Đang lưu thay đổi..." />
        </div>
      )}
    </section>
  );
}
