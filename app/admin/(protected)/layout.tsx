import type { ReactNode } from "react";
import Link from "next/link";

import { AdminEventSwitcher } from "@/components/admin-event-switcher";
import { LogoutButton } from "@/components/logout-button";
import { requireAdminUser } from "@/lib/auth";
import { listAdminEvents } from "@/lib/domain";

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
          <span className="muted small">{user.name} | {user.role === "superadmin" ? "Superadmin" : "Event Admin"}</span>
        </div>

        <LogoutButton />
      </div>

      {events.length ? <AdminEventSwitcher events={events} /> : null}

      {children}
    </main>
  );
}
