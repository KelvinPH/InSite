"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SiteListRow({
  site,
  labels,
  wpVersion,
  phpVersion,
  pending,
  critical,
}: {
  site: {
    id: string;
    name: string;
    url: string;
    status: string;
    lastCheckedAt: Date | null;
  };
  labels: { id: string; name: string }[];
  wpVersion: string | null;
  phpVersion: string | null;
  pending: number;
  critical: number | null;
}) {
  return (
    <Link
      href={`/sites/${site.id}`}
      className="group grid grid-cols-1 items-center gap-2 py-3.5 sm:grid-cols-[minmax(0,1.8fr)_repeat(4,minmax(0,0.55fr))_auto] sm:gap-3"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-[var(--midnight)] transition-colors group-hover:text-[var(--purple)]">
            {site.name}
          </span>
          <Badge
            tone={site.status === "active" ? "ok" : "danger"}
            className="sm:hidden"
          >
            {site.status}
          </Badge>
        </div>
        <div className="mt-0.5 truncate text-xs text-[var(--muted)]">
          {site.url}
        </div>
        {labels.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {labels.map((l) => (
              <span
                key={l.id}
                className="rounded-full bg-[var(--veil)] px-2 py-0.5 text-[10px] font-medium text-[var(--purple)]"
              >
                {l.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="hidden tabular-nums text-[var(--charcoal)] sm:block">
        {wpVersion ?? "-"}
      </div>
      <div className="hidden tabular-nums text-[var(--charcoal)] sm:block">
        {phpVersion ?? "-"}
      </div>
      <div className="hidden sm:block">
        {pending > 0 ? (
          <Badge tone="warn">{pending}</Badge>
        ) : (
          <span className="text-[var(--muted)]">0</span>
        )}
      </div>
      <div className="hidden sm:block">
        {critical === null ? (
          <span className="text-[var(--muted)]">-</span>
        ) : critical > 0 ? (
          <Badge tone="danger">{critical}</Badge>
        ) : (
          <Badge tone="ok">OK</Badge>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-[var(--muted)]">
        <span className="hidden sm:inline">
          {site.lastCheckedAt
            ? new Date(site.lastCheckedAt).toLocaleString()
            : "-"}
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--purple)]"
          aria-hidden
        />
      </div>
    </Link>
  );
}
