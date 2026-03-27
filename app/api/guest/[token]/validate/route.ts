import { getGuestPortal } from "@/lib/domain";
import { jsonError, jsonSuccess } from "@/lib/http";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const portal = await getGuestPortal(token);

    return jsonSuccess({
      portal,
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}
