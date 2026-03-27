import { getDashboardMetrics } from "@/lib/domain";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getErrorStatus, requireAdminApiUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const user = await requireAdminApiUser();
    const { eventId } = await context.params;
    const metrics = await getDashboardMetrics(user, eventId);

    return jsonSuccess({
      metrics,
    });
  } catch (error) {
    return jsonError(error, getErrorStatus(error));
  }
}
