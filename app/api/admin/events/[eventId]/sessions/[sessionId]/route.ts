import { deleteSession, updateSession } from "@/lib/domain";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getErrorStatus, requireAdminApiUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ eventId: string; sessionId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAdminApiUser();
    const { eventId, sessionId } = await context.params;
    const body = (await request.json()) as {
      label?: string;
      capacity?: number;
    };

    const result = await updateSession(user, eventId, sessionId, {
      label: String(body.label ?? ""),
      capacity: Number(body.capacity ?? 0),
    });

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error, getErrorStatus(error));
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const user = await requireAdminApiUser();
    const { eventId, sessionId } = await context.params;
    const result = await deleteSession(user, eventId, sessionId);

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error, getErrorStatus(error));
  }
}
