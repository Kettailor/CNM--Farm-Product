"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./notification-bell.module.css";

type NotificationTone = "info" | "success" | "warning" | "danger";

type UserNotification = {
  id: string;
  title: string;
  body: string | null;
  tone: NotificationTone;
  module: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

type NotificationResponse = {
  notifications: UserNotification[];
  unreadCount: number;
  nextOffset: number;
  hasMore: boolean;
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V11a5 5 0 1 1 10 0v3.2c0 .5.2 1 .6 1.4L19 17h-4" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </svg>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export default function NotificationBell() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const unreadLabel = useMemo(() => (unreadCount > 99 ? "99+" : String(unreadCount)), [unreadCount]);

  const loadNotifications = async (offset = 0) => {
    const response = await fetch(`/api/notifications?limit=20&offset=${offset}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as NotificationResponse;
    setUnreadCount(data.unreadCount);
    setNextOffset(data.nextOffset);
    setHasMore(data.hasMore);
    setNotifications((current) => {
      if (offset === 0) return data.notifications;
      const seen = new Set(current.map((item) => item.id));
      return [...current, ...data.notifications.filter((item) => !seen.has(item.id))];
    });
  };

  useEffect(() => {
    let cancelled = false;
    void loadNotifications(0).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const stream = new EventSource("/api/notifications/stream");
    stream.addEventListener("ready", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { unreadCount?: number };
      if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
    });
    stream.addEventListener("notification", (event) => {
      const notification = JSON.parse((event as MessageEvent).data) as UserNotification;
      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) return current;
        return [notification, ...current];
      });
      if (!notification.read) setUnreadCount((current) => current + 1);
    });
    return () => stream.close();
  }, []);

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

  const markRead = async (notification: UserNotification) => {
    if (notification.read) return;
    setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)));
    setUnreadCount((current) => Math.max(0, current - 1));
    await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" });
  };

  const markAllRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    if (response.ok) {
      const data = (await response.json()) as NotificationResponse;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setNextOffset(data.nextOffset);
      setHasMore(data.hasMore);
    }
  };

  const openNotification = async (notification: UserNotification) => {
    await markRead(notification);
    if (notification.href) {
      setOpen(false);
      window.dispatchEvent(new Event("farm:navigation-loading"));
      router.push(notification.href);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    await loadNotifications(nextOffset).finally(() => setLoadingMore(false));
  };

  return (
    <div className={styles.wrap} ref={rootRef}>
      <button type="button" className={styles.trigger} aria-label="Thông báo" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <BellIcon />
        {unreadCount > 0 && <span className={styles.badge}>{unreadLabel}</span>}
      </button>

      {open && (
        <section className={styles.panel} aria-label="Danh sách thông báo">
          <header className={styles.panelHeader}>
            <div>
              <strong>Thông báo</strong>
              <span>{unreadCount > 0 ? `${unreadCount} chưa đọc` : "Không có thông báo mới"}</span>
            </div>
            <button type="button" onClick={markAllRead} disabled={unreadCount === 0}>
              Đọc tất cả
            </button>
          </header>

          <div className={styles.list}>
            {loading ? (
              <div className={styles.emptyState}>Đang tải thông báo...</div>
            ) : notifications.length === 0 ? (
              <div className={styles.emptyState}>Chưa có thông báo.</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={styles.item}
                  data-unread={!notification.read}
                  data-tone={notification.tone}
                  onClick={() => void openNotification(notification)}
                >
                  <span className={styles.dot} />
                  <span className={styles.itemBody}>
                    <strong>{notification.title}</strong>
                    {notification.body && <span>{notification.body}</span>}
                    <small>{notification.module || "Hệ thống"} · {formatTime(notification.createdAt)}</small>
                  </span>
                </button>
              ))
            )}
          </div>

          {hasMore && (
            <button type="button" className={styles.loadMore} onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Đang tải..." : "Xem thông báo cũ hơn"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
