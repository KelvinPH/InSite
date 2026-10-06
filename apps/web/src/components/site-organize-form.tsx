"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createLabelAction,
  updateSiteOrganizationAction,
} from "@/app/actions/organize";
import { cn } from "@/lib/utils";

export function SiteOrganizeForm({
  siteId,
  groupId,
  labelIds,
  groups,
  labels: initialLabels,
}: {
  siteId: string;
  groupId: string | null;
  labelIds: string[];
  groups: { id: string; name: string }[];
  labels: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [labels, setLabels] = useState(initialLabels);
  const [selected, setSelected] = useState(() => new Set(labelIds));
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  function toggleLabel(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function createLabel() {
    const name = newLabel.trim();
    if (!name) return;
    const fd = new FormData();
    fd.set("name", name);
    startTransition(async () => {
      try {
        const created = await createLabelAction(fd);
        setLabels((prev) =>
          prev.some((l) => l.id === created.id)
            ? prev
            : [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setSelected((prev) => new Set(prev).add(created.id));
        setNewLabel("");
        setAdding(false);
        toast.success("Label added to workspace");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <form
      className="space-y-4"
      action={(fd) => {
        for (const id of selected) fd.append("labelIds", id);
        startTransition(async () => {
          try {
            await updateSiteOrganizationAction(fd);
            toast.success("Saved");
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        });
      }}
    >
      <input type="hidden" name="siteId" value={siteId} />

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <label className="min-w-[12rem] flex-1 space-y-1.5">
          <span className="block text-xs text-[var(--muted)]">Group</span>
          <select
            name="groupId"
            defaultValue={groupId ?? ""}
            className="w-full border-0 border-b border-[var(--hairline)] bg-transparent py-1.5 text-sm text-[var(--midnight)] focus-visible:border-[var(--purple)] focus-visible:outline-none"
          >
            <option value="">Ungrouped</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <div className="min-w-[12rem] flex-[2] space-y-1.5">
          <span className="block text-xs text-[var(--muted)]">
            Labels
            <span className="font-normal text-[var(--muted)]/70">
              {" "}
              (workspace-wide)
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5 py-0.5">
            {labels.map((l) => {
              const on = selected.has(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLabel(l.id)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs transition-colors",
                    on
                      ? "bg-[var(--midnight)] text-white"
                      : "text-[var(--muted)] ring-1 ring-[var(--hairline)] hover:text-[var(--midnight)]",
                  )}
                >
                  {l.name}
                </button>
              );
            })}
            {adding ? (
              <span className="inline-flex items-center gap-1.5">
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      createLabel();
                    }
                    if (e.key === "Escape") {
                      setAdding(false);
                      setNewLabel("");
                    }
                  }}
                  placeholder="New label"
                  autoFocus
                  className="w-28 border-0 border-b border-[var(--hairline)] bg-transparent py-1 text-xs text-[var(--midnight)] placeholder:text-[var(--muted)]/60 focus-visible:border-[var(--purple)] focus-visible:outline-none"
                />
                <button
                  type="button"
                  disabled={pending || !newLabel.trim()}
                  onClick={createLabel}
                  className="text-xs font-medium text-[var(--purple)] hover:underline disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setNewLabel("");
                  }}
                  className="text-xs text-[var(--muted)] hover:text-[var(--midnight)]"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="rounded-full px-2.5 py-1 text-xs text-[var(--muted)] ring-1 ring-dashed ring-[var(--hairline)] hover:text-[var(--midnight)]"
              >
                + New
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="shrink-0 pb-1.5 text-sm font-medium text-[var(--purple)] hover:underline disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
