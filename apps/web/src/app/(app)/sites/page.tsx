import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Plug } from "lucide-react";
import {
  siteGroups,
  siteLabelAssignments,
  siteLabels,
  siteSnapshots,
  sites,
} from "@insite/db";
import type { SiteHealthPayload, SiteStatusPayload } from "@insite/shared";
import { CreateGroupForm } from "@/components/create-group-form";
import { CreateLabelForm } from "@/components/create-label-form";
import { EmptyState } from "@/components/empty-state";
import { MotionPage } from "@/components/motion";
import { PageHeader } from "@/components/page-header";
import { SiteListRow } from "@/components/site-list-row";
import { ButtonLink } from "@/components/ui/button-link";
import { countPendingUpdates } from "@/lib/status-utils";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";
import { requireWorkspace } from "@/lib/tenant";

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ label?: string }>;
}) {
  const { label: labelFilter } = await searchParams;
  const ctx = await requireWorkspace();
  const db = getDb();
  const canWrite = ctx.role !== "member";

  const [groups, labels, rows] = await Promise.all([
    db
      .select()
      .from(siteGroups)
      .where(eq(siteGroups.organizationId, ctx.organizationId))
      .orderBy(asc(siteGroups.sortOrder), asc(siteGroups.name)),
    db
      .select()
      .from(siteLabels)
      .where(eq(siteLabels.organizationId, ctx.organizationId))
      .orderBy(asc(siteLabels.name)),
    db
      .select()
      .from(sites)
      .where(eq(sites.organizationId, ctx.organizationId))
      .orderBy(asc(sites.name)),
  ]);

  const siteIds = rows.map((r) => r.id);
  const assignments =
    siteIds.length === 0
      ? []
      : await db
          .select({
            siteId: siteLabelAssignments.siteId,
            labelId: siteLabelAssignments.labelId,
            labelName: siteLabels.name,
          })
          .from(siteLabelAssignments)
          .innerJoin(
            siteLabels,
            eq(siteLabelAssignments.labelId, siteLabels.id),
          )
          .where(inArray(siteLabelAssignments.siteId, siteIds));

  const labelsBySite = new Map<string, { id: string; name: string }[]>();
  for (const a of assignments) {
    const list = labelsBySite.get(a.siteId) ?? [];
    list.push({ id: a.labelId, name: a.labelName });
    labelsBySite.set(a.siteId, list);
  }

  const filtered = labelFilter
    ? rows.filter((site) =>
        (labelsBySite.get(site.id) ?? []).some((l) => l.id === labelFilter),
      )
    : rows;

  const snapshots =
    filtered.length === 0
      ? []
      : await db
          .select()
          .from(siteSnapshots)
          .where(
            and(
              inArray(
                siteSnapshots.siteId,
                filtered.map((r) => r.id),
              ),
              eq(siteSnapshots.kind, "status"),
            ),
          )
          .orderBy(desc(siteSnapshots.createdAt));

  const latestStatus = new Map<string, SiteStatusPayload>();
  for (const snap of snapshots) {
    if (!latestStatus.has(snap.siteId)) {
      latestStatus.set(snap.siteId, snap.payload as SiteStatusPayload);
    }
  }

  const healthSnaps =
    filtered.length === 0
      ? []
      : await db
          .select()
          .from(siteSnapshots)
          .where(
            and(
              inArray(
                siteSnapshots.siteId,
                filtered.map((r) => r.id),
              ),
              eq(siteSnapshots.kind, "health"),
            ),
          )
          .orderBy(desc(siteSnapshots.createdAt));

  const latestHealth = new Map<string, SiteHealthPayload>();
  for (const snap of healthSnaps) {
    if (!latestHealth.has(snap.siteId)) {
      latestHealth.set(snap.siteId, snap.payload as SiteHealthPayload);
    }
  }

  const sections: {
    key: string;
    title: string;
    sites: typeof filtered;
  }[] = [
    ...groups.map((g) => ({
      key: g.id,
      title: g.name,
      sites: filtered.filter((s) => s.groupId === g.id),
    })),
    {
      key: "ungrouped",
      title: groups.length > 0 ? "Ungrouped" : "All sites",
      sites: filtered.filter((s) => !s.groupId),
    },
  ].filter(
    (s) =>
      s.sites.length > 0 || (s.key !== "ungrouped" && !labelFilter),
  );

  return (
    <MotionPage>
      <PageHeader
        title="Sites"
        description="WordPress sites in this workspace: versions, updates, and health."
        actions={
          canWrite ? (
            <ButtonLink href="/sites/add">Add site</ButtonLink>
          ) : undefined
        }
      />

      {rows.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          {canWrite ? <CreateGroupForm /> : null}
          <div className="flex flex-wrap items-center gap-2">
            {(labels.length > 0 || canWrite) && (
              <>
                <Link
                  href="/sites"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    !labelFilter
                      ? "bg-[var(--midnight)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--midnight)]",
                  )}
                >
                  All
                </Link>
                {labels.map((l) => (
                  <Link
                    key={l.id}
                    href={`/sites?label=${l.id}`}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      labelFilter === l.id
                        ? "bg-[var(--midnight)] text-white"
                        : "text-[var(--muted)] hover:text-[var(--midnight)]",
                    )}
                  >
                    {l.name}
                  </Link>
                ))}
              </>
            )}
            {canWrite ? <CreateLabelForm /> : null}
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Plug strokeWidth={1.75} className="h-6 w-6" aria-hidden />}
          title="Connect your first site"
          description="Install the InSite Connector on WordPress, copy the key from Tools → InSite, and paste it here."
          action={
            canWrite ? (
              <div className="flex flex-col items-stretch gap-6 sm:items-center">
                <ButtonLink href="/sites/add" size="lg">
                  Add your first site
                </ButtonLink>
              </div>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-sm text-[var(--muted)]">
          No sites match this label.{" "}
          <Link href="/sites" className="text-[var(--purple)] hover:underline">
            Clear filter
          </Link>
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {sections.map((section) => (
            <section key={section.key} className="animate-in">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-wide text-[var(--midnight)]">
                  {section.title}
                </h2>
                <span className="text-xs tabular-nums text-[var(--muted)]">
                  {section.sites.length}
                </span>
              </div>
              {section.sites.length === 0 ? (
                <p className="border-t border-[var(--hairline)] py-4 text-sm text-[var(--muted)]">
                  No sites in this group yet. Open a site to assign it here.
                </p>
              ) : (
              <div className="divide-y divide-[var(--hairline)] border-t border-[var(--hairline)]">
                <div className="hidden grid-cols-[minmax(0,1.8fr)_repeat(4,minmax(0,0.55fr))_auto] gap-3 py-2 text-sm text-[var(--muted)] sm:grid">
                  <span>Site</span>
                  <span>WP</span>
                  <span>PHP</span>
                  <span>Updates</span>
                  <span>Health</span>
                  <span className="text-right">Checked</span>
                </div>
                {section.sites.map((site) => {
                  const status = latestStatus.get(site.id);
                  const health = latestHealth.get(site.id);
                  const pending = status ? countPendingUpdates(status) : 0;
                  const critical =
                    health?.issues.filter((i) => i.status === "critical")
                      .length ?? null;
                  return (
                    <SiteListRow
                      key={site.id}
                      site={site}
                      labels={labelsBySite.get(site.id) ?? []}
                      wpVersion={status?.wpVersion ?? null}
                      phpVersion={status?.phpVersion ?? null}
                      pending={pending}
                      critical={critical}
                    />
                  );
                })}
              </div>
              )}
            </section>
          ))}
        </div>
      )}
    </MotionPage>
  );
}
