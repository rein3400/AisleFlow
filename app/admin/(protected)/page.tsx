import { requireAdminUser } from "@/lib/auth";
import { listAdminEvents } from "@/lib/domain";
import { AdminHomeClient } from "@/components/admin-home-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requireAdminUser();
  const events = await listAdminEvents(user);

  return <AdminHomeClient events={events} user={user} />;
}
