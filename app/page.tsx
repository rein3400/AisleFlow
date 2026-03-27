import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell stack">
      <section className="hero-card">
        <div className="hero-grid">
          <div className="stack">
            <p className="eyebrow">Wedding Reservation Platform</p>
            <h1 className="display-title">AisleFlow</h1>
            <p className="lede">
              Platform multi-event untuk wedding organizer yang menggabungkan pengaturan sesi, alokasi tamu,
              QR unik, seat map dinamis, dan e-ticket final dalam satu alur yang ringkas.
            </p>
            <div className="actions">
              <Link className="button" href="/admin/login">
                Masuk ke Admin
              </Link>
            </div>
          </div>

          <div className="panel stack">
            <p className="eyebrow">Seed Credentials</p>
            <h2 className="section-title">Akun awal</h2>
            <p className="muted">Workspace ini otomatis membuat satu akun superadmin untuk bootstrap event pertama.</p>
            <div className="stack">
              <span className="code-block">superadmin@example.com</span>
              <span className="code-block">superadmin123</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
