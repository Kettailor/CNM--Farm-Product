import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KetKat-EcoFarm",
  description: "Nền tảng quản trị và truy xuất nông trại số KetKat-EcoFarm",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

