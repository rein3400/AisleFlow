import type { ReactNode } from "react";
import Link from "next/link";

import { requireAdminUser } from "@/lib/auth";
import { listAdminEvents } from "@/lib/domain";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminUser();
  const events = await listAdminEvents(user);

  return (
    <main className="shell stack">
      <div className="admin-nav">
        <div className="stack" style={{ gap: 6 }}>
          <Link href="/admin">
            <strong>AisleFlow Admin</strong>
          </Link>
          <span className="muted small">
            {user.name} · {user.role === "superadmin" ? "Superadmin" : "Event Admin"}
          </span>
        </div>

        <LogoutButton />
      </div>

      {events.length ? (
        <div className="pill-row">
          {events.map(({ event }) => (
            <Link className="pill" href={`/admin/events/${event.id}`} key={event.id}>
              {event.title}
            </Link>
          ))}
        </div>
      ) : null}

      {children}
    </main>
  );
}
