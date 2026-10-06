import type { WorkspaceRole } from "@insite/shared";

export type WorkspaceContext = {
  userId: string;
  organizationId: string;
  role: WorkspaceRole;
  email: string;
  name: string;
};

export class TenantError extends Error {
  constructor(
    message: string,
    public status: number = 403,
  ) {
    super(message);
    this.name = "TenantError";
  }
}

export function assertCanWrite(ctx: WorkspaceContext) {
  if (ctx.role === "member") {
    throw new TenantError("Members have read-only access", 403);
  }
}
