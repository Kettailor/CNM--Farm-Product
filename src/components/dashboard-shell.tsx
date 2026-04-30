"use client";

import TopbarUserMenu from "@/components/topbar-user-menu";
import styles from "./dashboard-shell.module.css";

type DashboardShellProps = {
  farmName: string;
  activePath: string;
  children: React.ReactNode;
};

const MENU_ITEMS = [
  { label: "Tổng quan", href: "/dashboard", icon: "◉" },
  { label: "Bản đồ trang trại", href: "/dashboard/map", icon: "🗺" },
  { label: "Vật nuôi", href: "#", icon: "🐄" },
  { label: "Đếm vật nuôi", href: "#", icon: "#" },
  { label: "Theo dõi vật nuôi", href: "#", icon: "◎" },
  { label: "Khu vực chăn thả", href: "/dashboard/zones", icon: "▣" },
  { label: "Quản lý chăn thả", href: "#", icon: "◫" },
  { label: "Nguồn nước", href: "#", icon: "💧" },
  { label: "Kho lạnh", href: "#", icon: "❄" },
  { label: "Độ ẩm đất", href: "#", icon: "≈" },
  { label: "Theo dõi phương tiện", href: "#", icon: "🚜" },
  { label: "Hàng rào", href: "#", icon: "▮" },
  { label: "Tiêu thụ năng lượng", href: "#", icon: "⚡" },
  { label: "Cảnh báo & thông báo", href: "#", icon: "!" },
  { label: "Nhật ký hóa chất", href: "#", icon: "✎" },
  { label: "Điều kiện phun", href: "#", icon: "☁" },
  { label: "Lập kế hoạch", href: "#", icon: "⌂" },
  { label: "Quản lý công việc", href: "#", icon: "✓" },
];

export default function DashboardShell({ farmName, activePath, children }: DashboardShellProps) {
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
            {MENU_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`${styles.menuItem} ${activePath.startsWith(item.href) ? styles.menuItemActive : ""}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </aside>
        <div className={styles.content}>{children}</div>
      </section>
    </main>
  );
}
