import { createAdminSessionToken, getAdminSessionCookieName, getAdminSessionCookieOptions } from "@/lib/auth";
import { verifyAdminLogin } from "@/lib/domain";
import { jsonError, jsonSuccess } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return jsonError("Email dan password wajib diisi.", 400);
    }

    const user = await verifyAdminLogin(email, password);
    if (!user) {
      return jsonError("Email atau password tidak cocok.", 401);
    }

    const response = jsonSuccess({
      user,
    });

    response.cookies.set(
      getAdminSessionCookieName(),
      createAdminSessionToken(user.id),
      getAdminSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    return jsonError(error, 400);
  }
}
