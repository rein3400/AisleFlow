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
  const message = error instanceof Error ? error.message : "Terjadi kesalahan pada server.";
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status },
  );
}
