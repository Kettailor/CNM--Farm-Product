"use client";

import { FormEvent, useEffect, useState } from "react";
import TopbarUserMenu from "@/components/topbar-user-menu";
import MapViewSwitcher from "@/components/map-view-switcher";

type Profile = {
  owner_id?: string; full_name?: string; email?: string; farm_id?: string; farm_name?: string;
  farm_area_hectare?: number | null; special_factors?: string | null; other_activity?: string | null;
  annual_rainfall?: number | null; carrying_capacity?: number | null; spring_start?: string | null;
  location_name?: string | null; maps_link?: string | null; latitude?: number | null; longitude?: number | null;
};

const menuItems = [
  { icon: "🏠", ten: "Tổng quan", href: "/home-2" },
  { icon: "🗺️", ten: "Bản đồ", href: "/home-2/ban-do" },
  { icon: "🧩", ten: "Quản lý ô", href: "/home-2/ban-do/quan-ly-o" },
  { icon: "🐄", ten: "Vật nuôi", href: "#" },
  { icon: "⚙️", ten: "Hồ sơ", href: "/home-2/profile" },
];

const asNum = (v: string) => (v === "" ? null : Number(v));

export default function ProfilePage() {
  const [form, setForm] = useState<Profile>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => setForm(d.profile ?? {}));
  }, []);

  const fillLocationByCoordinates = (nextLat: number | null, nextLng: number | null) => {
    if (nextLat === null || nextLng === null) return {};
    return {
      location_name: `Vị trí (${nextLat.toFixed(6)}, ${nextLng.toFixed(6)})`,
      maps_link: `https://maps.google.com/?q=${nextLat},${nextLng}`,
    };
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("Đang lưu...");
    const rs = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await rs.json();
    setMsg(data.message || (rs.ok ? "Đã lưu thành công." : "Có lỗi."));

    if (rs.ok) {
      const latest = await fetch("/api/profile").then((r) => r.json());
      setForm(latest.profile ?? {});
    }
  };

  return (
    <main className="dashboard-page area-page setting-page">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar-left">
          <label htmlFor="dashboardMenuToggleProfile" className="dashboard-menu-btn">☰</label>
          <strong className="dashboard-brand">Cài đặt</strong>
        </div>
        <div className="dashboard-toolbar"><span>🔔</span><TopbarUserMenu /></div>
      </header>

      <nav className="dashboard-taskbar">
        <a href="/home-2" className="dashboard-taskbar-item">Tổng quan</a>
        <a href="/home-2/ban-do" className="dashboard-taskbar-item">Bản đồ</a>
        <a href="/home-2/ban-do/quan-ly-o" className="dashboard-taskbar-item">Quản lý ô</a>
        <a href="#" className="dashboard-taskbar-item">Cảnh báo</a>
        <a href="/home-2/profile" className="dashboard-taskbar-item active">Hồ sơ</a>
      </nav>

      <section className="dashboard-layout dashboard-layout-with-toggle">
        <input id="dashboardMenuToggleProfile" type="checkbox" className="dashboard-menu-toggle" />
        <aside className="dashboard-sidebar dashboard-sidebar-panel">
          {menuItems.map((item, idx) => (
            <a key={item.ten} href={item.href} className={`dashboard-menu-item ${idx === 4 ? "active" : ""}`}>
              <span className="dashboard-menu-icon">{item.icon}</span><span className="dashboard-menu-label">{item.ten}</span>
            </a>
          ))}
        </aside>

        <div className="dashboard-main">
          <section className="setting-head-row">
            <h1>Cài đặt</h1>
            <div className="setting-head-actions">
              <a href="/home-2" className="area-link-btn">⟲ Quay lại</a>
              <button type="submit" form="settingForm" className="area-link-btn primary">✔ Hành động</button>
            </div>
          </section>

          <section className="setting-tabs"><button className="active" type="button">Tài khoản</button><button type="button">Người dùng</button><button type="button">Thanh toán</button></section>

          <section className="farm-map-kpis">
            <article className="farm-map-kpi-card"><span>Trang trại</span><strong>{form.farm_name ? 1 : 0}</strong><small>Tối đa 1</small></article>
            <article className="farm-map-kpi-card"><span>Người dùng</span><strong>{form.full_name ? 1 : 0}</strong><small>Tối đa 3</small></article>
            <article className="farm-map-kpi-card"><span>Hoạt động</span><strong>{form.other_activity ? 1 : 0}</strong><small>Đã đăng ký</small></article>
            <article className="farm-map-kpi-card"><span>Lời mời</span><strong>{form.email ? 1 : 0}</strong><small>Đang chờ xử lý</small></article>
          </section>

          <section className="farm-map-table-card setting-main-card">
            <div className="setting-map-card">
              <h3>Bản đồ vị trí nông trại</h3>
              <MapViewSwitcher
                lat={form.latitude ?? 10.762622}
                lng={form.longitude ?? 106.660172}
                zoom={16}
                title="Bản đồ vị trí cài đặt"
                frameClassName="area-overview-canvas"
              />
            </div>

            <div className="setting-panel-grid">
              <div className="setting-farm-summary">
                <h3>TRANG TRẠI KET</h3>
                <p><strong>Tên trang trại:</strong> {form.farm_name || "Trang trại Ket"}</p>
                <p><strong>Diện tích:</strong> {form.farm_area_hectare ?? 0} ha</p>
                <p><strong>Vị trí:</strong> {form.location_name || "Chưa khai báo"}</p>
                <p><strong>Tọa độ:</strong> {form.latitude ?? 0}, {form.longitude ?? 0}</p>
                <p><strong>Lượng mưa:</strong> {form.annual_rainfall ?? 0}</p>
              </div>
              <div className="setting-unit-box">
                <h3>Đơn vị tiêu chuẩn</h3>
                <p>Tài sản đồng vật: Dse</p><p>Diện tích: Hecta</p><p>Nhiệt độ: Độ C</p><p>Âm lượng: Số liệu</p>
              </div>
            </div>

            <form id="settingForm" onSubmit={onSubmit} className="setting-form-grid">
              <input placeholder="Họ tên" value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              <input placeholder="Email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input placeholder="Tên nông trại" value={form.farm_name ?? ""} onChange={(e) => setForm({ ...form, farm_name: e.target.value })} />
              <input type="number" placeholder="Diện tích (ha)" value={form.farm_area_hectare ?? ""} onChange={(e) => setForm({ ...form, farm_area_hectare: asNum(e.target.value) })} />
              <input placeholder="Tên vị trí" value={form.location_name ?? ""} onChange={(e) => setForm({ ...form, location_name: e.target.value })} />
              <input placeholder="Google Maps link" value={form.maps_link ?? ""} onChange={(e) => setForm({ ...form, maps_link: e.target.value })} />
              <input
                type="number"
                placeholder="Latitude"
                value={form.latitude ?? ""}
                onChange={(e) => {
                  const nextLat = asNum(e.target.value);
                  const nextLng = form.longitude ?? null;
                  setForm({ ...form, latitude: nextLat, ...fillLocationByCoordinates(nextLat, nextLng) });
                }}
              />
              <input
                type="number"
                placeholder="Longitude"
                value={form.longitude ?? ""}
                onChange={(e) => {
                  const nextLng = asNum(e.target.value);
                  const nextLat = form.latitude ?? null;
                  setForm({ ...form, longitude: nextLng, ...fillLocationByCoordinates(nextLat, nextLng) });
                }}
              />
              <input type="number" placeholder="Lượng mưa năm" value={form.annual_rainfall ?? ""} onChange={(e) => setForm({ ...form, annual_rainfall: asNum(e.target.value) })} />
              <input type="number" placeholder="Sức tải" value={form.carrying_capacity ?? ""} onChange={(e) => setForm({ ...form, carrying_capacity: asNum(e.target.value) })} />
              <input placeholder="Mùa xuân bắt đầu" value={form.spring_start ?? ""} onChange={(e) => setForm({ ...form, spring_start: e.target.value })} />
              <input placeholder="Hoạt động khác" value={form.other_activity ?? ""} onChange={(e) => setForm({ ...form, other_activity: e.target.value })} />
              <input className="setting-wide" placeholder="Yếu tố đặc biệt" value={form.special_factors ?? ""} onChange={(e) => setForm({ ...form, special_factors: e.target.value })} />
            </form>
            {msg && <p className="setting-status">{msg}</p>}
          </section>
        </div>
      </section>
    </main>
  );
}

