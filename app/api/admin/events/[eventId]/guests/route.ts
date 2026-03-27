import { createGuest } from "@/lib/domain";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getErrorStatus, requireAdminApiUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireAdminApiUser();
    const { eventId } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      sessionId?: string;
      inviteStatus?: "pending" | "sent";
      isActive?: boolean;
    };

    const result = await createGuest(user, eventId, {
      name: String(body.name ?? ""),
      sessionId: String(body.sessionId ?? ""),
      inviteStatus: body.inviteStatus === "sent" ? "sent" : "pending",
      isActive: body.isActive ?? true,
    });

    return jsonSuccess(result, { status: 201 });
  } catch (error) {
    return jsonError(error, getErrorStatus(error));
  }
}
