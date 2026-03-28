import { redirect } from "next/navigation";

import { GuestPortalClient } from "@/components/guest-portal-client";
import { GuestStatusShell } from "@/components/guest-status-shell";
import { getGuestPortal } from "@/lib/domain";
import { formatGuestEventDate, getGuestMonogram, getGuestStatusContent } from "@/lib/guest-ui";

export const dynamic = "force-dynamic";

interface GuestPageProps {
  params: Promise<{ token: string }>;
}

export default async function GuestSeatSelectionPage({ params }: GuestPageProps) {
  const { token } = await params;
  let portal: Awaited<ReturnType<typeof getGuestPortal>>;

  try {
    portal = await getGuestPortal(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Undangan belum dapat ditampilkan saat ini.";
    const status = getGuestStatusContent(message, "portal");
    return <GuestStatusShell {...status} />;
  }

  if (portal.booking) {
    redirect(`/guest/${token}/ticket`);
  }

  const coverStyle = portal.theme.backgroundImageDataUrl
    ? {
        backgroundImage: `linear-gradient(120deg, rgba(52, 38, 31, 0.18), rgba(52, 38, 31, 0.04) 55%, rgba(255, 250, 244, 0.06)), url(${portal.theme.backgroundImageDataUrl})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : undefined;

  return (
    <main
      className="guest-shell guest-stack"
      style={
        {
          ["--guest-accent" as string]: portal.theme.primaryColor,
          ["--guest-accent-deep" as string]: portal.theme.primaryColor,
          ["--guest-accent-soft" as string]: portal.theme.secondaryColor,
        }
      }
    >
      <section className="guest-cover guest-stack">
        <div className="guest-cover-grid">
          <div className="guest-stack" style={{ justifyContent: "center" }}>
            <p className="guest-eyebrow">Undangan Digital</p>
            <div className="guest-stack" style={{ gap: 8 }}>
              <span className="guest-muted">Kepada tamu terhormat</span>
              <strong style={{ fontSize: "1.08rem" }}>{portal.guest.name}</strong>
            </div>

            <h1 className="guest-cover-title">
              {portal.event.brideName} &amp; {portal.event.groomName}
            </h1>
            <p className="guest-copy">
              {portal.event.welcomeMessage ||
                "Dengan penuh sukacita, kami mengundang Anda untuk hadir dalam perayaan kami dan menyiapkan tempat duduk pilihan Anda untuk malam yang hangat bersama keluarga dan sahabat."}
            </p>

            <div className="guest-meta-row">
              <div className="guest-pill">
                <strong>{formatGuestEventDate(portal.event.eventDate)}</strong>
                <span>Hari perayaan</span>
              </div>
              <div className="guest-pill">
                <strong>{portal.event.venueName}</strong>
                <span>Lokasi acara</span>
              </div>
              <div className="guest-pill">
                <strong>
                  {portal.session.code} · {portal.session.label}
                </strong>
                <span>Sesi kehadiran Anda</span>
              </div>
            </div>
          </div>

          <aside className="guest-cover-visual" style={coverStyle}>
            <div className="guest-portrait-badge">Guest Keepsake Experience</div>
            {portal.theme.heroImageDataUrl ? (
              <img alt="Foto utama event" className="guest-portrait-image" src={portal.theme.heroImageDataUrl} />
            ) : (
              <div className="guest-monogram-wrap">
                <div className="guest-monogram">{getGuestMonogram(portal.event.brideName, portal.event.groomName)}</div>
              </div>
            )}
            <div className="guest-portrait-caption">
              Undangan ini telah kami siapkan khusus untuk perjalanan Anda menuju kartu tempat duduk malam perayaan.
            </div>
            <a className="guest-scroll-hint" href="#seating-card">
              Lanjut ke kartu tempat duduk di bawah
            </a>
          </aside>
        </div>
      </section>

      <section className="guest-story-grid">
        <article className="guest-paper-card guest-stack">
          <div>
            <p className="guest-section-kicker">Cerita Perayaan</p>
            <h2 className="guest-section-title">Malam hangat yang kami siapkan bersama orang-orang terdekat</h2>
          </div>

          <p className="guest-copy">
            Kehadiran Anda akan menjadi bagian yang berarti dalam malam resepsi kami. Sebelum memilih kursi, silakan
            nikmati detail perayaan yang telah kami rangkai agar pengalaman ini terasa seperti membaca keepsake
            invitation yang utuh, bukan sekadar formulir reservasi.
          </p>

          <div className="guest-detail-list">
            <div className="guest-detail-item">
              <div className="guest-stack" style={{ gap: 6 }}>
                <strong>Hari &amp; Tanggal</strong>
                <span className="guest-detail-text">{formatGuestEventDate(portal.event.eventDate)}</span>
              </div>
              <span className="guest-chip">Malam resepsi</span>
            </div>

            <div className="guest-detail-item">
              <div className="guest-stack" style={{ gap: 6 }}>
                <strong>Lokasi</strong>
                <span className="guest-detail-text">{portal.event.venueName}</span>
              </div>
              <span className="guest-chip">Perayaan utama</span>
            </div>

            <div className="guest-detail-item">
              <div className="guest-stack" style={{ gap: 6 }}>
                <strong>Sesi Kehadiran</strong>
                <span className="guest-detail-text">
                  {portal.session.code} · {portal.session.label}
                </span>
              </div>
              <span className="guest-chip">1 kursi final</span>
            </div>
          </div>
        </article>

        <aside className="guest-paper-card guest-stack">
          <div>
            <p className="guest-section-kicker">Kartu Personal</p>
            <h3 className="guest-card-title">Tempat Anda telah dipersiapkan</h3>
          </div>

          <div className="guest-detail-list">
            <div className="guest-detail-item">
              <div className="guest-stack" style={{ gap: 6 }}>
                <span className="guest-muted">Atas nama</span>
                <strong>{portal.guest.name}</strong>
              </div>
            </div>
            <div className="guest-detail-item">
              <div className="guest-stack" style={{ gap: 6 }}>
                <span className="guest-muted">Sesi</span>
                <strong>
                  {portal.session.code} · {portal.session.label}
                </strong>
              </div>
            </div>
            <div className="guest-detail-item">
              <div className="guest-stack" style={{ gap: 6 }}>
                <span className="guest-muted">Catatan</span>
                <strong>Pilih satu kursi final yang akan menemani malam perayaan ini.</strong>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="guest-bridge">
        Dengan penuh hormat, silakan lanjutkan ke kartu tempat duduk Anda dan pilih kursi yang akan menemani malam
        perayaan ini.
      </section>

      <GuestPortalClient initialPortal={portal} token={token} />
    </main>
  );
}
