import { updateGuest } from "@/lib/domain";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getErrorStatus, requireAdminApiUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ eventId: string; guestId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAdminApiUser();
    const { eventId, guestId } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      sessionId?: string;
      inviteStatus?: "pending" | "sent";
      isActive?: boolean;
    };

    const result = await updateGuest(user, eventId, guestId, {
      name: String(body.name ?? ""),
      sessionId: String(body.sessionId ?? ""),
      inviteStatus: body.inviteStatus === "sent" ? "sent" : "pending",
      isActive: body.isActive ?? true,
    });

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error, getErrorStatus(error));
  }
}
