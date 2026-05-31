import type { Metadata } from "next";
import { Suspense } from "react";
import AppNavigationLoading from "@/components/app-navigation-loading";
import "./globals.css";

export const metadata: Metadata = {
  title: "KetKat-EcoFarm",
  description: "Nền tảng quản trị và truy xuất nông trại số KetKat-EcoFarm",
  icons: {
    icon: "/assets/logo_ketkatecofarm.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <Suspense fallback={null}>
          <AppNavigationLoading />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
