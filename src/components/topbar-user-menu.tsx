"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ border: "1px solid #d9d9d9", borderRadius: 999, padding: "6px 10px", background: "#fff", cursor: "pointer" }}
      >
        👤
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: 150,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            padding: 8,
            zIndex: 30,
          }}
        >
          <a href="/home-2/profile" style={{ display: "block", padding: "8px 10px", borderRadius: 8, textDecoration: "none", color: "#111827" }}>
            ⚙️ Cài đặt
          </a>
          <button
            type="button"
            onClick={logout}
            disabled={loading}
            style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#dc2626" }}
          >
            {loading ? "Đang đăng xuất..." : "↪ Đăng xuất"}
          </button>
        </div>
      )}
    </div>
  );
}

