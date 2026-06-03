"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CowLoading from "./cow-loading";
import styles from "./topbar-user-menu.module.css";

type CurrentUserResponse = {
  user?: {
    fullName?: string | null;
    email?: string | null;
  };
  access?: {
    canManageSettings?: boolean;
    canManageUsers?: boolean;
    canManageDocuments?: boolean;
  } | null;
};

export default function TopbarUserMenu() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("Người dùng");
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();
  const avatarText = useMemo(() => {
    const firstLetter = userName.trim().charAt(0);
    return firstLetter ? firstLetter.toUpperCase() : "U";
  }, [userName]);

  useEffect(() => {
    let alive = true;
    const loadUser = async () => {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as CurrentUserResponse;
        const name = data.user?.fullName?.trim() || data.user?.email?.trim();
        if (alive && name) setUserName(name);
        if (alive) {
          setShowSettings(Boolean(data.access?.canManageSettings || data.access?.canManageUsers || data.access?.canManageDocuments));
        }
      } catch {
        // Keep the fallback label when the profile request fails.
      }
    };

    loadUser();
    return () => {
      alive = false;
    };
  }, []);

  const logout = async () => {
    setLoading(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className={styles.wrap}>
      <button type="button" onClick={() => setOpen((value) => !value)} className={styles.trigger} aria-expanded={open} aria-label="Mở menu người dùng">
        <span className={styles.avatar}>{avatarText}</span>
        <span className={styles.userName}>{userName}</span>
      </button>

      {open && (
        <div className={styles.menu}>
          {showSettings && (
            <a href="/dashboard/settings" className={styles.item}>
              <span className={styles.itemIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                  <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.2 2.2 0 0 1-3.11 3.11l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21a2.2 2.2 0 1 1-4.4 0v-.06A1.8 1.8 0 0 0 8.06 19.3a1.8 1.8 0 0 0-1.98.36l-.04.04a2.2 2.2 0 0 1-3.11-3.11l.04-.04a1.8 1.8 0 0 0 .36-1.98 1.8 1.8 0 0 0-1.65-1.1H1.6a2.2 2.2 0 1 1 0-4.4h.06A1.8 1.8 0 0 0 3.3 8.06a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2.2 2.2 0 0 1 3.11-3.11l.04.04a1.8 1.8 0 0 0 1.98.36H8.1A1.8 1.8 0 0 0 9.2 1.68V1.6a2.2 2.2 0 1 1 4.4 0v.06a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.2 2.2 0 0 1 3.11 3.11l-.04.04a1.8 1.8 0 0 0-.36 1.98v.07a1.8 1.8 0 0 0 1.65 1.1h.06a2.2 2.2 0 1 1 0 4.4h-.06A1.8 1.8 0 0 0 19.4 15Z" />
                </svg>
              </span>
              Cài đặt
            </a>
          )}
          <button type="button" onClick={logout} disabled={loading} className={styles.logout}>
            {loading ? (
              <CowLoading label="Đang tải..." />
            ) : (
              <>
                <span className={styles.itemIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M10 17l5-5-5-5" />
                    <path d="M15 12H3" />
                    <path d="M14 3h4a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-4" />
                  </svg>
                </span>
                Đăng xuất
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
