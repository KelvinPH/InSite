import { and, desc, eq, inArray } from "drizzle-orm";
import { siteSnapshots, sites } from "@insite/db";
import type { SiteStatusPayload } from "@insite/shared";
import { BulkUpdateButton } from "@/components/bulk-update-button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { MotionPage } from "@/components/motion";
import { ButtonLink } from "@/components/ui/button-link";
import { getDb } from "@/lib/db";
import { requireWorkspace } from "@/lib/tenant";

type Cell = {
  version: string | null;
  available: string | null;
  present: boolean;
};

export default async function MatrixPage() {
  const ctx = await requireWorkspace();
  const canWrite = ctx.role !== "member";
  const db = getDb();

  const orgSites = await db
    .select()
    .from(sites)
    .where(eq(sites.organizationId, ctx.organizationId))
    .orderBy(sites.name);

  const snaps =
    orgSites.length === 0
      ? []
      : await db
          .select()
          .from(siteSnapshots)
          .where(
            and(
              inArray(
                siteSnapshots.siteId,
                orgSites.map((s) => s.id),
              ),
              eq(siteSnapshots.kind, "status"),
            ),
          )
          .orderBy(desc(siteSnapshots.createdAt));

  const latest = new Map<string, SiteStatusPayload>();
  for (const snap of snaps) {
    if (!latest.has(snap.siteId)) {
      latest.set(snap.siteId, snap.payload as SiteStatusPayload);
    }
  }

  const pluginNames = new Map<string, string>();
  for (const payload of latest.values()) {
    for (const p of payload.plugins) {
      if (!pluginNames.has(p.slug)) {
        pluginNames.set(p.slug, p.name);
      }
    }
  }

  const pluginSlugs = [...pluginNames.keys()].sort((a, b) =>
    (pluginNames.get(a) ?? a).localeCompare(pluginNames.get(b) ?? b),
  );

  const matrix = new Map<string, Map<string, Cell>>();
  for (const slug of pluginSlugs) {
    const row = new Map<string, Cell>();
    for (const site of orgSites) {
      const payload = latest.get(site.id);
      const plugin = payload?.plugins.find((p) => p.slug === slug);
      row.set(site.id, {
        version: plugin?.version ?? null,
        available: plugin?.availableVersion ?? null,
        present: Boolean(plugin),
      });
    }
    matrix.set(slug, row);
  }

  return (
    <MotionPage>
      <PageHeader
        title="Plugin matrix"
        description="Installed versions across sites. Outdated cells are highlighted. Update a plugin everywhere in one pass."
      />

      {orgSites.length === 0 ? (
        <EmptyState
          title="No sites to compare"
          description="Connect WordPress sites first. The matrix fills in from each site's latest status snapshot."
          action={<ButtonLink href="/sites/add">Add a site</ButtonLink>}
        />
      ) : (
        <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-sm text-[var(--muted)]">
                <tr className="border-b border-[var(--hairline)]">
                  <th className="sticky left-0 bg-[var(--surface)] pb-3 pr-4 font-medium">
                    Plugin
                  </th>
                  {orgSites.map((site) => (
                    <th key={site.id} className="pb-3 pr-4 font-medium">
                      {site.name}
                    </th>
                  ))}
                  <th className="pb-3 font-medium">Bulk</th>
                </tr>
              </thead>
              <tbody>
                {pluginSlugs.map((slug) => {
                  const row = matrix.get(slug)!;
                  const anyOutdated = [...row.values()].some(
                    (c) => c.present && c.available,
                  );
                  return (
                    <tr
                      key={slug}
                      className="border-b border-[var(--hairline)] transition-colors last:border-0 hover:bg-white/50"
                    >
                      <td className="sticky left-0 bg-[var(--surface)] py-3.5 pr-4 font-medium">
                        {pluginNames.get(slug)}
                        <div className="text-xs font-normal text-[var(--muted)]">
                          {slug}
                        </div>
                      </td>
                      {orgSites.map((site) => {
                        const cell = row.get(site.id)!;
                        if (!cell.present) {
                          return (
                            <td
                              key={site.id}
                              className="py-3 pr-4 text-[var(--charcoal)]/30"
                            >
                              -
                            </td>
                          );
                        }
                        return (
                          <td
                            key={site.id}
                            className={`py-3 pr-4 tabular-nums ${cell.available ? "font-medium text-amber-900" : "text-[var(--charcoal)]"}`}
                            title={
                              cell.available
                                ? `Available: ${cell.available}`
                                : undefined
                            }
                          >
                            {cell.version}
                            {cell.available && (
                              <div className="text-xs font-normal text-amber-800/80">
                                → {cell.available}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3">
                        {anyOutdated && (
                          <BulkUpdateButton
                            pluginSlug={slug}
                            canWrite={canWrite}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
      )}
    </MotionPage>
  );
}
