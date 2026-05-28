"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./topbar-user-menu.module.css";

export default function TopbarUserMenu() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const logout = async () => {
    setLoading(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className={styles.wrap}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={styles.trigger} aria-expanded={open} aria-label="Mở menu người dùng">
        <span className={styles.avatar}>👤</span>
        <span>Người dùng</span>
      </button>

      {open && (
        <div className={styles.menu}>
          <a href="/du-lieu/trang-trai" className={styles.item}>
            ⚙️ Cài đặt
          </a>
          <button type="button" onClick={logout} disabled={loading} className={styles.logout}>
            {loading ? "Đang đăng xuất..." : "↪ Đăng xuất"}
          </button>
        </div>
      )}
    </div>
  );
}
