import { getAdminSessionCookieName } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const response = jsonSuccess({
      success: true,
    });

    response.cookies.delete(getAdminSessionCookieName());

    return response;
  } catch (error) {
    return jsonError(error, 400);
  }
}
