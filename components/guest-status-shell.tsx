import Link from "next/link";

import { getGuestMonogram } from "@/lib/guest-ui";

interface GuestStatusShellProps {
  eyebrow: string;
  title: string;
  message: string;
  actionHref: string;
  actionLabel: string;
  brideName?: string;
  groomName?: string;
  accentColor?: string;
  secondaryColor?: string;
}

export function GuestStatusShell({
  eyebrow,
  title,
  message,
  actionHref,
  actionLabel,
  brideName = "",
  groomName = "",
  accentColor,
  secondaryColor,
}: GuestStatusShellProps) {
  return (
    <main
      className="guest-shell guest-stack"
      style={
        {
          ["--guest-accent" as string]: accentColor ?? "#8f5d49",
          ["--guest-accent-deep" as string]: accentColor ?? "#6b4130",
          ["--guest-accent-soft" as string]: secondaryColor ?? "#ecd8ca",
        }
      }
    >
      <section className="guest-status-shell">
        <div className="guest-status-grid">
          <div className="guest-stack" style={{ justifyContent: "center" }}>
            <p className="guest-eyebrow">{eyebrow}</p>
            <h1 className="guest-status-title">{title}</h1>
            <p className="guest-status-message">{message}</p>

            <div className="guest-status-actions">
              <Link className="guest-button" href={actionHref}>
                {actionLabel}
              </Link>
              <Link className="guest-secondary-link" href="/">
                Beranda AisleFlow
              </Link>
            </div>
          </div>

          <aside className="guest-cover-visual">
            <div className="guest-portrait-badge">Guest Keepsake Experience</div>
            <div className="guest-monogram-wrap">
              <div className="guest-monogram">{getGuestMonogram(brideName, groomName)}</div>
            </div>
            <div className="guest-portrait-caption">
              Kami tetap menjaga tampilan undangan terasa rapi dan hangat, bahkan saat status reservasi tidak dapat
              dilanjutkan.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
