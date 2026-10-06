"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: { id: string; name: string; role: string }[];
  activeId: string | null;
}) {
  const router = useRouter();

  if (workspaces.length === 0) {
    return null;
  }

  return (
    <label className="relative inline-flex min-w-0 items-center">
      <span className="sr-only">Workspace</span>
      <select
        className="h-9 max-w-[200px] cursor-pointer appearance-none truncate rounded-full bg-[var(--surface)] py-1.5 pl-3.5 pr-8 text-sm font-medium text-[var(--midnight)] transition duration-200 hover:bg-[var(--veil)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mid)]/35"
        value={activeId ?? workspaces[0]!.id}
        onChange={async (e) => {
          await authClient.organization.setActive({
            organizationId: e.target.value,
          });
          router.refresh();
        }}
      >
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-[var(--muted)]"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </label>
  );
}
