import crypto from "node:crypto";

export function nowIso() {
  return new Date().toISOString();
}

export function addMinutes(dateIso: string, minutes: number) {
  return new Date(new Date(dateIso).getTime() + minutes * 60_000).toISOString();
}

export function isExpired(dateIso: string) {
  return new Date(dateIso).getTime() <= Date.now();
}

export function generateId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString("base64url");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function normalizeHeader(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[_-]+/g, " ");
}

export function parseBooleanLike(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["1", "true", "yes", "y", "aktif", "active"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "tidak", "inactive", "nonaktif"].includes(normalized)) {
    return false;
  }

  return null;
}

export function initialsFromName(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "??";
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expected] = storedHash.split(":");

  if (!salt || !expected) {
    return false;
  }

  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function signValue(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function encodeBase64Json(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeBase64Json<T>(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

export function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function parsePositiveInteger(value: unknown, fieldLabel: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldLabel} harus berupa angka bulat 0 atau lebih.`);
  }

  return parsed;
}

export function sanitizeDataUrl(value: unknown) {
  const stringValue = String(value ?? "").trim();
  if (!stringValue) {
    return "";
  }

  if (!stringValue.startsWith("data:image/")) {
    throw new Error("Berkas gambar harus berupa data URL yang valid.");
  }

  return stringValue;
}
