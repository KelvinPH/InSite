import { describe, expect, it } from "vitest";
import {
  TenantError,
  assertCanWrite,
  type WorkspaceContext,
} from "./tenant-guards";

describe("assertCanWrite", () => {
  const base: WorkspaceContext = {
    userId: "u1",
    organizationId: "o1",
    role: "owner",
    email: "a@b.com",
    name: "A",
  };

  it("allows owner and admin", () => {
    expect(() => assertCanWrite({ ...base, role: "owner" })).not.toThrow();
    expect(() => assertCanWrite({ ...base, role: "admin" })).not.toThrow();
  });

  it("blocks members", () => {
    expect(() => assertCanWrite({ ...base, role: "member" })).toThrow(
      TenantError,
    );
  });
});
