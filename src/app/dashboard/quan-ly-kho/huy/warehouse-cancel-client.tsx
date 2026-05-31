"use client";

import { useMemo, useState, type CSSProperties } from "react";
import CowLoading from "@/components/cow-loading";
import { WAREHOUSE_STATUS_LABELS, getWarehouseTypeOption, type WarehouseItem, type WarehouseZone } from "@/lib/warehouse-types";
import WarehouseIcon, { iconForType } from "../warehouse-icons";
import WarehouseTools from "../warehouse-tools";
import styles from "../page.module.css";

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

async function readApiResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Không thể hủy mục kho.");
  return data as { message?: string; item?: WarehouseItem };
}

export default function WarehouseCancelClient({ farmName, items, zones }: { farmName: string; items: WarehouseItem[]; zones: WarehouseZone[] }) {
  const [localItems, setLocalItems] = useState(items);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const hasWarehouseZones = zones.length > 0;
  const activeItems = useMemo(() => localItems.filter((item) => item.status !== "da_huy"), [localItems]);
  const canceledItems = useMemo(() => localItems.filter((item) => item.status === "da_huy"), [localItems]);

  const cancelItem = async (item: WarehouseItem) => {
    const accepted = window.confirm(`Chuyển "${item.name}" sang trạng thái hủy?`);
    if (!accepted) return;

    setBusyId(item.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/du-lieu/kho/${item.id}`, { method: "DELETE" });
      const data = await readApiResponse(response);
      if (!data.item) throw new Error("API không trả về vật tư kho.");
      setLocalItems((current) => current.map((entry) => (entry.id === data.item?.id ? data.item : entry)));
      setMessage(data.message ?? "Đã chuyển sang trạng thái hủy.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể hủy mục kho.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.topBar}>
        <div className={styles.titleBlock}>
          <span className={styles.titleIcon}><WarehouseIcon name="trash" /></span>
          <div>
            <p className={styles.eyebrow}>Tác vụ kho</p>
            <h1>Hủy danh mục</h1>
            <span>{farmName}</span>
          </div>
        </div>
        <WarehouseTools />
      </section>

      <section>
        <article className={styles.cancelPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Hủy danh mục</p>
              <h2>Danh sách danh mục đang hoạt động</h2>
            </div>
            <div className={styles.cancelSummary} aria-label="Thống kê hủy danh mục">
              <span><b>{formatNumber(activeItems.length)}</b> có thể hủy</span>
              <span><b>{formatNumber(canceledItems.length)}</b> đã hủy</span>
            </div>
          </div>
          {!hasWarehouseZones && <div className={styles.emptyState}>Vui lòng thiết lập khu vực dành cho kho trước khi thao tác.</div>}
          {message && <p className={styles.formMessage}>{message}</p>}
          <div className={styles.cancelList}>
            {activeItems.map((item) => {
              const option = getWarehouseTypeOption(item.type);
              return (
                <div key={item.id} className={styles.cancelItem} style={{ "--accent": option.accent } as CSSProperties}>
                  <span className={styles.typeIcon}><WarehouseIcon name={iconForType(item.type)} /></span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.code} · {option.shortLabel} · {formatNumber(item.quantity)} {item.unit}</small>
                  </div>
                  <span className={styles.statusPill} data-status={item.status}>{WAREHOUSE_STATUS_LABELS[item.status]}</span>
                  <button type="button" className={styles.dangerButton} onClick={() => cancelItem(item)} disabled={busyId === item.id}>
                    <span><WarehouseIcon name="trash" /></span>
                    {busyId === item.id ? <CowLoading label="Đang tải..." /> : "Hủy"}
                  </button>
                </div>
              );
            })}
            {activeItems.length === 0 && <div className={styles.emptyState}>Không còn mục kho đang hoạt động để hủy.</div>}
          </div>
        </article>
      </section>
    </div>
  );
}
