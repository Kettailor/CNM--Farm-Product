"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NewGroupWizard, { type LivestockZoneOption } from "./new-group-wizard";
import styles from "./page.module.css";

type ToolItem = {
  label: string;
  tone: "neutral" | "green" | "amber" | "blue" | "sky";
  icon: "dashboard" | "add" | "treatment" | "record" | "reset" | "settings";
  onClick?: () => void;
  href?: string;
};

function ToolIcon({ name }: { name: ToolItem["icon"] }) {
  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 7 5 12l5 5" />
          <path d="M5 12h14" />
        </svg>
      );
    case "add":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "treatment":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 18 10-10 2 2L8 20H6v-2Z" />
          <path d="m14 8 2-2 2 2-2 2" />
          <path d="M8 10h.01M10 8h.01M12 6h.01" />
        </svg>
      );
    case "record":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4h10v16H7z" />
          <path d="M10 8h4M10 12h4M10 16h2" />
        </svg>
      );
    case "reset":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7h12" />
          <path d="M9 7V5h6v2" />
          <path d="m9 10 .6 9h4.8l.6-9" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7.8 7.8 0 0 0-2.1-1.2L14 3h-4l-.4 2.7c-.8.3-1.5.7-2.1 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1c.6.5 1.3.9 2.1 1.2L10 21h4l.4-2.7c.8-.3 1.5-.7 2.1-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
        </svg>
      );
  }
}

export default function LivestockPageTools({ zones }: { zones: LivestockZoneOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

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

  const tools: ToolItem[] = [
    { label: "Trang tổng quan", tone: "neutral", icon: "dashboard", href: "/dashboard/vat-nuoi" },
    { label: "Nhóm mới", tone: "green", icon: "add", onClick: () => setNewGroupOpen(true) },
    { label: "Điều trị", tone: "amber", icon: "treatment", href: "/dashboard/vat-nuoi/dieu-tri" },
    { label: "Sự kiện", tone: "blue", icon: "record", href: "/dashboard/vat-nuoi/su-kien" },
    { label: "Đặt lại", tone: "sky", icon: "reset", href: "/dashboard/vat-nuoi" },
    { label: "Cài đặt", tone: "sky", icon: "settings", href: "/dashboard/settings" },
  ];

  return (
    <div className={styles.tools} ref={rootRef}>
      <button type="button" className={styles.backButton} onClick={() => router.back()}>
        <span className={styles.buttonIcon}><ToolIcon name="dashboard" /></span>
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
          <span className={styles.buttonIcon}><ToolIcon name="treatment" /></span>
          <span>Tác vụ</span>
          <span className={styles.chevron}>▾</span>
        </button>
        {open && (
          <div className={styles.dropdown} role="menu">
            {tools.map((tool) => (
              <button
                type="button"
                key={tool.label}
                role="menuitem"
                className={styles.dropdownItem}
                data-tone={tool.tone}
                onClick={() => {
                  setOpen(false);
                  if (tool.onClick) {
                    tool.onClick();
                    return;
                  }
                  if (tool.href) {
                    window.dispatchEvent(new Event("farm:navigation-loading"));
                    router.push(tool.href);
                  }
                }}
              >
                <span className={styles.menuIcon}><ToolIcon name={tool.icon} /></span>
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <NewGroupWizard open={newGroupOpen} zones={zones} onClose={() => setNewGroupOpen(false)} />
    </div>
  );
}
