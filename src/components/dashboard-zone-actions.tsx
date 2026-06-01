"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard-zone-actions.module.css";

type ZoneActionContext = "overview" | "detail" | "edit" | "create";
type ActionTone = "neutral" | "green" | "amber" | "blue" | "red" | "disabled";
type ActionIcon =
  | "back"
  | "dashboard"
  | "add"
  | "view"
  | "edit"
  | "map"
  | "record"
  | "move"
  | "delete"
  | "reset"
  | "settings";

type ActionItem = {
  label: string;
  icon: ActionIcon;
  tone: ActionTone;
  href?: string;
  action?: "cancel-zone" | "restore-zone" | "open-settings";
  disabled?: boolean;
};

type Props = {
  context: ZoneActionContext;
  zoneId?: string;
  backHref?: string;
  zoneStatus?: string | null;
  onOpenSettings?: () => void;
  canWrite?: boolean;
  canOpenSettings?: boolean;
};

function Icon({ name }: { name: ActionIcon }) {
  switch (name) {
    case "back":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7 5 12l5 5" /><path d="M5 12h14" /></svg>;
    case "dashboard":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8.5Z" /></svg>;
    case "add":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
    case "view":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
    case "edit":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 16 10-10 3 3L8 19H5v-3Z" /><path d="m13 8 3 3" /></svg>;
    case "map":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" /><path d="M9 4v14M15 6v14" /></svg>;
    case "record":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16H7z" /><path d="M10 8h4M10 12h4M10 16h2" /></svg>;
    case "move":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></svg>;
    case "delete":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12" /><path d="M9 7V5h6v2" /><path d="m9 10 .6 9h4.8l.6-9" /></svg>;
    case "reset":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v6h6" /><path d="M5 11a7 7 0 1 0 2-5" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7.8 7.8 0 0 0-2.1-1.2L14 3h-4l-.4 2.7c-.8.3-1.5.7-2.1 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1c.6.5 1.3.9 2.1 1.2L10 21h4l.4-2.7c.8-.3 1.5-.7 2.1-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" /></svg>;
  }
}

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[_-]+/g, " ")
    .trim();
}

function isCancelledStatus(value: string | null | undefined) {
  const normalized = normalizeStatus(value);
  return normalized.includes("da huy") || normalized.includes("huy") || normalized.includes("cancel");
}

function actionGroups(context: ZoneActionContext, zoneId?: string, zoneStatus?: string | null): ActionItem[][] {
  const detailHref = zoneId ? `/dashboard/khu-vuc/${zoneId}` : "/dashboard/khu-vuc";
  const editHref = zoneId ? `/dashboard/khu-vuc/${zoneId}/chinh-sua` : "/dashboard/khu-vuc";
  const cancelled = isCancelledStatus(zoneStatus);

  const base: ActionItem[][] = [
    [{ label: "Bảng điều khiển", icon: "dashboard", tone: "neutral", href: "/dashboard" }],
    [
      { label: "Tạo khu vực mới", icon: "add", tone: "green", href: "/dashboard/khu-vuc/tao-moi" },
      { label: "Bản đồ trang trại", icon: "map", tone: "blue", href: "/dashboard/map" },
    ],
  ];

  if (context === "overview") {
    return [
      ...base,
      [
        { label: "Làm mới danh sách", icon: "reset", tone: "blue", href: "/dashboard/khu-vuc" },
        { label: "Cài đặt hiển thị", icon: "settings", tone: "blue", action: "open-settings" },
      ],
    ];
  }

  if (context === "create") {
    return [
      ...base,
      [
        { label: "Quản lý khu vực", icon: "view", tone: "blue", href: "/dashboard/khu-vuc" },
      ],
    ];
  }

  return [
    ...base,
    [
      { label: "Xem chi tiết", icon: "view", tone: "blue", href: detailHref },
      { label: "Chỉnh sửa", icon: "edit", tone: "green", href: editHref },
      { label: "Ghi chú khu vực", icon: "record", tone: "blue", href: `${detailHref}?hanh-dong=ghi-chu` },
    ],
    [
      { label: "Di chuyển / cập nhật polygon", icon: "move", tone: "amber", href: `${editHref}?hanh-dong=polygon` },
      cancelled
        ? { label: "Bật lại khu vực", icon: "reset", tone: "green", action: "restore-zone" }
        : { label: "Hủy khu vực", icon: "delete", tone: "red", action: "cancel-zone" },
    ],
    [
      { label: "Cài đặt trang trại", icon: "settings", tone: "blue", href: "/dashboard/settings" },
    ],
  ];
}

function isWriteAction(item: ActionItem) {
  return Boolean(
    item.href?.includes("/tao-moi") ||
      item.href?.includes("/chinh-sua") ||
      item.action === "cancel-zone" ||
      item.action === "restore-zone"
  );
}

export default function ZoneActionMenu({ context, zoneId, backHref, zoneStatus, onOpenSettings, canWrite = false, canOpenSettings = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const resolvedBackHref = backHref ?? (context === "overview" ? "/dashboard" : "/dashboard/khu-vuc");

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

  const runAction = async (item: ActionItem) => {
    if (item.disabled || busy) return;
    if (!canWrite && isWriteAction(item)) return;
    setOpen(false);
    if (item.action === "open-settings") {
      onOpenSettings?.();
      return;
    }
    if (item.action === "cancel-zone" || item.action === "restore-zone") {
      if (!zoneId) return;
      const isRestore = item.action === "restore-zone";
      const confirmed = window.confirm(
        isRestore
          ? "Bật lại khu vực này? Khu vực sẽ xuất hiện lại trong các danh sách vận hành."
          : "Hủy khu vực này? Khu vực sẽ được chuyển sang trạng thái Đã hủy và chỉ có thể xem lại khi bật tùy chọn hiển thị khu vực hủy."
      );
      if (!confirmed) return;
      setBusy(true);
      try {
        const response = await fetch(`/api/dashboard/khu-vuc/${zoneId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: isRestore ? "restore" : "cancel" }),
        });
        const payload = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(payload.message || (isRestore ? "Không thể bật lại khu vực." : "Không thể hủy khu vực."));
        window.alert(isRestore ? "Đã bật lại khu vực thành công." : "Đã hủy khu vực thành công.");
        window.dispatchEvent(new Event("farm:navigation-loading"));
        router.push("/dashboard/khu-vuc");
        router.refresh();
      } catch (error) {
        setBusy(false);
        window.alert(error instanceof Error ? error.message : (isRestore ? "Không thể bật lại khu vực." : "Không thể hủy khu vực."));
      }
      return;
    }
    if (item.href) {
      window.dispatchEvent(new Event("farm:navigation-loading"));
      router.push(item.href);
    }
  };
  const visibleActionGroups = actionGroups(context, zoneId, zoneStatus)
    .map((group) => group.filter((item) => (canWrite || !isWriteAction(item)) && (canOpenSettings || !item.href?.startsWith("/dashboard/settings"))))
    .filter((group) => group.length > 0);

  return (
    <div className={styles.tools} ref={rootRef}>
      <button type="button" className={styles.backButton} onClick={() => {
        window.dispatchEvent(new Event("farm:navigation-loading"));
        router.push(resolvedBackHref);
      }}>
        <span className={styles.buttonIcon}><Icon name="back" /></span>
        <span>Quay lại</span>
      </button>
      <div className={styles.actionMenu}>
        <button type="button" className={styles.actionButton} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} disabled={busy}>
          <span className={styles.buttonIcon}><Icon name="edit" /></span>
          <span>{busy ? "Đang xử lý" : "Tác vụ"}</span>
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
                    disabled={item.disabled || busy}
                    onClick={() => runAction(item)}
                  >
                    <span className={styles.menuIcon}><Icon name={item.icon} /></span>
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
