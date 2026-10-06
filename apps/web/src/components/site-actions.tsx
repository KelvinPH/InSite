"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getSiteErrorsAction,
  refreshSiteAction,
  runHealthCheckAction,
  updateOnSiteAction,
} from "@/app/actions/sites";
import { Button } from "@/components/ui/button";
import type { PluginInfo, ThemeInfo, SiteHealthIssue } from "@insite/shared";

export function SiteActions({
  siteId,
  canWrite,
}: {
  siteId: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canWrite) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await refreshSiteAction(siteId);
            toast.success("Refresh queued");
            router.refresh();
          });
        }}
      >
        Refresh status
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            try {
              await runHealthCheckAction(siteId);
              toast.success("Health check complete");
              router.refresh();
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Health check failed",
              );
            }
          });
        }}
      >
        Run health check
      </Button>
    </div>
  );
}

export function UpdateButton({
  siteId,
  type,
  slug,
  canWrite,
}: {
  siteId: string;
  type: "core" | "plugin" | "theme";
  slug: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!canWrite) return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const result = await updateOnSiteAction(siteId, type, slug);
            if (result.success) {
              toast.success(`Updated ${slug}`);
            } else {
              toast.error(result.error ?? "Update failed");
            }
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Update failed");
          }
        });
      }}
    >
      Update
    </Button>
  );
}

export function ErrorsPanel({ siteId }: { siteId: string }) {
  const [lines, setLines] = useState<string[] | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            const result = await getSiteErrorsAction(siteId);
            setLines(result.lines);
            setAvailable(result.available);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Loading…" : "Load recent errors"}
      </Button>
      {available === false && (
        <p className="text-sm text-[var(--muted)]">
          debug.log is not available on this site.
        </p>
      )}
      {lines && lines.length > 0 && (
        <pre className="max-h-80 overflow-auto rounded-xl bg-[var(--midnight)] p-3 text-xs text-[var(--veil)]">
          {lines.join("\n")}
        </pre>
      )}
    </div>
  );
}

export type { PluginInfo, ThemeInfo, SiteHealthIssue };
