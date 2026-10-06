import { eq } from "drizzle-orm";
import {
  activityLog,
  siteSnapshots,
  sites,
  updateJobItems,
  updateJobs,
} from "@insite/db";
import { decryptSecret } from "@/lib/encryption";
import { getDb } from "@/lib/db";
import { nanoid } from "@/lib/utils";
import {
  checkHomepage,
  fetchStatus,
  runUpdate,
} from "@/lib/wp-client";
import { inngest } from "./client";

export const refreshAllSites = inngest.createFunction(
  { id: "refresh-all-sites" },
  { event: "insite/sites.refresh-all" },
  async ({ step }) => {
    const db = getDb();
    const allSites = await step.run("list-sites", async () => {
      return db.select({ id: sites.id }).from(sites);
    });

    for (const site of allSites) {
      await step.run(`refresh-${site.id}`, async () => {
        await refreshOneSite(site.id);
      });
    }

    return { refreshed: allSites.length };
  },
);

export const refreshSite = inngest.createFunction(
  { id: "refresh-site" },
  { event: "insite/sites.refresh" },
  async ({ event, step }) => {
    const siteId = event.data.siteId as string;
    await step.run("refresh", async () => {
      await refreshOneSite(siteId);
    });
    return { siteId };
  },
);

export const runBulkUpdate = inngest.createFunction(
  { id: "bulk-update" },
  { event: "insite/updates.bulk" },
  async ({ event, step }) => {
    const jobId = event.data.jobId as string;
    const db = getDb();

    const job = await step.run("load-job", async () => {
      const [row] = await db
        .select()
        .from(updateJobs)
        .where(eq(updateJobs.id, jobId))
        .limit(1);
      return row;
    });

    if (!job) {
      return { error: "job_not_found" };
    }

    await step.run("mark-running", async () => {
      await db
        .update(updateJobs)
        .set({ status: "running" })
        .where(eq(updateJobs.id, jobId));
    });

    const items = await step.run("load-items", async () => {
      return db
        .select()
        .from(updateJobItems)
        .where(eq(updateJobItems.jobId, jobId));
    });

    let failed = false;

    for (const item of items) {
      if (failed) {
        await step.run(`skip-${item.id}`, async () => {
          await db
            .update(updateJobItems)
            .set({
              status: "skipped",
              error: "Stopped after previous failure",
              completedAt: new Date(),
            })
            .where(eq(updateJobItems.id, item.id));
        });
        continue;
      }

      const result = await step.run(`update-${item.id}`, async () => {
        const [site] = await db
          .select()
          .from(sites)
          .where(eq(sites.id, item.siteId))
          .limit(1);
        if (!site) {
          return { ok: false as const, error: "Site missing" };
        }

        const secret = await decryptSecret(site.encryptedSecret);
        try {
          const updateResult = await runUpdate(
            { baseUrl: site.url, secret },
            {
              type: job.targetType as "core" | "plugin" | "theme",
              slug: job.targetSlug,
            },
          );

          if (!updateResult.success) {
            await db
              .update(updateJobItems)
              .set({
                status: "failed",
                beforeVersion: updateResult.beforeVersion,
                afterVersion: updateResult.afterVersion,
                error: updateResult.error,
                completedAt: new Date(),
              })
              .where(eq(updateJobItems.id, item.id));
            await db
              .update(sites)
              .set({ status: "error", lastError: updateResult.error, updatedAt: new Date() })
              .where(eq(sites.id, site.id));
            await db.insert(activityLog).values({
              id: nanoid(),
              organizationId: job.organizationId,
              actorUserId: job.actorUserId,
              siteId: site.id,
              action: "update_failed",
              meta: {
                type: job.targetType,
                slug: job.targetSlug,
                error: updateResult.error,
              },
            });
            return { ok: false as const, error: updateResult.error ?? "Update failed" };
          }

          const homeStatus = await checkHomepage(site.url);
          if (homeStatus !== 200) {
            const err = `Homepage check failed (HTTP ${homeStatus})`;
            await db
              .update(updateJobItems)
              .set({
                status: "failed",
                beforeVersion: updateResult.beforeVersion,
                afterVersion: updateResult.afterVersion,
                homeCheckStatus: homeStatus,
                error: err,
                completedAt: new Date(),
              })
              .where(eq(updateJobItems.id, item.id));
            await db
              .update(sites)
              .set({ status: "error", lastError: err, updatedAt: new Date() })
              .where(eq(sites.id, site.id));
            await db.insert(activityLog).values({
              id: nanoid(),
              organizationId: job.organizationId,
              actorUserId: job.actorUserId,
              siteId: site.id,
              action: "update_home_check_failed",
              meta: {
                type: job.targetType,
                slug: job.targetSlug,
                from: updateResult.beforeVersion,
                to: updateResult.afterVersion,
                homeStatus,
              },
            });
            return { ok: false as const, error: err };
          }

          await db
            .update(updateJobItems)
            .set({
              status: "success",
              beforeVersion: updateResult.beforeVersion,
              afterVersion: updateResult.afterVersion,
              homeCheckStatus: homeStatus,
              completedAt: new Date(),
            })
            .where(eq(updateJobItems.id, item.id));

          await db.insert(activityLog).values({
            id: nanoid(),
            organizationId: job.organizationId,
            actorUserId: job.actorUserId,
            siteId: site.id,
            action: "update_success",
            meta: {
              type: job.targetType,
              slug: job.targetSlug,
              from: updateResult.beforeVersion,
              to: updateResult.afterVersion,
            },
          });

          // Refresh snapshot after successful update
          await refreshOneSite(site.id);

          return { ok: true as const };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          await db
            .update(updateJobItems)
            .set({
              status: "failed",
              error: message,
              completedAt: new Date(),
            })
            .where(eq(updateJobItems.id, item.id));
          await db
            .update(sites)
            .set({ status: "error", lastError: message, updatedAt: new Date() })
            .where(eq(sites.id, site.id));
          return { ok: false as const, error: message };
        }
      });

      if (!result.ok) {
        failed = true;
      }
    }

    await step.run("finalize", async () => {
      await db
        .update(updateJobs)
        .set({
          status: failed ? "failed" : "completed",
          completedAt: new Date(),
        })
        .where(eq(updateJobs.id, jobId));
    });

    return { jobId, failed };
  },
);

export async function refreshOneSite(siteId: string) {
  const db = getDb();
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) return;

  try {
    const secret = await decryptSecret(site.encryptedSecret);
    const payload = await fetchStatus({ baseUrl: site.url, secret });
    await db.insert(siteSnapshots).values({
      id: nanoid(),
      siteId: site.id,
      kind: "status",
      payload,
    });
    await db
      .update(sites)
      .set({
        status: "active",
        lastCheckedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
        name: site.name || new URL(site.url).hostname,
      })
      .where(eq(sites.id, site.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    await db
      .update(sites)
      .set({
        status: "error",
        lastError: message,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sites.id, siteId));
  }
}

export const functions = [refreshAllSites, refreshSite, runBulkUpdate];
