"use client";

import TopbarUserMenu from "@/components/topbar-user-menu";
import styles from "./dashboard-shell.module.css";

type DashboardShellProps = {
  farmName: string;
  activePath: string;
  children: React.ReactNode;
};

type MenuIconProps = {
  name: string;
};

const MENU_ITEMS = [
  { label: "Tổng quan", href: "/dashboard", icon: "dashboard" },
  { label: "Bản đồ trang trại", href: "/dashboard/map", icon: "map" },
  { label: "Vật nuôi", href: "#", icon: "livestock" },
  { label: "Đếm vật nuôi", href: "#", icon: "counter" },
  { label: "Theo dõi vật nuôi", href: "#", icon: "track" },
  { label: "Quản lý khu vực", href: "/dashboard/khu-vuc", icon: "zones" },
  { label: "Quản lý chăn thả", href: "#", icon: "pasture" },
  { label: "Nguồn nước", href: "#", icon: "water" },
  { label: "Kho lạnh", href: "#", icon: "cold" },
  { label: "Độ ẩm đất", href: "#", icon: "soil" },
  { label: "Theo dõi phương tiện", href: "#", icon: "vehicle" },
  { label: "Hàng rào", href: "#", icon: "fence" },
  { label: "Tiêu thụ năng lượng", href: "#", icon: "energy" },
  { label: "Cảnh báo & thông báo", href: "#", icon: "alert" },
  { label: "Nhật ký hóa chất", href: "#", icon: "log" },
  { label: "Điều kiện phun", href: "#", icon: "weather" },
  { label: "Lập kế hoạch", href: "#", icon: "plan" },
  { label: "Quản lý công việc", href: "#", icon: "tasks" },
];

function MenuIcon({ name }: MenuIconProps) {
  switch (name) {
    case "dashboard":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8.5Z" /></svg>;
    case "map":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" /><path d="M9 4v14M15 6v14" /></svg>;
    case "livestock":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 13c0-2.8 2.2-5 5-5s5 2.2 5 5" /><path d="M5 13h14l-1.2 6H6.2L5 13Z" /><path d="M8 8 7 5M16 8l1-3" /></svg>;
    case "counter":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 6h14M7 6v12m10-12v12M5 18h14" /><path d="M9 10h6M9 14h4" /></svg>;
    case "track":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3a7 7 0 0 1 7 7c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 7-7Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case "zones":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h7v12H4z" /><path d="M13 4h7v16h-7z" /></svg>;
    case "pasture":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20h16M6 20V8l6-3 6 3v12" /><path d="M9 20v-6h6v6" /></svg>;
    case "water":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3s5 5.3 5 9.5a5 5 0 1 1-10 0C7 8.3 12 3 12 3Z" /></svg>;
    case "cold":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v18M7 6l10 12M17 6 7 18M4 12h16" /></svg>;
    case "soil":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" /><path d="M4 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" /></svg>;
    case "vehicle":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 14h16l-1.2-4.5A2 2 0 0 0 16.9 8H7.1a2 2 0 0 0-1.9 1.5L4 14Z" /><circle cx="8" cy="18" r="2" /><circle cx="16" cy="18" r="2" /></svg>;
    case "fence":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5v14M10 5v14M15 5v14M20 5v14M3 9h18M3 15h18" /></svg>;
    case "energy":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13 2 5 13h6l-1 9 9-12h-6l0-8Z" /></svg>;
    case "alert":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4 4 20h16L12 4Z" /><path d="M12 9v5M12 17h.01" /></svg>;
    case "log":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4h10v16H7z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>;
    case "weather":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17a4 4 0 1 1 1.1-7.84A5 5 0 0 1 17 11a3.5 3.5 0 0 1 0 7H7Z" /></svg>;
    case "plan":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16M4 12h16M4 18h16" /><path d="M8 6v12M16 6v12" /></svg>;
    case "tasks":
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m4 13 4 4 12-12" /><path d="M4 6h8M4 18h8" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h16" /></svg>;
  }
}

export default function DashboardShell({ farmName, activePath, children }: DashboardShellProps) {
  const isActive = (href: string) => {
    if (href === "/dashboard") return activePath === "/dashboard";
    return activePath === href || activePath.startsWith(`${href}/`);
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src="/favicon.ico" alt="KetKat-EcoFarm" className={styles.brandLogo} />
          <div>
            <div className={styles.brandText}>KetKat-EcoFarm</div>
            <div className={styles.brandSubtext}>{farmName}</div>
          </div>
        </div>
        <TopbarUserMenu />
      </header>

      <section className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav className={styles.menu}>
            {MENU_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={`${styles.menuItem} ${active ? styles.menuItemActive : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={styles.menuIcon}><MenuIcon name={item.icon} /></span>
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </aside>
        <div className={styles.content}>{children}</div>
      </section>
    </main>
  );
}
