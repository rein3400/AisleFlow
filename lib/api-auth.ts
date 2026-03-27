import { getCurrentAdminUser } from "@/lib/auth";

export async function requireAdminApiUser() {
  const user = await getCurrentAdminUser();

  if (!user) {
    const error = new Error("Silakan login sebagai admin.");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  return user;
}

export function getErrorStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }

  return 400;
}
