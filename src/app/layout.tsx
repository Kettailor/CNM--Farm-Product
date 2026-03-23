import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KetKat-EcoFarm | Đăng ký hệ thống",
  description: "Màn hình đăng ký ban đầu cho hệ thống KetKat-EcoFarm",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

