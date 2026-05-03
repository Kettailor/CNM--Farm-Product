export default function Loading() {
  return (
    <main className="farm-loading-page">
      <section className="farm-loading-layout">
        <div className="farm-loading-visual" aria-hidden="true">
          <div className="farm-loading-sun" />
          <div className="farm-loading-hills">
            <span />
            <span />
            <span />
          </div>
          <div className="farm-loading-path">
            <div className="farm-loading-cow">🐄</div>
          </div>
        </div>

        <div className="farm-loading-panel card">
          <div className="farm-loading-brand">
            <img src="/favicon.ico" alt="KetKat-EcoFarm" className="farm-loading-logo" />
            <span>KetKat-EcoFarm</span>
          </div>

          <div className="farm-loading-spinner" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h1>Đang chuẩn bị dữ liệu nông trại</h1>
          <p>Hệ thống đang tải bản đồ, khu vực và dữ liệu vận hành. Vui lòng chờ trong giây lát.</p>

          <div className="farm-loading-bars">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}
