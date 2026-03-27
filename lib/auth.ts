import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminUserById } from "@/lib/domain";
import type { PublicAdminUser } from "@/lib/types";
import { decodeBase64Json, encodeBase64Json, signValue } from "@/lib/utils";

const COOKIE_NAME = "wedding_admin_session";

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "local-dev-session-secret";
}

export function createAdminSessionToken(userId: string) {
  const payload = encodeBase64Json({
    userId,
    issuedAt: new Date().toISOString(),
  });
  const signature = signValue(payload, getSessionSecret());
  return `${payload}.${signature}`;
}

function parseAdminSessionToken(token: string) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signValue(payload, getSessionSecret());
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    return decodeBase64Json<{ userId: string; issuedAt: string }>(payload);
  } catch {
    return null;
  }
}

export async function getCurrentAdminUser(): Promise<PublicAdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = parseAdminSessionToken(token);
  if (!session?.userId) {
    return null;
  }

  return getAdminUserById(session.userId);
}

export async function requireAdminUser() {
  const user = await getCurrentAdminUser();

  if (!user) {
    redirect("/admin/login");
  }

  return user;
}

export async function requireSuperadmin() {
  const user = await requireAdminUser();

  if (user.role !== "superadmin") {
    redirect("/admin");
  }

  return user;
}

export async function writeAdminSessionCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createAdminSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
