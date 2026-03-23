"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Vui lòng nhập đầy đủ thông tin đăng nhập.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) return setError(data.message || "Đăng nhập thất bại.");
      router.push("/home-2");
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-split">
        <div className="login-hero" />

        <div className="login-side">
          <div className="login-brand">KetKat-EcoFarm</div>

          <article className="login-card">
            <h1>Chào mừng trở lại!</h1>
            <p>Vui lòng đăng nhập tài khoản KetKat-EcoFarm của bạn.</p>

            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" />

            <label>Mật khẩu</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

            <button onClick={onLogin} disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
            {error && <p className="login-error">{error}</p>}

            <a href="#" className="login-link">Quên mật khẩu?</a>
            <p className="login-signup">Chưa có tài khoản? <a href="/">Đăng ký miễn phí</a>.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

