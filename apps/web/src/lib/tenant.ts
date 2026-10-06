import { and, eq } from "drizzle-orm";
import { member, session as sessionTable, sites } from "@insite/db";
import type { WorkspaceRole } from "@insite/shared";
import { headers } from "next/headers";
import { auth } from "./auth";
import { getDb } from "./db";
import {
  TenantError,
  assertCanWrite,
  type WorkspaceContext,
} from "./tenant-guards";

export { TenantError, assertCanWrite, type WorkspaceContext };

/**
 * Assert the current session user belongs to the given workspace.
 * Every app data access should go through this (or requireSite).
 *
 * If the session has no activeOrganizationId (common right after signup),
 * fall back to the user's first membership and persist it on the session.
 */
export async function requireWorkspace(
  organizationId?: string | null,
): Promise<WorkspaceContext> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session?.user) {
    throw new TenantError("Unauthorized", 401);
  }

  const db = getDb();
  let orgId =
    organizationId ?? session.session.activeOrganizationId ?? null;

  if (!orgId) {
    const [membership] = await db
      .select()
      .from(member)
      .where(eq(member.userId, session.user.id))
      .limit(1);

    if (!membership) {
      throw new TenantError("No active workspace", 400);
    }

    orgId = membership.organizationId;

    // Persist so subsequent requests and the org plugin stay in sync.
    await db
      .update(sessionTable)
      .set({ activeOrganizationId: orgId })
      .where(eq(sessionTable.id, session.session.id));

    try {
      await auth.api.setActiveOrganization({
        body: { organizationId: orgId },
        headers: hdrs,
      });
    } catch {
      // Session row update above is enough for this request.
    }
  }

  const [row] = await db
    .select()
    .from(member)
    .where(
      and(eq(member.organizationId, orgId), eq(member.userId, session.user.id)),
    )
    .limit(1);

  if (!row) {
    throw new TenantError("Not a member of this workspace", 403);
  }

  const role = row.role as WorkspaceRole;
  if (!["owner", "admin", "member"].includes(role)) {
    throw new TenantError("Invalid role", 403);
  }

  return {
    userId: session.user.id,
    organizationId: orgId,
    role,
    email: session.user.email,
    name: session.user.name,
  };
}

/** Load a site only if it belongs to the caller's workspace. */
export async function requireSite(siteId: string) {
  const ctx = await requireWorkspace();
  const db = getDb();
  const [site] = await db
    .select()
    .from(sites)
    .where(
      and(eq(sites.id, siteId), eq(sites.organizationId, ctx.organizationId)),
    )
    .limit(1);

  if (!site) {
    throw new TenantError("Site not found", 404);
  }

  return { ctx, site };
}
