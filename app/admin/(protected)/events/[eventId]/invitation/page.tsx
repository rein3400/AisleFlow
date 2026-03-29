import { AdminInvitationBuilderClient } from "@/components/admin-invitation-builder-client";
import { requireAdminUser } from "@/lib/auth";
import { getInvitationBuilderWorkspace } from "@/lib/domain";

export const dynamic = "force-dynamic";

interface InvitationBuilderPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function InvitationBuilderPage({ params }: InvitationBuilderPageProps) {
  const user = await requireAdminUser();
  const { eventId } = await params;
  const workspace = await getInvitationBuilderWorkspace(user, eventId);

  return <AdminInvitationBuilderClient workspace={workspace} />;
}
