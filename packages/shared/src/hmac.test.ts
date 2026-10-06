import { describe, expect, it } from "vitest";
import vectors from "../test-vectors.json";
import {
  decodeConnectionKey,
  encodeConnectionKey,
  signRequest,
  verifyRequest,
} from "../src/index.js";

describe("HMAC signing", () => {
  for (const v of vectors) {
    it(`matches vector: ${v.name}`, async () => {
      const signature = await signRequest({
        method: v.method,
        path: v.path,
        timestamp: v.timestamp,
        nonce: v.nonce,
        body: v.body,
        secret: v.secret,
      });
      expect(signature).toBe(v.signature);
    });

    it(`verifies vector: ${v.name}`, async () => {
      const result = await verifyRequest({
        method: v.method,
        path: v.path,
        timestamp: v.timestamp,
        nonce: v.nonce,
        body: v.body,
        secret: v.secret,
        signature: v.signature,
        nowSeconds: Number(v.timestamp),
      });
      expect(result).toEqual({ ok: true });
    });
  }

  it("rejects skewed timestamp", async () => {
    const v = vectors[0]!;
    const result = await verifyRequest({
      method: v.method,
      path: v.path,
      timestamp: v.timestamp,
      nonce: v.nonce,
      body: v.body,
      secret: v.secret,
      signature: v.signature,
      nowSeconds: Number(v.timestamp) + 400,
    });
    expect(result).toEqual({ ok: false, reason: "timestamp_skew" });
  });
});

describe("connection key", () => {
  it("round-trips", () => {
    const key = encodeConnectionKey({
      url: "https://example.com/",
      secret: "site-secret",
    });
    expect(decodeConnectionKey(key)).toEqual({
      url: "https://example.com",
      secret: "site-secret",
    });
  });
});
