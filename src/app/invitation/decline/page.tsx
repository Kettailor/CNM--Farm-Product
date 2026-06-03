export default function DeclineInvitationPage({ searchParams }: { searchParams?: { token?: string } }) {
  const token = searchParams?.token?.trim() || "";

  return (
    <main className="auth-page">
      <section className="auth-card card">
        <aside className="auth-visual auth-visual-register">
          <div className="auth-brand">
            <span className="auth-logo">K</span>
            <strong>KetKat-EcoFarm</strong>
          </div>
          <h1 className="auth-visual-title">Từ chối lời mời tham gia trang trại.</h1>
          <p>Lời mời sẽ được đóng lại và chủ sở hữu trang trại sẽ nhận thông báo.</p>
        </aside>

        <form className="auth-panel" action="/api/invitations/decline" method="post">
          <div>
            <p className="kicker">Lời mời trang trại</p>
            <h2>Xác nhận từ chối</h2>
            <p className="section-subtitle">
              Nếu bạn không muốn tham gia trang trại này, xác nhận từ chối để hệ thống dừng lời mời.
            </p>
          </div>

          <input type="hidden" name="token" value={token} />
          {!token && <p className="auth-error">Liên kết lời mời không hợp lệ.</p>}

          <button type="submit" className="btn btn-primary" disabled={!token}>
            Từ chối lời mời
          </button>
          <a href="/login" className="btn btn-secondary">
            Quay lại đăng nhập
          </a>
        </form>
      </section>
    </main>
  );
}
