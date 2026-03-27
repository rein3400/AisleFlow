import { lockSeat } from "@/lib/domain";
import { jsonError, jsonSuccess } from "@/lib/http";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = (await request.json()) as {
      seatId?: string;
    };
    const result = await lockSeat(token, String(body.seatId ?? ""));

    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error, 400);
  }
}
