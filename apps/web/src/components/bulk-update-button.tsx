"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { bulkUpdatePluginAction } from "@/app/actions/sites";
import { Button } from "@/components/ui/button";

export function BulkUpdateButton({
  pluginSlug,
  canWrite,
}: {
  pluginSlug: string;
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
            const result = await bulkUpdatePluginAction(pluginSlug);
            if ("error" in result && result.error) {
              toast.error(result.error);
              return;
            }
            toast.success(
              `Bulk update started for ${result.siteCount} site(s)`,
            );
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        });
      }}
    >
      Update all
    </Button>
  );
}
