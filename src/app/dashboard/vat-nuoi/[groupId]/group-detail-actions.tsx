"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";

type ActionTone = "neutral" | "green" | "amber" | "blue" | "red" | "disabled";
type ActionIcon = "back" | "dashboard" | "edit" | "treatment" | "record" | "move" | "group" | "split" | "join" | "settings" | "qr" | "deceased";

type ActionItem = {
  label: string;
  icon: ActionIcon;
  tone: ActionTone;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

function ActionIcon({ name }: { name: ActionIcon }) {
  switch (name) {
    case "back":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7 5 12l5 5" /><path d="M5 12h14" /></svg>;
    case "dashboard":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8.5Z" /></svg>;
    case "edit":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 16 10-10 3 3L8 19H5v-3Z" /><path d="m13 8 3 3" /></svg>;
    case "treatment":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 18 10-10 2 2L8 20H6v-2Z" /><path d="m14 8 2-2 2 2-2 2" /></svg>;
    case "record":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16H7z" /><path d="M10 8h4M10 12h4M10 16h2" /></svg>;
    case "move":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></svg>;
    case "group":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
    case "deceased":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 3 20h18L12 4Z" /><path d="M12 9v5M12 17h.01" /></svg>;
    case "split":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h7" /><path d="M12 6v12" /><path d="m15 8 4-4M15 16l4 4" /></svg>;
    case "join":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 6 6-6 6" /><path d="m19 5-6 6 6 6" /></svg>;
    case "settings":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7.8 7.8 0 0 0-2.1-1.2L14 3h-4l-.4 2.7c-.8.3-1.5.7-2.1 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1c.6.5 1.3.9 2.1 1.2L10 21h4l.4-2.7c.8-.3 1.5-.7 2.1-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h2v2h-2zM18 14h2v6h-2zM14 18h2v2h-2z" /></svg>;
  }
}

function isWriteAction(item: ActionItem) {
  return Boolean(
    item.href?.includes("hanh-dong=chinh-sua") ||
      item.href?.includes("hanh-dong=di-chuyen") ||
      item.href?.includes("hanh-dong=tach-nhom") ||
      item.href?.includes("hanh-dong=ghep-nhom") ||
      item.href?.includes("/vat-nuoi/dieu-tri") ||
      item.href?.includes("/vat-nuoi/su-kien")
  );
}

export default function GroupDetailActions({
  groupId,
  canWrite,
  showDeceasedAnimals,
}: {
  groupId: string;
  canWrite: boolean;
  showDeceasedAnimals: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const actionGroups: ActionItem[][] = [
    [{ label: "Bảng điều khiển", icon: "dashboard", tone: "neutral", href: "/dashboard" }],
    [
      { label: "Chỉnh sửa", icon: "edit", tone: "green", href: `/dashboard/vat-nuoi/${groupId}?hanh-dong=chinh-sua` },
      { label: "Sổ khám bệnh", icon: "record", tone: "blue", href: `/dashboard/vat-nuoi/${groupId}/so-kham-benh` },
      { label: "Điều trị", icon: "treatment", tone: "amber", href: `/dashboard/vat-nuoi/dieu-tri?groupId=${groupId}` },
      { label: "Sự kiện", icon: "record", tone: "blue", href: `/dashboard/vat-nuoi/su-kien?groupId=${groupId}` },
      { label: "Xuất PDF mã QR", icon: "qr", tone: "green", href: `/dashboard/vat-nuoi/${groupId}/qr-pdf` },
    ],
    [
      { label: "Di chuyển vật nuôi", icon: "move", tone: "amber", href: `/dashboard/vat-nuoi/su-kien?groupId=${groupId}&loai=move` },
      { label: "Vật nuôi tử vong", icon: "deceased", tone: "red", href: `/dashboard/vat-nuoi/su-kien?groupId=${groupId}&loai=adjustment` },
      { label: "Tách nhóm", icon: "split", tone: "amber", href: `/dashboard/vat-nuoi/su-kien?groupId=${groupId}&loai=grouping&kieu=tach_nhom` },
      { label: "Ghép nhóm", icon: "join", tone: "amber", href: `/dashboard/vat-nuoi/su-kien?groupId=${groupId}&loai=grouping&kieu=ghep_nhom` },
    ],
    [
      { label: "Cài đặt hiển thị", icon: "settings", tone: "blue", onClick: () => setSettingsOpen(true) },
    ],
  ];

  const runAction = (item: ActionItem) => {
    if (item.disabled) return;
    if (!canWrite && isWriteAction(item)) return;
    setOpen(false);
    if (item.onClick) {
      item.onClick();
      return;
    }
    if (item.href) {
      window.dispatchEvent(new Event("farm:navigation-loading"));
      router.push(item.href);
    }
  };
  const visibleActionGroups = actionGroups
    .map((group) => group.filter((item) => canWrite || !isWriteAction(item)))
    .filter((group) => group.length > 0);
  const settingEnabled = (key: string, defaultValue = true) => {
    const value = searchParams.get(key);
    if (value == null) return defaultValue;
    return value !== "0";
  };
  const updateSetting = (key: string, enabled: boolean, defaultValue = true) => {
    const next = new URLSearchParams(searchParams.toString());
    if (enabled === defaultValue) next.delete(key);
    else next.set(key, enabled ? "1" : "0");
    next.delete("hanh-dong");
    const query = next.toString();
    window.dispatchEvent(new Event("farm:navigation-loading"));
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const toggleParam = (key: string, enabled: boolean) => {
    const next = new URLSearchParams(searchParams.toString());
    if (enabled) next.set(key, "1");
    else next.delete(key);
    next.delete("hanh-dong");
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
    <div className={styles.detailTools} ref={rootRef}>
      <button type="button" className={styles.backButton} onClick={() => {
        window.dispatchEvent(new Event("farm:navigation-loading"));
        router.push("/dashboard/vat-nuoi");
      }}>
        <span><ActionIcon name="back" /></span>
        Quay lại
      </button>
      <div className={styles.actionMenu}>
        <button type="button" className={styles.actionButton} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <span><ActionIcon name="edit" /></span>
          Tác vụ
          <span className={styles.chevron}>▾</span>
        </button>
        {open && (
          <div className={styles.dropdown} role="menu">
            {visibleActionGroups.map((group, groupIndex) => (
              <div key={groupIndex} className={styles.dropdownSection}>
                {group.map((item) => (
                  <button
                    type="button"
                    key={item.label}
                    role="menuitem"
                    className={styles.dropdownItem}
                    data-tone={item.tone}
                    disabled={item.disabled}
                    onClick={() => runAction(item)}
                  >
                    <span className={styles.menuIcon}><ActionIcon name={item.icon} /></span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      {settingsOpen && (
        <div className={styles.settingsBackdrop} role="presentation" onClick={() => setSettingsOpen(false)}>
          <aside className={styles.settingsPanel} role="dialog" aria-modal="true" aria-label="Cài đặt hiển thị nhóm vật nuôi" onClick={(event) => event.stopPropagation()}>
            <div className={styles.settingsHeader}>
              <strong>Cài đặt hiển thị</strong>
              <button type="button" aria-label="Đóng cài đặt" onClick={() => setSettingsOpen(false)}>×</button>
            </div>
            <div className={styles.settingsSection}>
              <h3>Chi tiết nhóm</h3>
              <ToggleRow label="Phần đầu nhóm" checked={settingEnabled("hien-dau-nhom")} onChange={(value) => updateSetting("hien-dau-nhom", value)} />
              <ToggleRow label="Thẻ tóm tắt" checked={settingEnabled("hien-tom-tat")} onChange={(value) => updateSetting("hien-tom-tat", value)} />
              <ToggleRow label="Hồ sơ nhóm" checked={settingEnabled("hien-ho-so")} onChange={(value) => updateSetting("hien-ho-so", value)} />
              <ToggleRow label="Tăng trưởng" checked={settingEnabled("hien-tang-truong")} onChange={(value) => updateSetting("hien-tang-truong", value)} />
              <ToggleRow label="Sổ khám bệnh" checked={settingEnabled("hien-so-kham")} onChange={(value) => updateSetting("hien-so-kham", value)} />
              <ToggleRow label="Bảng cá thể" checked={settingEnabled("hien-bang-ca-the")} onChange={(value) => updateSetting("hien-bang-ca-the", value)} />
              <ToggleRow label="Nhật ký sự kiện" checked={settingEnabled("hien-nhat-ky")} onChange={(value) => updateSetting("hien-nhat-ky", value)} />
              <ToggleRow label="Bản đồ" checked={settingEnabled("hien-ban-do")} onChange={(value) => updateSetting("hien-ban-do", value)} />
            </div>
            <div className={styles.settingsSection}>
              <h3>Tử vong</h3>
              <ToggleRow label="Hiện cá thể tử vong" checked={showDeceasedAnimals} onChange={(value) => toggleParam("hien-ca-the-tu-vong", value)} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
