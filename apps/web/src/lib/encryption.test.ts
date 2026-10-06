import { describe, expect, it, beforeAll } from "vitest";
import { decryptSecret, encryptSecret } from "./encryption";

describe("AES-256-GCM encryption", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("round-trips secrets", async () => {
    const secret = "site-secret-value";
    const encrypted = await encryptSecret(secret);
    expect(encrypted).toContain(":");
    expect(await decryptSecret(encrypted)).toBe(secret);
  });
});
