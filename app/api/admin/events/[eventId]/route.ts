import { getEventWorkspace, updateEventDetails } from "@/lib/domain";
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
    const workspace = await getEventWorkspace(user, eventId);

    return jsonSuccess({
      workspace,
    });
  } catch (error) {
    return jsonError(error, getErrorStatus(error));
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAdminApiUser();
    const { eventId } = await context.params;
    const body = (await request.json()) as {
      title?: string;
      brideName?: string;
      groomName?: string;
      eventDate?: string;
      venueName?: string;
      welcomeMessage?: string;
      guestTargetTotal?: number;
    };

    const result = await updateEventDetails(user, eventId, {
      title: String(body.title ?? ""),
      brideName: String(body.brideName ?? ""),
      groomName: String(body.groomName ?? ""),
      eventDate: String(body.eventDate ?? ""),
      venueName: String(body.venueName ?? ""),
      welcomeMessage: String(body.welcomeMessage ?? ""),
      guestTargetTotal: Number(body.guestTargetTotal ?? 0),
    });

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error, getErrorStatus(error));
  }
}
