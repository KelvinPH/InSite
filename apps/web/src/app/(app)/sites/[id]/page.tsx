import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  activityLog,
  siteGroups,
  siteLabelAssignments,
  siteLabels,
  siteSnapshots,
} from "@insite/db";
import type { SiteHealthPayload, SiteStatusPayload } from "@insite/shared";
import { SiteActions, UpdateButton } from "@/components/site-actions";
import { MotionPage } from "@/components/motion";
import { SiteDetailSections } from "@/components/site-detail-sections";
import { SiteOrganizeForm } from "@/components/site-organize-form";
import { getDb } from "@/lib/db";
import { requireSite } from "@/lib/tenant";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let siteCtx;
  try {
    siteCtx = await requireSite(id);
  } catch {
    notFound();
  }
  const { ctx, site } = siteCtx;
  const canWrite = ctx.role !== "member";
  const db = getDb();

  const [statusSnap] = await db
    .select()
    .from(siteSnapshots)
    .where(
      and(eq(siteSnapshots.siteId, site.id), eq(siteSnapshots.kind, "status")),
    )
    .orderBy(desc(siteSnapshots.createdAt))
    .limit(1);

  const [healthSnap] = await db
    .select()
    .from(siteSnapshots)
    .where(
      and(eq(siteSnapshots.siteId, site.id), eq(siteSnapshots.kind, "health")),
    )
    .orderBy(desc(siteSnapshots.createdAt))
    .limit(1);

  const status = statusSnap?.payload as SiteStatusPayload | undefined;
  const health = healthSnap?.payload as SiteHealthPayload | undefined;

  const activity = await db
    .select()
    .from(activityLog)
    .where(eq(activityLog.siteId, site.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(20);

  const [groups, allLabels, assignedLabels] = await Promise.all([
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
      .select({ labelId: siteLabelAssignments.labelId })
      .from(siteLabelAssignments)
      .where(eq(siteLabelAssignments.siteId, site.id)),
  ]);

  const groupName =
    groups.find((g) => g.id === site.groupId)?.name ?? "Ungrouped";
  const siteLabelNames = allLabels
    .filter((l) => assignedLabels.some((a) => a.labelId === l.id))
    .map((l) => l.name);

  return (
    <MotionPage>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/sites"
            className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--purple)]"
          >
            ← Sites
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--midnight)]">
            {site.name}
          </h1>
          <a
            href={site.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--purple)] hover:underline"
          >
            {site.url}
          </a>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {groupName}
            {siteLabelNames.length > 0
              ? ` · ${siteLabelNames.join(", ")}`
              : ""}
          </p>
          {site.lastError ? (
            <p className="mt-2 text-sm text-[var(--danger)]">{site.lastError}</p>
          ) : null}
        </div>
        <SiteActions siteId={site.id} canWrite={canWrite} />
      </div>

      <dl className="mt-8 grid gap-6 border-y border-[var(--hairline)] py-5 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-[var(--muted)]">WordPress</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--midnight)]">
            {status?.wpVersion ?? "-"}
          </dd>
          {status?.coreUpdate ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-amber-800">
              Update to {status.coreUpdate}
              <UpdateButton
                siteId={site.id}
                type="core"
                slug="wordpress"
                canWrite={canWrite}
              />
            </div>
          ) : null}
        </div>
        <div>
          <dt className="text-sm text-[var(--muted)]">PHP</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--midnight)]">
            {status?.phpVersion ?? "-"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-[var(--muted)]">Theme</dt>
          <dd className="mt-1 text-xl font-semibold text-[var(--midnight)]">
            {status?.activeTheme.name ?? "-"}
          </dd>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {status?.activeTheme.version}
          </p>
        </div>
      </dl>

      {canWrite ? (
        <details className="mt-6">
          <summary className="cursor-pointer list-none text-sm text-[var(--muted)] transition-colors hover:text-[var(--midnight)] [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 hover:underline">
              Edit group and labels
            </span>
          </summary>
          <div className="mt-4 border-t border-[var(--hairline)] pt-4">
            <SiteOrganizeForm
              siteId={site.id}
              groupId={site.groupId}
              labelIds={assignedLabels.map((a) => a.labelId)}
              groups={groups}
              labels={allLabels}
            />
          </div>
        </details>
      ) : null}

      <SiteDetailSections
        siteId={site.id}
        canWrite={canWrite}
        status={status}
        health={health}
        activity={activity}
      />
    </MotionPage>
  );
}
