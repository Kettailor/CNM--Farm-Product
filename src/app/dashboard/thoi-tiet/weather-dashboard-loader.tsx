"use client";

import dynamic from "next/dynamic";
import CowLoading from "@/components/cow-loading";
import type { DuLieuThoiTiet } from "@/lib/thoi-tiet";

type Props = {
  farmName: string;
  locationName: string | null;
  latitude: number;
  longitude: number;
  initialWeather: DuLieuThoiTiet | null;
};

const WeatherDashboardClient = dynamic(() => import("./weather-dashboard-client"), {
  ssr: false,
  loading: () => (
    <div className="weather-dashboard-loading">
      <CowLoading label="Đang tải..." size="lg" />
    </div>
  ),
});

export default function WeatherDashboardLoader(props: Props) {
  return <WeatherDashboardClient {...props} />;
}
