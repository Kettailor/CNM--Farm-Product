"use client";

import { FormEvent, useEffect, useState } from "react";
import MapViewSwitcher from "@/components/dashboard-map-view-switcher";
import DashboardShell from "@/components/dashboard-shell";
import { useRouter } from "next/navigation";

type Profile = {
  owner_id?: string; full_name?: string; email?: string; farm_id?: string; farm_name?: string;
  farm_area_hectare?: number | null; special_factors?: string | null; other_activity?: string | null;
  annual_rainfall?: number | null; carrying_capacity?: number | null; spring_start?: string | null;
  location_name?: string | null; maps_link?: string | null; latitude?: number | null; longitude?: number | null;
  is_map_shared?: boolean;
};

const asNum = (v: string) => (v === "" ? null : Number(v));

export default function DashboardSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<Profile>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login?next=/dashboard/settings");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setForm(d.profile ?? {});
      });
  }, [router]);

  const fillLocationByCoordinates = (nextLat: number | null, nextLng: number | null) => {
    if (nextLat === null || nextLng === null) return {};
    return { location_name: `Vị trí (${nextLat.toFixed(6)}, ${nextLng.toFixed(6)})`, maps_link: `https://maps.google.com/?q=${nextLat},${nextLng}` };
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("Đang lưu...");
    const rs = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await rs.json();
    setMsg(data.message || (rs.ok ? "Đã lưu thành công." : "Có lỗi."));
    if (rs.ok) { const latest = await fetch("/api/profile").then((r) => r.json()); setForm(latest.profile ?? {}); }
  };

  return (
    <DashboardShell farmName={form.farm_name || "KetKat-EcoFarm"} activePath="/dashboard/settings">
      <div style={{ display: "grid", gap: 18 }}>
        <section className="card" style={{ padding: 24, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <p className="kicker">Cài đặt hồ sơ</p>
            <h1 className="section-title">Bố trí lại phần cài đặt theo cấu trúc dữ liệu trang trại.</h1>
            <p className="section-subtitle">Màn hình này gom thông tin tài khoản, vị trí và cấu hình vận hành vào một bố cục có thứ bậc rõ ràng.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/dashboard" className="btn btn-secondary">Quay lại</a>
            <button type="submit" form="settingForm" className="btn btn-primary">Lưu thay đổi</button>
          </div>
        </section>

        <section className="grid-4">
          <article className="card" style={{ padding: 18 }}><span className="muted">Trang trại</span><strong>{form.farm_name ? 1 : 0}</strong></article>
          <article className="card" style={{ padding: 18 }}><span className="muted">Người dùng</span><strong>{form.full_name ? 1 : 0}</strong></article>
          <article className="card" style={{ padding: 18 }}><span className="muted">Hoạt động</span><strong>{form.other_activity ? 1 : 0}</strong></article>
          <article className="card" style={{ padding: 18 }}><span className="muted">Lời mời</span><strong>{form.email ? 1 : 0}</strong></article>
        </section>

        <section className="grid-2">
          <article className="card" style={{ padding: 20 }}>
            <h2 className="section-title" style={{ fontSize: 24 }}>Bản đồ vị trí nông trại</h2>
            <p className="section-subtitle">Cập nhật tọa độ và vị trí hiển thị từ dữ liệu cấu hình.</p>
            <div style={{ marginTop: 14 }}>
              <MapViewSwitcher lat={form.latitude ?? 10.762622} lng={form.longitude ?? 106.660172} zoom={16} title="Bản đồ vị trí cài đặt" frameClassName="area-overview-canvas" />
            </div>
          </article>

          <article className="card" style={{ padding: 20, display: "grid", gap: 16 }}>
            <div>
              <h2 className="section-title" style={{ fontSize: 24 }}>Tổng quan trang trại</h2>
              <p className="section-subtitle">Các giá trị chính được hiển thị để dễ kiểm tra trước khi lưu.</p>
            </div>
            <div className="grid-2">
              <div className="card" style={{ padding: 16 }}><span className="muted">Tên trang trại</span><strong>{form.farm_name || "Trang trại KetKat"}</strong></div>
              <div className="card" style={{ padding: 16 }}><span className="muted">Diện tích</span><strong>{form.farm_area_hectare ?? 0} ha</strong></div>
              <div className="card" style={{ padding: 16 }}><span className="muted">Vị trí</span><strong>{form.location_name || "Chưa khai báo"}</strong></div>
              <div className="card" style={{ padding: 16 }}><span className="muted">Mưa năm</span><strong>{form.annual_rainfall ?? 0}</strong></div>
            </div>
            <div className="card" style={{ marginTop: 16, padding: 16, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <strong>Chia sẻ bản đồ trang trại</strong>
                <p className="muted" style={{ marginTop: 4 }}>Bật để hiển thị trang trại của bạn trên bản đồ công khai cho khách vãng lai.</p>
              </div>
              <button type="button" className={form.is_map_shared ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setForm({ ...form, is_map_shared: !form.is_map_shared })}>
                {form.is_map_shared ? "Đang chia sẻ" : "Đang ẩn"}
              </button>
            </div>
          </article>
        </section>

        <section className="card" style={{ padding: 24 }}>
          <form id="settingForm" onSubmit={onSubmit} className="grid-2">
            <input type="hidden" value={form.is_map_shared ? "true" : "false"} readOnly />
            <input className="input" placeholder="Họ tên" value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <input className="input" placeholder="Email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="input" placeholder="Tên nông trại" value={form.farm_name ?? ""} onChange={(e) => setForm({ ...form, farm_name: e.target.value })} />
            <input className="input" type="number" placeholder="Diện tích (ha)" value={form.farm_area_hectare ?? ""} onChange={(e) => setForm({ ...form, farm_area_hectare: asNum(e.target.value) })} />
            <input className="input" placeholder="Tên vị trí" value={form.location_name ?? ""} onChange={(e) => setForm({ ...form, location_name: e.target.value })} />
            <input className="input" placeholder="Google Maps link" value={form.maps_link ?? ""} onChange={(e) => setForm({ ...form, maps_link: e.target.value })} />
            <input className="input" type="number" placeholder="Latitude" value={form.latitude ?? ""} onChange={(e) => { const nextLat = asNum(e.target.value); const nextLng = form.longitude ?? null; setForm({ ...form, latitude: nextLat, ...fillLocationByCoordinates(nextLat, nextLng) }); }} />
            <input className="input" type="number" placeholder="Longitude" value={form.longitude ?? ""} onChange={(e) => { const nextLng = asNum(e.target.value); const nextLat = form.latitude ?? null; setForm({ ...form, longitude: nextLng, ...fillLocationByCoordinates(nextLat, nextLng) }); }} />
            <input className="input" type="number" placeholder="Lượng mưa năm" value={form.annual_rainfall ?? ""} onChange={(e) => setForm({ ...form, annual_rainfall: asNum(e.target.value) })} />
            <input className="input" type="number" placeholder="Sức tải" value={form.carrying_capacity ?? ""} onChange={(e) => setForm({ ...form, carrying_capacity: asNum(e.target.value) })} />
            <input className="input" placeholder="Mùa xuân bắt đầu" value={form.spring_start ?? ""} onChange={(e) => setForm({ ...form, spring_start: e.target.value })} />
            <input className="input" placeholder="Hoạt động khác" value={form.other_activity ?? ""} onChange={(e) => setForm({ ...form, other_activity: e.target.value })} />
            <textarea className="textarea" rows={3} placeholder="Yếu tố đặc biệt" value={form.special_factors ?? ""} onChange={(e) => setForm({ ...form, special_factors: e.target.value })} />
          </form>
          {msg && <p className="muted" style={{ marginTop: 14 }}>{msg}</p>}
        </section>
      </div>
    </DashboardShell>
  );
}
