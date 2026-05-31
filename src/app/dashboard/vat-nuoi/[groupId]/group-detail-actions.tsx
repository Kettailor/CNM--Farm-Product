"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

type ActionTone = "neutral" | "green" | "amber" | "blue" | "red" | "disabled";
type ActionIcon = "back" | "dashboard" | "edit" | "treatment" | "record" | "move" | "group" | "split" | "join" | "delete" | "reset" | "settings" | "qr";

type ActionItem = {
  label: string;
  icon: ActionIcon;
  tone: ActionTone;
  href?: string;
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
    case "split":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h7" /><path d="M12 6v12" /><path d="m15 8 4-4M15 16l4 4" /></svg>;
    case "join":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 6 6-6 6" /><path d="m19 5-6 6 6 6" /></svg>;
    case "delete":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12" /><path d="M9 7V5h6v2" /><path d="m9 10 .6 9h4.8l.6-9" /></svg>;
    case "reset":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v6h6" /><path d="M5 11a7 7 0 1 0 2-5" /></svg>;
    case "settings":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7.8 7.8 0 0 0-2.1-1.2L14 3h-4l-.4 2.7c-.8.3-1.5.7-2.1 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1c.6.5 1.3.9 2.1 1.2L10 21h4l.4-2.7c.8-.3 1.5-.7 2.1-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h2v2h-2zM18 14h2v6h-2zM14 18h2v2h-2z" /></svg>;
  }
}

export default function GroupDetailActions({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
      { label: "Điều trị", icon: "treatment", tone: "amber", href: `/dashboard/vat-nuoi/dieu-tri?groupId=${groupId}` },
      { label: "Sự kiện", icon: "record", tone: "blue", href: `/dashboard/vat-nuoi/su-kien?groupId=${groupId}` },
      { label: "Xuất PDF mã QR", icon: "qr", tone: "green", href: `/dashboard/vat-nuoi/${groupId}/qr-pdf` },
    ],
    [
      { label: "Di chuyển vật nuôi", icon: "move", tone: "amber", href: `/dashboard/vat-nuoi/${groupId}?hanh-dong=di-chuyen` },
      { label: "Cập nhật số lượng", icon: "group", tone: "blue", href: `/dashboard/vat-nuoi/${groupId}?hanh-dong=cap-nhat-so-luong` },
      { label: "Tách nhóm", icon: "split", tone: "amber", href: `/dashboard/vat-nuoi/${groupId}?hanh-dong=tach-nhom` },
      { label: "Ghép nhóm", icon: "join", tone: "amber", href: `/dashboard/vat-nuoi/${groupId}?hanh-dong=ghep-nhom` },
    ],
    [{ label: "Xóa", icon: "delete", tone: "disabled", disabled: true }],
    [
      { label: "Đặt lại", icon: "reset", tone: "blue", href: `/dashboard/vat-nuoi/${groupId}?hanh-dong=dat-lai` },
      { label: "Cài đặt", icon: "settings", tone: "blue", href: "/dashboard/settings" },
    ],
  ];

  const runAction = (item: ActionItem) => {
    if (item.disabled) return;
    setOpen(false);
    if (item.href) {
      window.dispatchEvent(new Event("farm:navigation-loading"));
      router.push(item.href);
    }
  };

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
            {actionGroups.map((group, groupIndex) => (
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
    </div>
  );
}
