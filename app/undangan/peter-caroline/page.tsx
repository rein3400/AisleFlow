import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peter & Caroline | AisleFlow Demo Invitation",
  description: "Demo undangan digital Peter & Caroline dengan hero image AI-generated.",
};

interface InvitationPageProps {
  searchParams: Promise<{ guest?: string }>;
}

function sanitizeGuestName(value: string | undefined) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return normalized || "Our Dear Guest";
}

export default async function PeterCarolineInvitationPage({ searchParams }: InvitationPageProps) {
  const params = await searchParams;
  const guestName = sanitizeGuestName(params.guest);

  return (
    <main
      className="shell stack"
      style={
        {
          ["--accent" as string]: "#8f5b44",
          ["--accent-strong" as string]: "#6f3f2b",
          ["--bg-strong" as string]: "#f4ece4",
        }
      }
    >
      <section
        className="hero-card"
        style={{
          overflow: "hidden",
          background:
            "radial-gradient(circle at top right, rgba(255,255,255,0.42), transparent 26%), rgba(255,250,244,0.86)",
        }}
      >
        <div className="hero-grid" style={{ alignItems: "center" }}>
          <div className="stack" style={{ gap: 18 }}>
            <p className="eyebrow">Real Demo Invitation</p>
            <div className="stack" style={{ gap: 10 }}>
              <p className="muted" style={{ margin: 0 }}>
                Invitation prepared for
              </p>
              <span className="pill" style={{ width: "fit-content" }}>
                {guestName}
              </span>
            </div>

            <h1 className="display-title">Peter &amp; Caroline</h1>
            <p className="lede" style={{ maxWidth: 620 }}>
              With heartfelt joy, we invite you to celebrate our wedding day and share an evening of love, dinner,
              and beautiful memories with the people dearest to us.
            </p>

            <div className="pill-row">
              <span className="pill">
                <strong>Saturday</strong>
                <span>20 December 2026</span>
              </span>
              <span className="pill">
                <strong>The Grand Garden</strong>
                <span>Jakarta</span>
              </span>
              <span className="pill">
                <strong>Reception</strong>
                <span>18.30 WIB</span>
              </span>
            </div>

            <div className="actions">
              <a className="button" href="#celebration">
                View Celebration Details
              </a>
              <a className="button-ghost" href="#note">
                Read Our Note
              </a>
            </div>
          </div>

          <div
            className="panel"
            style={{
              padding: 14,
              borderRadius: 32,
              background: "rgba(255, 250, 244, 0.74)",
            }}
          >
            <img
              alt="AI-generated wedding portrait for Peter and Caroline"
              src="/demo-assets/peter-caroline-hero-v1.jpg"
              style={{
                width: "100%",
                height: "100%",
                minHeight: 520,
                objectFit: "cover",
                borderRadius: 26,
                boxShadow: "0 26px 60px rgba(78, 47, 32, 0.18)",
              }}
            />
          </div>
        </div>
      </section>

      <section
        className="event-grid"
        id="celebration"
        style={{ gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)" }}
      >
        <div className="panel stack" style={{ gap: 18 }}>
          <div>
            <p className="eyebrow">The Celebration</p>
            <h2 className="section-title" style={{ fontSize: "2rem" }}>
              An evening garden wedding with intimate dinner and live music
            </h2>
          </div>

          <div className="list">
            <article className="row-card">
              <div className="stack" style={{ gap: 6 }}>
                <strong>Wedding Ceremony</strong>
                <span className="muted">16.00 WIB · Garden Pavilion</span>
              </div>
              <span className="pill">Formal Attire</span>
            </article>

            <article className="row-card">
              <div className="stack" style={{ gap: 6 }}>
                <strong>Evening Reception</strong>
                <span className="muted">18.30 WIB · The Grand Garden Ballroom</span>
              </div>
              <span className="pill">Dinner &amp; Toast</span>
            </article>

            <article className="row-card">
              <div className="stack" style={{ gap: 6 }}>
                <strong>Golden Hour Portrait Session</strong>
                <span className="muted">17.30 WIB · Rose Courtyard</span>
              </div>
              <span className="pill">Live Quartet</span>
            </article>
          </div>
        </div>

        <aside className="panel stack" id="note" style={{ gap: 18 }}>
          <div>
            <p className="eyebrow">A Note From Us</p>
            <h2 className="section-title" style={{ fontSize: "2rem" }}>
              We would be honored by your presence
            </h2>
          </div>

          <p className="lede" style={{ margin: 0 }}>
            This page is a live invitation demo for presentation purposes. The hero portrait was generated with AI,
            and the layout is prepared to feel like a premium digital wedding invite rather than a plain event page.
          </p>

          <div className="stack" style={{ gap: 12 }}>
            <div className="row-card">
              <div className="stack" style={{ gap: 6 }}>
                <span className="muted">Guest name</span>
                <strong>{guestName}</strong>
              </div>
            </div>
            <div className="row-card">
              <div className="stack" style={{ gap: 6 }}>
                <span className="muted">Venue</span>
                <strong>The Grand Garden, Jakarta</strong>
              </div>
            </div>
            <div className="row-card">
              <div className="stack" style={{ gap: 6 }}>
                <span className="muted">Demo type</span>
                <strong>Public invitation showcase</strong>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
