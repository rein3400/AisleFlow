import { GuestStatusShell } from "@/components/guest-status-shell";
import { getGuestTicket } from "@/lib/domain";
import { formatGuestConfirmationTime, formatGuestEventDate, getGuestMonogram, getGuestStatusContent } from "@/lib/guest-ui";

export const dynamic = "force-dynamic";

interface TicketPageProps {
  params: Promise<{ token: string }>;
}

export default async function GuestTicketPage({ params }: TicketPageProps) {
  const { token } = await params;
  let ticket: Awaited<ReturnType<typeof getGuestTicket>>;

  try {
    ticket = await getGuestTicket(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tiket belum dapat ditampilkan saat ini.";
    const status = getGuestStatusContent(message, "ticket", token);
    return <GuestStatusShell {...status} />;
  }

  return (
    <main
      className="guest-shell guest-stack"
      style={
        {
          ["--guest-accent" as string]: ticket.theme.primaryColor,
          ["--guest-accent-deep" as string]: ticket.theme.primaryColor,
          ["--guest-accent-soft" as string]: ticket.theme.secondaryColor,
        }
      }
    >
      <section className="guest-ticket-shell">
        <div className="guest-ticket-grid">
          <div className="guest-stack">
            <div className="guest-stack" style={{ gap: 10 }}>
              <p className="guest-section-kicker">E-Ticket Final</p>
              <h1 className="guest-section-title">Tiket digital Anda telah disiapkan sebagai keepsake akhir</h1>
            </div>

            <article className="guest-ticket-card">
              <div className="guest-ticket-topline">
                <div className="guest-stack" style={{ gap: 10 }}>
                  <span className="guest-ticket-kicker">Reservasi Final</span>
                  <div className="guest-ticket-headline">
                    {ticket.event.brideName} &amp; {ticket.event.groomName}
                  </div>
                </div>
                <div className="guest-ticket-status-badge">Siap ditunjukkan di venue</div>
              </div>

              <div className="guest-ticket-hero-grid">
                <div className="guest-stack" style={{ gap: 10 }}>
                  <span className="guest-ticket-kicker">Atas nama</span>
                  <strong style={{ fontSize: "1.35rem" }}>{ticket.guest.name}</strong>
                  <p>
                    Terima kasih telah menutup reservasi kursi Anda. Halaman ini akan selalu menjadi tiket final yang
                    muncul saat QR tamu dibuka kembali.
                  </p>
                </div>

                <div className="guest-ticket-seat">{ticket.bookingSeat.seatLabel}</div>
              </div>
            </article>

            <div className="guest-ticket-meta-grid">
              <div className="guest-ticket-meta-card">
                <span className="guest-mini-label">Hari Acara</span>
                <strong>{formatGuestEventDate(ticket.event.eventDate)}</strong>
                <p>Malam resepsi keluarga dan sahabat</p>
              </div>
              <div className="guest-ticket-meta-card">
                <span className="guest-mini-label">Lokasi</span>
                <strong>{ticket.event.venueName}</strong>
                <p>Silakan simpan tiket ini untuk ditunjukkan saat hadir.</p>
              </div>
              <div className="guest-ticket-meta-card">
                <span className="guest-mini-label">Sesi</span>
                <strong>
                  {ticket.session.code} · {ticket.session.label}
                </strong>
                <p>Kursi final hanya berlaku untuk sesi tamu ini.</p>
              </div>
              <div className="guest-ticket-meta-card">
                <span className="guest-mini-label">Waktu Finalisasi</span>
                <strong>{formatGuestConfirmationTime(ticket.booking.confirmedAt)}</strong>
                <p>Ditampilkan sesuai zona waktu Jakarta.</p>
              </div>
            </div>
          </div>

          <aside className="guest-ticket-side">
            <div className="guest-companion-card">
              <div className="guest-companion-frame">
                <div className="guest-companion-seal">
                  {getGuestMonogram(ticket.event.brideName, ticket.event.groomName)}
                </div>
              </div>

              <div className="guest-stack">
                <p className="guest-section-kicker">Companion Panel</p>
                <h2 className="guest-card-title">Tampilan samping terasa utuh, tenang, dan siap disimpan</h2>
                <p>
                  Panel ini menjaga nuansa undangan tetap hidup pada halaman tiket, sambil menguatkan bahwa kursi
                  tamu telah final dan siap diverifikasi di lokasi acara.
                </p>
              </div>
            </div>

            <div className="guest-status-panel">
              <strong>1 QR · 1 kursi final</strong>
              <p>Tiket ini tidak menyediakan perubahan kursi setelah reservasi akhir diselesaikan.</p>
            </div>

            <div className="guest-ticket-pill-row">
              <div className="guest-pill">
                <strong>Immutable</strong>
                <span>Tidak bisa diubah</span>
              </div>
              <div className="guest-pill">
                <strong>Ready to show</strong>
                <span>Layak disimpan</span>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
