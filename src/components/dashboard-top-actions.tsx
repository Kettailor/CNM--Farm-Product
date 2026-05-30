"use client";

import { useRouter } from "next/navigation";
import styles from "./dashboard-top-actions.module.css";

type Action = {
  id: string;
  label: string;
  href?: string;
};

const ACTIONS: Action[] = [
  { id: "language", label: "Ngôn ngữ", href: "/dashboard/settings?tab=language" },
  { id: "notifications", label: "Thông báo", href: "/dashboard/map" },
  { id: "analytics", label: "Biểu đồ", href: "/dashboard/map" },
  { id: "account", label: "CNM", href: "/dashboard/settings" },
];

function ActionIcon({ id }: { id: string }) {
  switch (id) {
    case "language":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 18h16M4 6h16M12 4c2.8 3.1 4.5 6.5 5 10-.5 3.5-2.2 6.9-5 10-2.8-3.1-4.5-6.5-5-10 .5-3.5 2.2-6.9 5-10Z" /><path d="M5 9h14M5 15h14" /></svg>;
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

  return (
    <div className={styles.topActions}>
      {ACTIONS.map((action) => (
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
