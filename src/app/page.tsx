const featureSet = [
  {
    title: "Vận hành trực tiếp",
    desc: "Quan sát tổng quan vận hành và trạng thái nông trại trong một màn hình.",
  },
  {
    title: "Bản đồ nông trại",
    desc: "Định vị khu vực, phạm vi và cấu trúc không gian canh tác.",
  },
  {
    title: "Cảm biến và tài sản",
    desc: "Theo dõi tài nguyên, cảm biến và dữ liệu nền tảng đi cùng hệ thống.",
  },
  {
    title: "Sẵn sàng truy xuất",
    desc: "Sẵn sàng cho luồng truy xuất nguồn gốc và quản trị mở rộng.",
  },
  {
    title: "Hồ sơ và cài đặt",
    desc: "Quản lý tài khoản, hồ sơ và cấu hình dùng chung cho trang trại.",
  },
  {
    title: "Phân tích và báo cáo",
    desc: "Dễ dàng mở rộng sang số liệu, báo cáo và màn hình phân tích.",
  },
];

const dashboardHighlights = [
  { label: "Khu vực đang hoạt động", value: "12" },
  { label: "Cảm biến đang kết nối", value: "48" },
  { label: "Nguồn nước", value: "05" },
  { label: "Trạng thái hệ thống", value: "Ổn định" },
];

const stories = [
  {
    title: "Cảm biến nhiệt độ thông minh",
    desc: "Theo dõi nhiệt độ môi trường để tối ưu điều kiện chăn nuôi và canh tác.",
  },
  {
    title: "Cảm biến quản lý năng lượng",
    desc: "Giám sát năng lượng và giảm lãng phí trong các khu vận hành chính.",
  },
];

const showcaseCards = ["Trang trại bò sữa", "Trang trại rau màu", "Mô hình tổng hợp"];

const stats = [
  { value: "01", label: "Trang vào" },
  { value: "04", label: "Luồng chính" },
  { value: "06", label: "Nhóm tính năng" },
  { value: "100%", label: "Định hướng hệ thống" },
];

const appCards = ["Cửa hàng ứng dụng", "Google Play"];

export default function HomePage() {
  return (
    <main className="page-shell marketing-home">
      <header className="topbar card">
        <div>
          <div className="brand">KetKat-EcoFarm</div>
          <div className="brand-subtitle">Nền tảng quản trị và truy xuất nông trại số</div>
        </div>
        <nav className="topnav">
          <a href="#features">Tính năng</a>
          <a href="#stories">Trường hợp sử dụng</a>
          <a href="#global">Phạm vi</a>
          <a href="#apps">Ứng dụng</a>
        </nav>
        <div className="topbar-actions">
          <a className="btn btn-ghost" href="/login">Đăng nhập</a>
          <a className="btn btn-primary" href="/register">Bắt đầu ngay</a>
        </div>
      </header>

      <section className="hero-spacer card">
        <div className="hero-layout">
          <div className="hero-copy">
            <h1 className="hero-title">Giải pháp quản lý nông trại tập trung, rõ ràng và sẵn sàng cho vận hành thực tế</h1>
            <p className="hero-subtitle">Giao diện này được xây dựng theo phong cách desktop marketing, nhưng toàn bộ nội dung, dữ liệu và chỉ số đều bám theo hệ thống KetKat-EcoFarm của bạn.</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="/register">Trải nghiệm ngay</a>
              <a className="btn btn-ghost" href="/login">Đăng nhập</a>
            </div>
          </div>

          <div className="hero-visual card">
            <div className="hero-visual-header">
              <div>
                <p className="section-eyebrow" style={{ marginBottom: 6 }}>Bảng điều khiển</p>
                <strong>KetKat-EcoFarm Overview</strong>
              </div>
              <span className="status-pill">Đang hoạt động</span>
            </div>

            <div className="dashboard-mock">
              <div className="dashboard-sidebar">
                <div className="sidebar-chip active" />
                <div className="sidebar-chip" />
                <div className="sidebar-chip" />
                <div className="sidebar-chip" />
                <div className="sidebar-chip" />
              </div>

              <div className="dashboard-main">
                <div className="dashboard-map card">
                  <div className="map-topline">
                    <span>Bản đồ nông trại</span>
                    <span>Vị trí trung tâm</span>
                  </div>
                  <div className="map-canvas">
                    <div className="field field-large" />
                    <div className="field field-medium" />
                    <div className="field field-small" />
                    <div className="field field-water" />
                    <div className="map-pin map-pin-1" />
                    <div className="map-pin map-pin-2" />
                    <div className="map-pin map-pin-3" />
                  </div>
                </div>

                <div className="dashboard-panels">
                  {dashboardHighlights.map((item) => (
                    <article key={item.label} className="dashboard-stat card">
                      <div className="muted" style={{ fontSize: 12 }}>{item.label}</div>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section-block card">
        <div className="section-center wide">
          <p className="section-eyebrow">Tính năng</p>
          <h2>Tổng quan theo đúng cấu trúc sản phẩm hiện có</h2>
          <p>Các điểm điều hướng bên dưới bám theo những màn hình quan trọng nhất của hệ thống, giúp người dùng đi đúng vào dashboard, bản đồ và phần quản lý nông trại.</p>
        </div>
        <div className="feature-grid">
          {featureSet.map((item) => (
            <article key={item.title} className="feature-tile card">
              <div className="feature-dot" />
              <strong>{item.title}</strong>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="story-section card">
        <div className="section-center narrow">
          <p className="section-eyebrow">Nền tảng của nông nghiệp thông minh</p>
          <h2>Nông nghiệp thông minh bắt đầu từ dữ liệu cảm biến</h2>
        </div>
        <div className="story-grid">
          {stories.map((story) => (
            <article key={story.title} className="story-card card story-card-accent">
              <div className="story-preview" />
              <h3>{story.title}</h3>
              <p>{story.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="stories" className="section-block card">
        <div className="section-center wide">
          <p className="section-eyebrow">Trường hợp sử dụng</p>
          <h2>Một số luồng thao tác tiêu biểu tại nông trại</h2>
        </div>
        <div className="video-grid">
          {showcaseCards.map((video) => (
            <article key={video} className="video-card card">
              <div className="video-card-top">
                <div className="play-button">▶</div>
                <div className="video-meta">
                  <span className="muted">Mô hình</span>
                  <strong>{video}</strong>
                </div>
              </div>
              <p>Thẻ nội dung mô phỏng bố cục quảng bá, nhưng vẫn phản ánh đúng nội dung dự án của bạn.</p>
            </article>
          ))}
        </div>
      </section>

      <section id="global" className="global-section card">
        <div className="global-copy">
          <p className="section-eyebrow">Phạm vi sử dụng</p>
          <h2>Thiết kế cho nhiều mô hình trang trại</h2>
          <p>Phần này đóng vai trò giới thiệu phạm vi ứng dụng của hệ thống, đồng thời giữ sự tập trung vào các màn hình chính.</p>
        </div>
        <div className="global-map">
          <div className="global-map-grid">
            <div className="global-card global-card-large">Trung tâm quản lý</div>
            <div className="global-card">Bản đồ</div>
            <div className="global-card">Cảm biến</div>
            <div className="global-card">Vật nuôi</div>
            <div className="global-card">Nguồn nước</div>
            <div className="global-card">Khu vực</div>
          </div>
        </div>
      </section>

      <section id="apps" className="apps-band card">
        <div>
          <p className="section-eyebrow">Ứng dụng di động và máy tính bảng</p>
          <h2>Đưa trải nghiệm quản lý nông trại đến mọi thiết bị.</h2>
        </div>
        <div className="store-buttons">
          {appCards.map((label) => (
            <a key={label} href="/dashboard" className="store-btn">{label}</a>
          ))}
        </div>
      </section>

      <section className="stats-row card">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <footer className="footer card">
        <div>
          <div className="brand">KetKat-EcoFarm</div>
          <div className="brand-subtitle">Nền tảng quản trị và truy xuất nông trại số</div>
        </div>
        <div className="footer-links">
          <a href="/login">Đăng nhập</a>
          <a href="/register">Đăng ký</a>
          <a href="/dashboard">Dashboard</a>
        </div>
      </footer>
    </main>
  );
}
