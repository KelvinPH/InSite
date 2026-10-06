"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Grid3x3,
  LayoutList,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { SignOutButton } from "@/components/sign-out-button";

const nav = [
  { href: "/sites", label: "Sites", icon: LayoutList },
  { href: "/matrix", label: "Matrix", icon: Grid3x3 },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({
  workspaces,
  activeId,
  email,
}: {
  workspaces: { id: string; name: string; role: string }[];
  activeId: string | null;
  email: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <div className="flex items-center justify-between gap-3 px-1 md:block">
        <Link
          href="/sites"
          className="text-[1.2rem] font-semibold tracking-tight text-[var(--midnight)]"
        >
          InSite
        </Link>
        <div className="md:hidden">
          <WorkspaceSwitcher workspaces={workspaces} activeId={activeId} />
        </div>
      </div>

      <nav className="app-sidebar-nav">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("app-sidebar-link", active && "is-active")}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden space-y-3 border-t border-[var(--hairline)] pt-4 md:block">
        <WorkspaceSwitcher workspaces={workspaces} activeId={activeId} />
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="truncate text-xs text-[var(--muted)]" title={email}>
            {email}
          </p>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
