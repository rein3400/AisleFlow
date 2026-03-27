import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell stack">
      <section className="panel stack">
        <p className="eyebrow">404</p>
        <h1 className="display-title">Halaman tidak ditemukan</h1>
        <p className="lede">URL yang Anda buka tidak tersedia atau QR yang digunakan sudah tidak aktif.</p>
        <div className="actions">
          <Link className="button" href="/">
            Kembali ke Beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
