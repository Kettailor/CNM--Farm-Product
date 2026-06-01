"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import NewGroupWizard, { type LivestockZoneOption } from "./new-group-wizard";
import styles from "./page.module.css";

type ToolItem = {
  label: string;
  tone: "neutral" | "green" | "amber" | "blue" | "sky";
  icon: "dashboard" | "add" | "treatment" | "record" | "settings";
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
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7.8 7.8 0 0 0-2.1-1.2L14 3h-4l-.4 2.7c-.8.3-1.5.7-2.1 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1c.6.5 1.3.9 2.1 1.2L10 21h4l.4-2.7c.8-.3 1.5-.7 2.1-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
        </svg>
      );
  }
}

export default function LivestockPageTools({
  zones,
  canWrite,
  showDeceasedGroups,
  showDeceasedAnimals,
}: {
  zones: LivestockZoneOption[];
  canWrite: boolean;
  showDeceasedGroups: boolean;
  showDeceasedAnimals: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    { label: "Cài đặt hiển thị", tone: "sky", icon: "settings", onClick: () => setSettingsOpen(true) },
  ];
  const visibleTools = tools.filter((tool) => {
    if (tool.icon === "settings") return true;
    if (tool.href === "/dashboard/vat-nuoi") return true;
    return canWrite;
  });
  const settingEnabled = (key: string, defaultValue = true) => {
    const value = searchParams.get(key);
    if (value == null) return defaultValue;
    return value !== "0";
  };
  const updateSetting = (key: string, enabled: boolean, defaultValue = true) => {
    const next = new URLSearchParams(searchParams.toString());
    if (enabled === defaultValue) next.delete(key);
    else next.set(key, enabled ? "1" : "0");
    const query = next.toString();
    window.dispatchEvent(new Event("farm:navigation-loading"));
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const toggleParam = (key: string, enabled: boolean) => {
    const next = new URLSearchParams(searchParams.toString());
    if (enabled) next.set(key, "1");
    else next.delete(key);
    const query = next.toString();
    window.dispatchEvent(new Event("farm:navigation-loading"));
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const ToggleRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) => (
    <label className={styles.settingsRow}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className={styles.settingsSwitch} data-checked={checked ? "true" : "false"} aria-hidden="true" />
    </label>
  );

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
            {visibleTools.map((tool) => (
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
      {settingsOpen && (
        <div className={styles.settingsBackdrop} role="presentation" onClick={() => setSettingsOpen(false)}>
          <aside className={styles.settingsPanel} role="dialog" aria-modal="true" aria-label="Cài đặt hiển thị vật nuôi" onClick={(event) => event.stopPropagation()}>
            <div className={styles.settingsHeader}>
              <strong>Cài đặt hiển thị</strong>
              <button type="button" aria-label="Đóng cài đặt" onClick={() => setSettingsOpen(false)}>×</button>
            </div>
            <div className={styles.settingsSection}>
              <h3>Tổng quan</h3>
              <ToggleRow label="Thẻ tóm tắt" checked={settingEnabled("hien-tom-tat")} onChange={(value) => updateSetting("hien-tom-tat", value)} />
              <ToggleRow label="Thẻ nhóm vật nuôi" checked={settingEnabled("hien-the-nhom")} onChange={(value) => updateSetting("hien-the-nhom", value)} />
              <ToggleRow label="Bảng nhóm" checked={settingEnabled("hien-bang-nhom")} onChange={(value) => updateSetting("hien-bang-nhom", value)} />
              <ToggleRow label="Bản đồ" checked={settingEnabled("hien-ban-do")} onChange={(value) => updateSetting("hien-ban-do", value)} />
            </div>
            <div className={styles.settingsSection}>
              <h3>Tử vong</h3>
              <ToggleRow label="Hiện nhóm tử vong" checked={showDeceasedGroups} onChange={(value) => toggleParam("hien-nhom-tu-vong", value)} />
              <ToggleRow label="Hiện cá thể tử vong" checked={showDeceasedAnimals} onChange={(value) => toggleParam("hien-ca-the-tu-vong", value)} />
            </div>
          </aside>
        </div>
      )}
      {canWrite && <NewGroupWizard open={newGroupOpen} zones={zones} onClose={() => setNewGroupOpen(false)} />}
    </div>
  );
}
