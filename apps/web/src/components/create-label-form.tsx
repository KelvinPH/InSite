"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createLabelAction } from "@/app/actions/organize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateLabelForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--purple)] hover:underline"
      >
        + Label
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      action={(fd) => {
        startTransition(async () => {
          try {
            await createLabelAction(fd);
            toast.success("Label created");
            setOpen(false);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        });
      }}
    >
      <Input
        name="name"
        placeholder="Label"
        required
        autoFocus
        className="h-8 w-32 text-xs"
      />
      <Button type="submit" size="sm" disabled={pending}>
        Add
      </Button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-[var(--muted)]"
      >
        Cancel
      </button>
    </form>
  );
}
