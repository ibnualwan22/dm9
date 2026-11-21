export const ADMIN_COOKIE_NAME = "dm9_admin_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 Hari

function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    "dm9-hmac-secret-key-change-in-production-2026"
  );
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "diesmiladis9-supersecret";
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  return bufferToHex(signature);
}

export function verifyAdminPassword(inputPassword: string): boolean {
  const expected = getAdminPassword();
  return inputPassword === expected;
}

export async function createAdminSessionToken(): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const expiresAtMs = Date.now() + SESSION_DURATION_MS;
  const payload = `admin.${expiresAtMs}`;
  const signature = await hmacSha256Hex(getSessionSecret(), payload);
  return {
    token: `${payload}.${signature}`,
    expiresAt: new Date(expiresAtMs),
  };
}

export async function verifyAdminSessionToken(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [role, expiresAtStr, signature] = parts;
  if (role !== "admin") return false;

  const expiresAtMs = Number(expiresAtStr);
  if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
    return false;
  }

  const payload = `${role}.${expiresAtStr}`;
  const expectedSig = await hmacSha256Hex(getSessionSecret(), payload);
  return signature === expectedSig;
}
