import { GuestStatusShell } from "@/components/guest-status-shell";
import { InvitationTicketRenderer } from "@/components/invitation-renderer";
import { getGuestTicket } from "@/lib/domain";
import { getGuestStatusContent } from "@/lib/guest-ui";

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
    <main className="guest-shell guest-stack">
      <InvitationTicketRenderer
        booking={{
          seatLabel: ticket.bookingSeat.seatLabel,
          confirmedAt: ticket.booking.confirmedAt,
        }}
        config={ticket.invitationConfig}
        event={ticket.event}
        guest={ticket.guest}
        session={ticket.session}
      />
    </main>
  );
}
