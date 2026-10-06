/**
 * Connection key = base64url(JSON.stringify({ url, secret }))
 * Shown in WP admin for pasting into the InSite dashboard.
 */

export type ConnectionPayload = {
  url: string;
  secret: string;
};

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob !== "undefined") {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(padded, "base64"));
}

export function encodeConnectionKey(payload: ConnectionPayload): string {
  const json = JSON.stringify({
    url: payload.url.replace(/\/$/, ""),
    secret: payload.secret,
  });
  return encodeBase64Url(new TextEncoder().encode(json));
}

export function decodeConnectionKey(key: string): ConnectionPayload {
  const trimmed = key.trim();
  let json: string;
  try {
    json = new TextDecoder().decode(decodeBase64Url(trimmed));
  } catch {
    throw new Error("Invalid connection key encoding");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid connection key payload");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as ConnectionPayload).url !== "string" ||
    typeof (parsed as ConnectionPayload).secret !== "string"
  ) {
    throw new Error("Invalid connection key shape");
  }
  const { url, secret } = parsed as ConnectionPayload;
  if (!url || !secret) {
    throw new Error("Connection key missing url or secret");
  }
  return { url: url.replace(/\/$/, ""), secret };
}
