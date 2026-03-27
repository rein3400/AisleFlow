import { regenerateGuestQr } from "@/lib/domain";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getErrorStatus, requireAdminApiUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ eventId: string; guestId: string }>;
}

export async function POST(_: Request, context: RouteContext) {
  try {
    const user = await requireAdminApiUser();
    const { eventId, guestId } = await context.params;
    const result = await regenerateGuestQr(user, eventId, guestId);

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error, getErrorStatus(error));
  }
}
