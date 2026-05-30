"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CowLoading from "@/components/cow-loading";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/dashboard");
  }, []);

  const onLogin = async () => {
    setError("");
    if (!email.trim() || !password) return setError("Vui lòng nhập đầy đủ thông tin đăng nhập.");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as { message?: string; nextPath?: string };
      if (!res.ok) return setError(data.message || "Đăng nhập thất bại.");
      router.push(data.nextPath || nextPath);
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card card">
        <div className="auth-visual">
          <div className="auth-brand-row">
            <img src="/favicon.ico" alt="KetKat-EcoFarm" className="auth-logo" />
            <div>
              <p className="auth-brand-label">KetKat-EcoFarm</p>
              <strong>Nền tảng quản lý nông trại</strong>
            </div>
          </div>

          <h1 className="auth-visual-title">Đăng nhập để tiếp tục quản lý nông trại.</h1>
          <p className="auth-visual-text">
            Truy cập dashboard, bản đồ và dữ liệu vận hành trong một trải nghiệm gọn gàng, chuyên nghiệp hơn.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <strong>Dashboard</strong>
              <span>Tổng quan vận hành, cảnh báo và trạng thái</span>
            </div>
            <div className="auth-feature-item">
              <strong>Bản đồ nông trại</strong>
              <span>Quản lý khu vực, vị trí và phạm vi canh tác</span>
            </div>
            <div className="auth-feature-item">
              <strong>Dữ liệu tập trung</strong>
              <span>Đồng bộ tài khoản với hệ thống quản trị</span>
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-panel-head">
            <p className="kicker">Đăng nhập</p>
            <h2>Chào mừng trở lại</h2>
            <p className="section-subtitle">Nhập thông tin tài khoản để tiếp tục làm việc.</p>
          </div>

          <div className="auth-form-grid">
            <label className="auth-field full">
              <span>Email</span>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" />
            </label>
            <label className="auth-field full">
              <span>Mật khẩu</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </label>
          </div>

          <button className="btn btn-primary auth-submit" onClick={onLogin} disabled={loading}>
            {loading ? <CowLoading label="Đang tải..." /> : "Đăng nhập"}
          </button>

          {error && <p className="error-text auth-error">{error}</p>}

          <div className="auth-links">
            <a href="/register">Chưa có tài khoản? Đăng ký</a>
            <a href="/">Xem trang giới thiệu</a>
          </div>
        </div>
      </section>
    </main>
  );
}
