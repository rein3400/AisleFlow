import { createSession } from "@/lib/domain";
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
      label?: string;
      capacity?: number;
    };

    const result = await createSession(user, eventId, {
      label: String(body.label ?? ""),
      capacity: Number(body.capacity ?? 0),
    });

    return jsonSuccess(result, { status: 201 });
  } catch (error) {
    return jsonError(error, getErrorStatus(error));
  }
}
