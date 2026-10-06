"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createGroupAction } from "@/app/actions/organize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateGroupForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-[var(--purple)] underline-offset-2 hover:underline"
      >
        + New group
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      action={(fd) => {
        startTransition(async () => {
          try {
            await createGroupAction(fd);
            toast.success("Group created");
            setOpen(false);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        });
      }}
    >
      <Input
        name="name"
        placeholder="Group name"
        required
        autoFocus
        className="h-9 w-44"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Add"}
      </Button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-[var(--muted)] hover:text-[var(--midnight)]"
      >
        Cancel
      </button>
    </form>
  );
}
