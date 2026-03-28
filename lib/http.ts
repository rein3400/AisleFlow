import { NextResponse } from "next/server";

export function jsonSuccess<T extends Record<string, unknown>>(payload: T, init?: ResponseInit) {
  return NextResponse.json(
    {
      ok: true,
      ...payload,
    },
    init,
  );
}

export function jsonError(error: unknown, status = 400) {
  if (error instanceof Error) {
    console.error("[AisleFlow] Request failed", {
      status,
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else {
    console.error("[AisleFlow] Request failed", {
      status,
      error,
    });
  }

  const message = error instanceof Error ? error.message : "Terjadi kesalahan pada server.";
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status },
  );
}
