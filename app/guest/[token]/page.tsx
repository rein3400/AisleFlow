import { redirect } from "next/navigation";

import { GuestPortalClient } from "@/components/guest-portal-client";
import { InvitationPageRenderer } from "@/components/invitation-renderer";
import { GuestStatusShell } from "@/components/guest-status-shell";
import { getGuestPortal } from "@/lib/domain";
import { getGuestStatusContent } from "@/lib/guest-ui";

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

  return (
    <main className="guest-shell guest-stack">
      <InvitationPageRenderer
        anchorHref="#seating-card"
        config={portal.invitationConfig}
        event={portal.event}
        guest={portal.guest}
        session={portal.session}
      />
      <GuestPortalClient initialPortal={portal} token={token} />
    </main>
  );
}
