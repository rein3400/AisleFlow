import { getGuestTicket } from "@/lib/domain";
import { jsonError, jsonSuccess } from "@/lib/http";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const ticket = await getGuestTicket(token);

    return jsonSuccess({
      ticket,
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}
