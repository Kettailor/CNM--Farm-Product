"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegistrationPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onCreateAccount = async () => {
    setError("");
    if (!fullName.trim() || !email.trim() || !password.trim()) return setError("Vui lòng nhập đầy đủ thông tin.");
    if (password.length < 8) return setError("Mật khẩu phải có ít nhất 8 ký tự.");

    setLoading(true);
    try {
      const res = await fetch("/api/register-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), password }),
      });
      const data = (await res.json()) as { message?: string; nextPath?: string };
      if (!res.ok) return setError(data.message || "Không thể tạo tài khoản.");
      router.push(data.nextPath || "/register/farm");
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card card auth-card-register">
        <aside className="auth-visual auth-visual-register">
          <div className="auth-brand-row">
            <img src="/favicon.ico" alt="KetKat-EcoFarm" className="auth-logo" />
            <div>
              <p className="auth-brand-label">KetKat-EcoFarm</p>
              <strong>Tạo tài khoản chủ sở hữu</strong>
            </div>
          </div>

          <h1 className="auth-visual-title">Thiết lập tài khoản để bắt đầu quản trị nông trại.</h1>
          <p className="auth-visual-text">
            Quy trình đăng ký được thiết kế theo hướng rõ ràng, hiện đại và dễ đi tiếp sang bước khởi tạo farm.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <strong>1. Tài khoản</strong>
              <span>Nhập họ tên, email và mật khẩu</span>
            </div>
            <div className="auth-feature-item">
              <strong>2. Khởi tạo farm</strong>
              <span>Thêm thông tin nông trại sau khi đăng ký</span>
            </div>
            <div className="auth-feature-item">
              <strong>3. Bắt đầu sử dụng</strong>
              <span>Vào dashboard và hoàn thiện dữ liệu</span>
            </div>
          </div>
        </aside>

        <div className="auth-panel">
          <div className="auth-panel-head">
            <p className="kicker">Đăng ký</p>
            <h2>Tạo tài khoản mới</h2>
            <p className="section-subtitle">Hoàn tất thông tin cơ bản trước khi cấu hình nông trại.</p>
          </div>

          <div className="auth-form-grid">
            <label className="auth-field full">
              <span>Họ và tên</span>
              <input className="input" placeholder="Nguyễn Văn A" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="auth-field full">
              <span>Email</span>
              <input className="input" placeholder="ban@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="auth-field full">
              <span>Mật khẩu</span>
              <input className="input" type="password" placeholder="Ít nhất 8 ký tự" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          </div>

          <button type="button" className="btn btn-primary auth-submit" onClick={onCreateAccount} disabled={loading}>
            {loading ? "Đang tạo..." : "Tạo tài khoản"}
          </button>

          {error && <p className="error-text auth-error">{error}</p>}

          <div className="auth-links">
            <a href="/login">Đã có tài khoản? Đăng nhập</a>
            <a href="/">Xem trang giới thiệu</a>
          </div>
        </div>
      </section>
    </main>
  );
}
