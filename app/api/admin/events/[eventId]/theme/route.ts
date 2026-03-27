import { updateEventTheme } from "@/lib/domain";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getErrorStatus, requireAdminApiUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAdminApiUser();
    const { eventId } = await context.params;
    const body = (await request.json()) as {
      primaryColor?: string;
      secondaryColor?: string;
      heroImageDataUrl?: string;
      backgroundImageDataUrl?: string;
    };

    const result = await updateEventTheme(user, eventId, {
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
      heroImageDataUrl: body.heroImageDataUrl,
      backgroundImageDataUrl: body.backgroundImageDataUrl,
    });

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error, getErrorStatus(error));
  }
}
