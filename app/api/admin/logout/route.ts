import { clearAdminSessionCookie } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await clearAdminSessionCookie();
    return jsonSuccess({
      success: true,
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}
