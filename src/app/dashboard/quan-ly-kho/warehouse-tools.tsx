"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import WarehouseIcon, { type WarehouseIconName } from "./warehouse-icons";
import styles from "./page.module.css";

type ToolItem = {
  label: string;
  href?: string;
  action?: "open-settings";
  icon: WarehouseIconName;
  tone: "neutral" | "green" | "blue" | "amber" | "red";
};

const TOOLS: ToolItem[] = [
  { label: "Cài đặt hiển thị", action: "open-settings", icon: "settings", tone: "blue" },
  { label: "Hồ sơ hóa chất", href: "/dashboard/ho-so-hoa-chat", icon: "warning", tone: "amber" },
  { label: "Thêm danh mục", href: "/dashboard/quan-ly-kho/tao-moi", icon: "plus", tone: "green" },
  { label: "Sửa danh mục", href: "/dashboard/quan-ly-kho/chinh-sua", icon: "edit", tone: "blue" },
  { label: "Hủy danh mục", href: "/dashboard/quan-ly-kho/huy", icon: "trash", tone: "red" },
];

export default function WarehouseTools({ canWrite = false, onOpenSettings }: { canWrite?: boolean; onOpenSettings?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tools = canWrite ? TOOLS : TOOLS.filter((tool) => tool.action === "open-settings" || tool.href === "/dashboard/ho-so-hoa-chat");

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.tools} ref={rootRef}>
      <button type="button" className={styles.backButton} onClick={() => router.back()}>
        <span className={styles.buttonIcon}><WarehouseIcon name="back" /></span>
        <span>Quay lại</span>
      </button>
      <div className={styles.actionMenu}>
        <button
          type="button"
          className={styles.actionButton}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.buttonIcon}><WarehouseIcon name="menu" /></span>
          <span>Tác vụ</span>
          <span className={styles.chevron}>▾</span>
        </button>
        {open && (
          <div className={styles.dropdown} role="menu">
            {tools.map((tool) => (
              <button
                type="button"
                key={tool.href ?? tool.action}
                role="menuitem"
                className={styles.dropdownItem}
                data-tone={tool.tone}
                onClick={() => {
                  setOpen(false);
                  if (tool.action === "open-settings") {
                    onOpenSettings?.();
                    return;
                  }
                  if (!tool.href) return;
                  window.dispatchEvent(new Event("farm:navigation-loading"));
                  router.push(tool.href);
                }}
              >
                <span className={styles.menuIcon}><WarehouseIcon name={tool.icon} /></span>
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
