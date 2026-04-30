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

          <article className="login-card rounded-2xl border border-emerald-100 bg-white/95 p-6 shadow-xl backdrop-blur">
            <h1 className="text-2xl font-bold text-emerald-700">Chào mừng trở lại!</h1>
            <p className="mt-1 text-sm text-slate-600">Vui lòng đăng nhập tài khoản KetKat-EcoFarm của bạn.</p>

            <label className="mt-4 block text-sm font-medium text-slate-700">Email</label>
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" />

            <label className="mt-3 block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

            <button className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300" onClick={onLogin} disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
            {error && <p className="login-error mt-3">{error}</p>}

            <a href="#" className="login-link mt-3 inline-block text-sm text-emerald-700 hover:underline">Quên mật khẩu?</a>
            <p className="login-signup mt-2 text-sm text-slate-600">Chưa có tài khoản? <a className="font-semibold text-emerald-700 hover:underline" href="/">Đăng ký miễn phí</a>.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

