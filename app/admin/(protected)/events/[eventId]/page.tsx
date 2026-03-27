import { requireAdminUser } from "@/lib/auth";
import { getEventWorkspace } from "@/lib/domain";
import { EventWorkspaceClient } from "@/components/event-workspace-client";

export const dynamic = "force-dynamic";

interface EventPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventWorkspacePage({ params }: EventPageProps) {
  const user = await requireAdminUser();
  const { eventId } = await params;
  const workspace = await getEventWorkspace(user, eventId);

  return <EventWorkspaceClient workspace={workspace} />;
}
