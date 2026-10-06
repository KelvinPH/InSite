"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listOrganizeOptions } from "@/app/actions/organize";
import { addSiteAction } from "@/app/actions/sites";
import { MotionPage } from "@/components/motion";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AddSitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [labels, setLabels] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void listOrganizeOptions().then((opts) => {
      setGroups(opts.groups);
      setLabels(opts.labels);
    });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await addSiteAction(formData);
      toast.success("Site connected");
      router.push(`/sites/${result.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add site");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MotionPage className="mx-auto max-w-xl space-y-8">
      <PageHeader
        title="Add site"
        description="Paste the connection key from Tools → InSite on the WordPress site."
        actions={<ButtonLink href="/sites" variant="ghost">Cancel</ButtonLink>}
      />
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Optional; defaults to the site hostname"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="connectionKey">Connection key</Label>
          <Textarea
            id="connectionKey"
            name="connectionKey"
            required
            rows={4}
            placeholder="eyJ1cmwiOi..."
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="groupId">Group</Label>
          <select
            id="groupId"
            name="groupId"
            className="flex h-11 w-full rounded-2xl bg-white/70 px-4 text-sm ring-1 ring-[var(--hairline)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mid)]/35"
            defaultValue=""
          >
            <option value="">Ungrouped</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        {labels.length > 0 ? (
          <div className="space-y-2">
            <Label>Labels</Label>
            <div className="flex flex-wrap gap-3">
              {labels.map((l) => (
                <label
                  key={l.id}
                  className="inline-flex items-center gap-2 text-sm text-[var(--charcoal)]"
                >
                  <input type="checkbox" name="labelIds" value={l.id} />
                  {l.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Connecting…" : "Connect site"}
        </Button>
      </form>
    </MotionPage>
  );
}
