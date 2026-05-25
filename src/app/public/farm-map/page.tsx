import { getPublicFarmMapItems } from "@/lib/public-farm-map";
import { PublicFarmMapClient } from "@/components/public-farm-map-client";

export const dynamic = "force-dynamic";

export default async function PublicFarmMapPage() {
  const farms = await getPublicFarmMapItems();

  return (
    <main className="farm-map-page" style={{ minHeight: "100vh", padding: "32px 20px", background: "linear-gradient(180deg, #edf6ea 0%, #f7faf6 36%, #eef4ec 100%)" }}>
      <section style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gap: 20 }}>
        <header className="card" style={{ padding: 24, borderRadius: 28, background: "rgba(255,255,255,0.86)", border: "1px solid rgba(16,32,22,0.08)", boxShadow: "0 18px 50px rgba(16,32,22,0.08)" }}>
          <div style={{ display: "flex", gap: 16, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ maxWidth: 820 }}>
              <p style={{ margin: 0, color: "#2f7d46", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.16em" }}>Bản đồ nông trại công khai</p>
              <h1 style={{ margin: "10px 0 0", fontSize: "clamp(30px, 4vw, 48px)", lineHeight: 1.05, color: "#173123" }}>Các đối tác của KetKat-EcoFarm</h1>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="/register" className="btn btn-primary">Đăng ký nông trại</a>
              <a href="/login" className="btn btn-secondary">Đăng nhập</a>
            </div>
          </div>
        </header>

        <PublicFarmMapClient farms={farms} />
      </section>
    </main>
  );
}
