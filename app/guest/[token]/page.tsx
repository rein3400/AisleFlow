import { redirect } from "next/navigation";

import { getGuestPortal } from "@/lib/domain";
import { SeatMapClient } from "@/components/seat-map-client";

export const dynamic = "force-dynamic";

interface GuestPageProps {
  params: Promise<{ token: string }>;
}

export default async function GuestSeatSelectionPage({ params }: GuestPageProps) {
  const { token } = await params;
  const portal = await getGuestPortal(token);

  if (portal.booking) {
    redirect(`/guest/${token}/ticket`);
  }

  return (
    <main
      className="shell stack"
      style={
        {
          ["--accent" as string]: portal.theme.primaryColor,
          ["--bg-strong" as string]: portal.theme.secondaryColor,
        }
      }
    >
      <section className="hero-card">
        <div className="hero-grid">
          <div className="stack">
            <p className="eyebrow">Undangan Digital</p>
            <h1 className="display-title">
              {portal.event.brideName} &amp; {portal.event.groomName}
            </h1>
            <p className="lede">{portal.event.welcomeMessage}</p>
            <div className="pill-row">
              <span className="pill">{portal.guest.name}</span>
              <span className="pill">
                {portal.session.code} · {portal.session.label}
              </span>
              <span className="pill">{portal.event.venueName}</span>
            </div>
          </div>

          <div
            className="hero-photo"
            style={{
              background: portal.theme.backgroundImageDataUrl
                ? undefined
                : `linear-gradient(135deg, ${portal.theme.primaryColor}, ${portal.theme.secondaryColor})`,
            }}
          >
            {portal.theme.heroImageDataUrl ? <img alt="Foto utama event" src={portal.theme.heroImageDataUrl} /> : null}
          </div>
        </div>
      </section>

      <SeatMapClient initialPortal={portal} token={token} />
    </main>
  );
}
