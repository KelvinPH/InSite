"use client";

import { useState } from "react";
import type { SiteHealthPayload, SiteStatusPayload } from "@insite/shared";
import { ErrorsPanel, UpdateButton } from "@/components/site-actions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "plugins", label: "Plugins" },
  { id: "themes", label: "Themes" },
  { id: "health", label: "Health" },
  { id: "errors", label: "Errors" },
  { id: "activity", label: "Activity" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function SiteDetailSections({
  siteId,
  canWrite,
  status,
  health,
  activity,
}: {
  siteId: string;
  canWrite: boolean;
  status?: SiteStatusPayload;
  health?: SiteHealthPayload;
  activity: { id: string; action: string; createdAt: Date }[];
}) {
  const [tab, setTab] = useState<TabId>("plugins");

  return (
    <div className="mt-10">
      <div className="flex flex-wrap gap-1 border-b border-[var(--hairline)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-b-2 border-[var(--purple)] text-[var(--midnight)]"
                : "text-[var(--muted)] hover:text-[var(--midnight)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-5">
        {tab === "plugins" ? (
          !status ? (
            <p className="text-sm text-[var(--muted)]">No status snapshot yet.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="text-sm text-[var(--muted)]">
                <tr className="border-b border-[var(--hairline)]">
                  <th className="pb-2 pr-4 font-medium">Plugin</th>
                  <th className="pb-2 pr-4 font-medium">Installed</th>
                  <th className="pb-2 pr-4 font-medium">Available</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {status.plugins.map((p) => (
                  <tr
                    key={p.slug}
                    className="border-b border-[var(--hairline)] last:border-0"
                  >
                    <td className="py-3 pr-4">
                      {p.name}
                      {!p.active ? (
                        <Badge tone="neutral" className="ml-2">
                          inactive
                        </Badge>
                      ) : null}
                    </td>
                    <td
                      className={`py-3 pr-4 tabular-nums ${p.availableVersion ? "text-amber-800" : ""}`}
                    >
                      {p.version}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {p.availableVersion ?? "-"}
                    </td>
                    <td className="py-3">
                      {p.availableVersion ? (
                        <UpdateButton
                          siteId={siteId}
                          type="plugin"
                          slug={p.slug}
                          canWrite={canWrite}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}

        {tab === "themes" ? (
          !status ? (
            <p className="text-sm text-[var(--muted)]">No status snapshot yet.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="text-sm text-[var(--muted)]">
                <tr className="border-b border-[var(--hairline)]">
                  <th className="pb-2 pr-4 font-medium">Theme</th>
                  <th className="pb-2 pr-4 font-medium">Installed</th>
                  <th className="pb-2 pr-4 font-medium">Available</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {status.themes.map((t) => (
                  <tr
                    key={t.slug}
                    className="border-b border-[var(--hairline)] last:border-0"
                  >
                    <td className="py-3 pr-4">{t.name}</td>
                    <td
                      className={`py-3 pr-4 tabular-nums ${t.availableVersion ? "text-amber-800" : ""}`}
                    >
                      {t.version}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {t.availableVersion ?? "-"}
                    </td>
                    <td className="py-3">
                      {t.availableVersion ? (
                        <UpdateButton
                          siteId={siteId}
                          type="theme"
                          slug={t.slug}
                          canWrite={canWrite}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}

        {tab === "health" ? (
          !health ? (
            <p className="text-sm text-[var(--muted)]">
              No health results yet. Run a health check to populate this.
            </p>
          ) : health.issues.length === 0 ? (
            <p className="text-sm text-[var(--ok)]">No issues reported.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {health.issues.map((issue) => (
                <li key={issue.test} className="border-b border-[var(--hairline)] pb-3 last:border-0">
                  <div className="font-medium">
                    <span
                      className={
                        issue.status === "critical"
                          ? "text-[var(--danger)]"
                          : "text-amber-800"
                      }
                    >
                      {issue.status}
                    </span>
                    <span className="text-[var(--muted)]"> · </span>
                    {issue.label}
                  </div>
                  <p className="mt-1 text-[var(--muted)]">{issue.description}</p>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "errors" ? <ErrorsPanel siteId={siteId} /> : null}

        {tab === "activity" ? (
          activity.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No activity yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {activity.map((a) => (
                <li
                  key={a.id}
                  className="flex justify-between gap-4 border-b border-[var(--hairline)] py-2.5 last:border-0"
                >
                  <span>{a.action}</span>
                  <span className="tabular-nums text-[var(--muted)]">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  );
}
