"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard-top-actions.module.css";

type Action = {
  id: string;
  label: string;
  href?: string;
};

const ACTIONS: Action[] = [
  { id: "analytics", label: "Biểu đồ", href: "/dashboard/map" },
  { id: "account", label: "CNM", href: "/dashboard/settings" },
];

function ActionIcon({ id }: { id: string }) {
  switch (id) {
    case "notifications":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V11a5 5 0 1 1 10 0v3.2c0 .5.2 1 .6 1.4L19 17h-4" /><path d="M10 17a2 2 0 0 0 4 0" /></svg>;
    case "analytics":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 19h16" /><path d="M7 16V9M12 16V6M17 16v-4" /></svg>;
    case "account":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4 20a8 8 0 0 1 16 0" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h16" /></svg>;
  }
}

export default function DashboardTopActions() {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled) return;
        const access = payload?.access;
        setShowSettings(Boolean(access?.canManageSettings || access?.canManageUsers || access?.canManageDocuments));
      })
      .catch(() => {
        if (!cancelled) setShowSettings(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const actions = ACTIONS.filter((action) => showSettings || !action.href?.startsWith("/dashboard/settings"));

  return (
    <div className={styles.topActions}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={styles.actionButton}
          aria-label={action.label}
          title={action.label}
          onClick={() => {
            if (action.href) {
              window.dispatchEvent(new Event("farm:navigation-loading"));
              router.push(action.href);
            }
          }}
        >
          <span className={styles.actionIcon}><ActionIcon id={action.id} /></span>
        </button>
      ))}
    </div>
  );
}
