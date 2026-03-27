import { getGuestTicket } from "@/lib/domain";

export const dynamic = "force-dynamic";

interface TicketPageProps {
  params: Promise<{ token: string }>;
}

export default async function GuestTicketPage({ params }: TicketPageProps) {
  const { token } = await params;
  const ticket = await getGuestTicket(token);

  return (
    <main
      className="shell stack"
      style={
        {
          ["--accent" as string]: ticket.theme.primaryColor,
          ["--bg-strong" as string]: ticket.theme.secondaryColor,
        }
      }
    >
      <section className="ticket-card">
        <div className="ticket-banner">
          <p className="eyebrow" style={{ color: "rgba(255,250,244,0.8)" }}>
            E-Ticket
          </p>
          <h1 className="section-title" style={{ color: "#fffaf4" }}>
            Reservasi Anda Sudah Final
          </h1>
          <p>
            {ticket.event.brideName} &amp; {ticket.event.groomName}
          </p>
        </div>

        <div className="ticket-content stack">
          <div className="ticket-meta">
            <span className="pill">{ticket.guest.name}</span>
            <span className="pill">
              {ticket.session.code} · {ticket.session.label}
            </span>
          </div>

          <div className="stack" style={{ gap: 6 }}>
            <span className="muted">Nomor kursi final</span>
            <strong className="ticket-highlight">{ticket.bookingSeat.seatLabel}</strong>
          </div>

          <div className="stack" style={{ gap: 6 }}>
            <span className="muted">Lokasi</span>
            <strong>{ticket.event.venueName}</strong>
          </div>

          <div className="stack" style={{ gap: 6 }}>
            <span className="muted">Waktu konfirmasi</span>
            <strong>{new Date(ticket.booking.confirmedAt).toLocaleString("id-ID")}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
