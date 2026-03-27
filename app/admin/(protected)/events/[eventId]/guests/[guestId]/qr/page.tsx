import Link from "next/link";

import { requireAdminUser } from "@/lib/auth";
import { getGuestQrDetails } from "@/lib/domain";
import { createQrDataUrl } from "@/lib/qr";
import { getBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

interface QrPageProps {
  params: Promise<{ eventId: string; guestId: string }>;
}

export default async function GuestQrPage({ params }: QrPageProps) {
  const user = await requireAdminUser();
  const { eventId, guestId } = await params;
  const details = await getGuestQrDetails(user, eventId, guestId);
  const baseUrl = await getBaseUrl();
  const portalUrl = `${baseUrl}/guest/${details.credential.token}`;
  const qrDataUrl = await createQrDataUrl(portalUrl);

  return (
    <section className="ticket-card">
      <div className="ticket-banner">
        <p className="eyebrow" style={{ color: "rgba(255,250,244,0.8)" }}>
          Guest QR
        </p>
        <h1 className="section-title" style={{ color: "#fffaf4" }}>
          {details.guest.name}
        </h1>
        <p>{details.event.title}</p>
      </div>

      <div className="ticket-content stack">
        <img alt={`QR untuk ${details.guest.name}`} src={qrDataUrl} style={{ maxWidth: 320 }} />
        <div className="stack" style={{ gap: 8 }}>
          <span className="pill">
            {details.session.code} · {details.session.label}
          </span>
          <span className="code-block">{portalUrl}</span>
        </div>
        <div className="actions">
          <Link className="button" href={`/admin/events/${eventId}`}>
            Kembali ke event
          </Link>
        </div>
      </div>
    </section>
  );
}
