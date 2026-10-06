/**
 * HMAC request signing for InSite ↔ WordPress connector.
 *
 * Canonical string (newline-separated):
 *   METHOD
 *   PATH
 *   TIMESTAMP
 *   NONCE
 *   BODY_HASH
 *
 * BODY_HASH = hex(sha256(rawBody)) — empty body uses sha256("")
 * Signature = hex(hmac-sha256(secret, canonical))
 * Headers: X-InSite-Timestamp, X-InSite-Nonce, X-InSite-Signature
 */

export const HMAC_MAX_SKEW_SECONDS = 300;

export type SignRequestInput = {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  body: string;
  secret: string;
};

export type VerifyRequestInput = SignRequestInput & {
  signature: string;
  nowSeconds?: number;
};

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(digest);
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return toHex(sig);
}

export function buildCanonicalString(input: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
}): string {
  return [
    input.method.toUpperCase(),
    input.path,
    input.timestamp,
    input.nonce,
    input.bodyHash,
  ].join("\n");
}

export async function hashBody(body: string): Promise<string> {
  return sha256Hex(body);
}

export async function signRequest(input: SignRequestInput): Promise<string> {
  const bodyHash = await hashBody(input.body);
  const canonical = buildCanonicalString({
    method: input.method,
    path: input.path,
    timestamp: input.timestamp,
    nonce: input.nonce,
    bodyHash,
  });
  return hmacSha256Hex(input.secret, canonical);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export async function verifyRequest(
  input: VerifyRequestInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "invalid_timestamp" };
  }
  if (Math.abs(now - ts) > HMAC_MAX_SKEW_SECONDS) {
    return { ok: false, reason: "timestamp_skew" };
  }
  const expected = await signRequest(input);
  if (!timingSafeEqual(expected, input.signature.toLowerCase())) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}
