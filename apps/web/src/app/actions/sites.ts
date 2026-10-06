"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import {
  activityLog,
  siteGroups,
  siteLabelAssignments,
  siteLabels,
  siteSnapshots,
  sites,
  updateJobItems,
  updateJobs,
} from "@insite/db";
import {
  decodeConnectionKey,
  type SiteHealthPayload,
  type SiteStatusPayload,
} from "@insite/shared";
import { revalidatePath } from "next/cache";
import { encryptSecret, decryptSecret } from "@/lib/encryption";
import { getDb } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { assertCanWrite, requireSite, requireWorkspace } from "@/lib/tenant";
import { nanoid } from "@/lib/utils";
import {
  fetchErrors,
  fetchHealth,
  fetchStatus,
  runUpdate,
  checkHomepage,
} from "@/lib/wp-client";

export async function addSiteAction(formData: FormData) {
  const ctx = await requireWorkspace();
  assertCanWrite(ctx);

  const key = String(formData.get("connectionKey") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const groupIdRaw = String(formData.get("groupId") ?? "").trim();
  const groupId = groupIdRaw || null;
  const labelIds = formData
    .getAll("labelIds")
    .map(String)
    .filter(Boolean);

  const { url, secret } = decodeConnectionKey(key);
  const status = await fetchStatus({ baseUrl: url, secret });
  const encryptedSecret = await encryptSecret(secret);
  const id = nanoid();
  const db = getDb();

  if (groupId) {
    const [group] = await db
      .select({ id: siteGroups.id })
      .from(siteGroups)
      .where(
        and(
          eq(siteGroups.id, groupId),
          eq(siteGroups.organizationId, ctx.organizationId),
        ),
      )
      .limit(1);
    if (!group) throw new Error("Group not found");
  }

  if (labelIds.length > 0) {
    const owned = await db
      .select({ id: siteLabels.id })
      .from(siteLabels)
      .where(
        and(
          eq(siteLabels.organizationId, ctx.organizationId),
          inArray(siteLabels.id, labelIds),
        ),
      );
    if (owned.length !== labelIds.length) {
      throw new Error("Invalid labels");
    }
  }

  await db.insert(sites).values({
    id,
    organizationId: ctx.organizationId,
    groupId,
    name: name || new URL(url).hostname,
    url,
    encryptedSecret,
    status: "active",
    lastCheckedAt: new Date(),
  });

  if (labelIds.length > 0) {
    await db.insert(siteLabelAssignments).values(
      labelIds.map((labelId) => ({ siteId: id, labelId })),
    );
  }

  await db.insert(siteSnapshots).values({
    id: nanoid(),
    siteId: id,
    kind: "status",
    payload: status,
  });

  await db.insert(activityLog).values({
    id: nanoid(),
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    siteId: id,
    action: "site_added",
    meta: { url },
  });

  revalidatePath("/sites");
  return { id };
}

export async function refreshSiteAction(siteId: string) {
  const { ctx, site } = await requireSite(siteId);
  assertCanWrite(ctx);
  await inngest.send({
    name: "insite/sites.refresh",
    data: { siteId: site.id },
  });
  revalidatePath(`/sites/${siteId}`);
  revalidatePath("/sites");
  return { ok: true };
}

export async function runHealthCheckAction(siteId: string) {
  const { ctx, site } = await requireSite(siteId);
  assertCanWrite(ctx);
  const secret = await decryptSecret(site.encryptedSecret);
  const health = await fetchHealth({ baseUrl: site.url, secret });
  const db = getDb();
  await db.insert(siteSnapshots).values({
    id: nanoid(),
    siteId: site.id,
    kind: "health",
    payload: health,
  });
  revalidatePath(`/sites/${siteId}`);
  return health;
}

export async function updateOnSiteAction(
  siteId: string,
  type: "core" | "plugin" | "theme",
  slug: string,
) {
  const { ctx, site } = await requireSite(siteId);
  assertCanWrite(ctx);
  const secret = await decryptSecret(site.encryptedSecret);
  const result = await runUpdate(
    { baseUrl: site.url, secret },
    { type, slug },
  );
  const db = getDb();

  if (result.success) {
    const homeStatus = await checkHomepage(site.url);
    if (homeStatus !== 200) {
      await db
        .update(sites)
        .set({
          status: "error",
          lastError: `Homepage check failed (HTTP ${homeStatus})`,
          updatedAt: new Date(),
        })
        .where(eq(sites.id, site.id));
      await db.insert(activityLog).values({
        id: nanoid(),
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        siteId: site.id,
        action: "update_home_check_failed",
        meta: { type, slug, from: result.beforeVersion, to: result.afterVersion, homeStatus },
      });
      revalidatePath(`/sites/${siteId}`);
      return { ...result, success: false, error: `Homepage check failed (HTTP ${homeStatus})` };
    }
  }

  await db.insert(activityLog).values({
    id: nanoid(),
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    siteId: site.id,
    action: result.success ? "update_success" : "update_failed",
    meta: {
      type,
      slug,
      from: result.beforeVersion,
      to: result.afterVersion,
      error: result.error,
    },
  });

  if (result.success) {
    await inngest.send({
      name: "insite/sites.refresh",
      data: { siteId: site.id },
    });
  } else {
    await db
      .update(sites)
      .set({ status: "error", lastError: result.error, updatedAt: new Date() })
      .where(eq(sites.id, site.id));
  }

  revalidatePath(`/sites/${siteId}`);
  revalidatePath("/matrix");
  return result;
}

export async function bulkUpdatePluginAction(pluginSlug: string) {
  const ctx = await requireWorkspace();
  assertCanWrite(ctx);
  const db = getDb();

  const orgSites = await db
    .select()
    .from(sites)
    .where(eq(sites.organizationId, ctx.organizationId));

  const targets: { siteId: string }[] = [];
  for (const site of orgSites) {
    const [snap] = await db
      .select()
      .from(siteSnapshots)
      .where(
        and(eq(siteSnapshots.siteId, site.id), eq(siteSnapshots.kind, "status")),
      )
      .orderBy(desc(siteSnapshots.createdAt))
      .limit(1);
    if (!snap) continue;
    const payload = snap.payload as SiteStatusPayload;
    const plugin = payload.plugins.find((p) => p.slug === pluginSlug);
    if (plugin?.availableVersion) {
      targets.push({ siteId: site.id });
    }
  }

  if (targets.length === 0) {
    return { error: "No sites need this update" };
  }

  const jobId = nanoid();
  await db.insert(updateJobs).values({
    id: jobId,
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    targetType: "plugin",
    targetSlug: pluginSlug,
    status: "pending",
  });

  for (const t of targets) {
    await db.insert(updateJobItems).values({
      id: nanoid(),
      jobId,
      siteId: t.siteId,
      status: "pending",
    });
  }

  await inngest.send({
    name: "insite/updates.bulk",
    data: { jobId },
  });

  await db.insert(activityLog).values({
    id: nanoid(),
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    action: "bulk_update_started",
    meta: { pluginSlug, siteCount: targets.length, jobId },
  });

  revalidatePath("/matrix");
  revalidatePath("/activity");
  return { jobId, siteCount: targets.length };
}

export async function inviteMemberAction(formData: FormData): Promise<void> {
  const ctx = await requireWorkspace();
  assertCanWrite(ctx);
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "member");
  if (!email) return;

  const { auth } = await import("@/lib/auth");
  const { headers } = await import("next/headers");
  await auth.api.createInvitation({
    body: {
      email,
      role: role === "admin" ? "admin" : "member",
      organizationId: ctx.organizationId,
    },
    headers: await headers(),
  });

  revalidatePath("/settings");
}

export async function renameWorkspaceAction(formData: FormData): Promise<void> {
  const ctx = await requireWorkspace();
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return;
  }
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { auth } = await import("@/lib/auth");
  const { headers } = await import("next/headers");
  await auth.api.updateOrganization({
    body: { data: { name }, organizationId: ctx.organizationId },
    headers: await headers(),
  });
  revalidatePath("/settings");
}

export async function getSiteErrorsAction(siteId: string) {
  const { site } = await requireSite(siteId);
  const secret = await decryptSecret(site.encryptedSecret);
  return fetchErrors({ baseUrl: site.url, secret });
}
