"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";

function Icon({ name }: { name: "settings" | "add" }) {
  if (name === "add") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7.8 7.8 0 0 0-2.1-1.2L14 3h-4l-.4 2.7c-.8.3-1.5.7-2.1 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1c.6.5 1.3.9 2.1 1.2L10 21h4l.4-2.7c.8-.3 1.5-.7 2.1-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
    </svg>
  );
}

export default function ChemicalProfileActions({ canWrite }: { canWrite: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settingsOpen]);

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

  const ToggleRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) => (
    <label className={styles.settingsRow}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className={styles.settingsSwitch} data-checked={checked ? "true" : "false"} aria-hidden="true" />
    </label>
  );

  return (
    <div className={styles.profileActions} ref={rootRef}>
      {canWrite && (
        <button type="button" className={styles.actionButton} onClick={() => router.push("/dashboard/quan-ly-kho/tao-moi")}>
          <span><Icon name="add" /></span>
          Thêm hóa chất
        </button>
      )}
      <button type="button" className={styles.secondaryButton} onClick={() => setSettingsOpen(true)}>
        <span><Icon name="settings" /></span>
        Cài đặt hiển thị
      </button>
      {settingsOpen && (
        <div className={styles.settingsBackdrop} role="presentation" onClick={() => setSettingsOpen(false)}>
          <aside className={styles.settingsPanel} role="dialog" aria-modal="true" aria-label="Cài đặt hiển thị hồ sơ hóa chất" onClick={(event) => event.stopPropagation()}>
            <div className={styles.settingsHeader}>
              <strong>Cài đặt hiển thị</strong>
              <button type="button" aria-label="Đóng cài đặt" onClick={() => setSettingsOpen(false)}>×</button>
            </div>
            <div className={styles.settingsSection}>
              <h3>Hồ sơ hóa chất</h3>
              <ToggleRow label="Thẻ tổng quan" checked={settingEnabled("hien-tong-quan")} onChange={(value) => updateSetting("hien-tong-quan", value)} />
              <ToggleRow label="Bảng sản phẩm" checked={settingEnabled("hien-san-pham")} onChange={(value) => updateSetting("hien-san-pham", value)} />
              <ToggleRow label="Nhật ký sử dụng" checked={settingEnabled("hien-nhat-ky")} onChange={(value) => updateSetting("hien-nhat-ky", value)} />
              <ToggleRow label="Bản đồ khu vực" checked={settingEnabled("hien-ban-do")} onChange={(value) => updateSetting("hien-ban-do", value)} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
