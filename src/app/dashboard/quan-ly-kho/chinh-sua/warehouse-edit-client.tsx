"use client";

import { useMemo, useState } from "react";
import { getWarehouseTypeOption, type WarehouseItem, type WarehouseZone } from "@/lib/warehouse-types";
import WarehouseForm from "../warehouse-form";
import WarehouseIcon, { iconForType } from "../warehouse-icons";
import WarehouseTools from "../warehouse-tools";
import styles from "../page.module.css";

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

export default function WarehouseEditClient({ farmName, items, zones }: { farmName: string; items: WarehouseItem[]; zones: WarehouseZone[] }) {
  const activeItems = useMemo(() => items.filter((item) => item.status !== "da_huy"), [items]);
  const [selectedId, setSelectedId] = useState(activeItems[0]?.id ?? "");
  const [localItems, setLocalItems] = useState(activeItems);
  const selected = localItems.find((item) => item.id === selectedId) ?? localItems[0] ?? null;

  return (
    <div className={styles.page}>
      <section className={styles.topBar}>
        <div className={styles.titleBlock}>
          <span className={styles.titleIcon}><WarehouseIcon name="edit" /></span>
          <div>
            <p className={styles.eyebrow}>Tác vụ kho</p>
            <h1>Sửa danh mục</h1>
            <span>{farmName}</span>
          </div>
        </div>
        <WarehouseTools />
      </section>

      <section className={styles.taskLayout}>
        <aside className={styles.selectorPanel}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Chỉnh sửa</p>
              <h2>Chọn mục cần sửa</h2>
            </div>
          </div>
          <div className={styles.selectorList}>
            {localItems.map((item) => {
              const option = getWarehouseTypeOption(item.type);
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`${styles.selectorItem} ${selected?.id === item.id ? styles.selectorItemActive : ""}`}
                  style={{ "--accent": option.accent } as React.CSSProperties}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className={styles.menuIcon}><WarehouseIcon name={iconForType(item.type)} /></span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.code} · {formatNumber(item.quantity)} {item.unit}</small>
                  </span>
                </button>
              );
            })}
            {localItems.length === 0 && <div className={styles.emptyState}>Chưa có mục kho để chỉnh sửa.</div>}
          </div>
        </aside>

        {selected ? (
          <WarehouseForm
            key={selected.id}
            item={selected}
            zones={zones}
            onSaved={(item) => {
              setLocalItems((current) => current.map((entry) => (entry.id === item.id ? item : entry)));
              setSelectedId(item.id);
            }}
          />
        ) : (
          <div className={styles.formPanel}>
            <div className={styles.emptyState}>Hãy thêm mục kho trước khi chỉnh sửa.</div>
          </div>
        )}
      </section>
    </div>
  );
}
