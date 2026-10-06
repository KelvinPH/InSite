import { desc, eq } from "drizzle-orm";
import { activityLog, sites } from "@insite/db";
import { EmptyState } from "@/components/empty-state";
import { MotionPage } from "@/components/motion";
import { PageHeader } from "@/components/page-header";
import { getDb } from "@/lib/db";
import { requireWorkspace } from "@/lib/tenant";

export default async function ActivityPage() {
  const ctx = await requireWorkspace();
  const db = getDb();

  const rows = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      meta: activityLog.meta,
      createdAt: activityLog.createdAt,
      siteName: sites.name,
      siteId: activityLog.siteId,
    })
    .from(activityLog)
    .leftJoin(sites, eq(activityLog.siteId, sites.id))
    .where(eq(activityLog.organizationId, ctx.organizationId))
    .orderBy(desc(activityLog.createdAt))
    .limit(100);

  return (
    <MotionPage>
      <PageHeader
        title="Activity"
        description="Update actions and site events for this workspace."
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          description="Site connections, refreshes, and updates will show up here as you work."
        />
      ) : (
        <ul className="stagger divide-y divide-[var(--hairline)] border-t border-[var(--hairline)]">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-2 py-4 text-sm transition-colors duration-200 hover:bg-white/40"
            >
              <div>
                <div className="font-medium text-[var(--midnight)]">
                  {row.action}
                </div>
                <div className="mt-0.5 text-[var(--muted)]">
                  {row.siteName ?? "Workspace"}
                  {row.meta
                    ? ` · ${JSON.stringify(row.meta).slice(0, 120)}`
                    : ""}
                </div>
              </div>
              <div className="text-xs tabular-nums text-[var(--charcoal)]/60">
                {new Date(row.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </MotionPage>
  );
}
