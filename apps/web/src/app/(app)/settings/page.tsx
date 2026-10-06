import { eq } from "drizzle-orm";
import { invitation, member, organization, user } from "@insite/db";
import {
  inviteMemberAction,
  renameWorkspaceAction,
} from "@/app/actions/sites";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MotionPage } from "@/components/motion";
import { PageHeader } from "@/components/page-header";
import { getDb } from "@/lib/db";
import { requireWorkspace } from "@/lib/tenant";

export default async function SettingsPage() {
  const ctx = await requireWorkspace();
  const db = getDb();
  const canWrite = ctx.role !== "member";

  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, ctx.organizationId))
    .limit(1);

  const members = await db
    .select({
      id: member.id,
      role: member.role,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, ctx.organizationId));

  const invites = await db
    .select()
    .from(invitation)
    .where(eq(invitation.organizationId, ctx.organizationId));

  return (
    <MotionPage className="mx-auto max-w-2xl space-y-10">
      <PageHeader
        title="Settings"
        description={`Workspace details, members, and invites. Your role: ${ctx.role}.`}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--midnight)]">
            Workspace
          </h2>
          <p className="text-sm text-[var(--muted)]">Rename this workspace.</p>
        </div>
        <form action={renameWorkspaceAction} className="flex gap-2">
          <Input
            name="name"
            defaultValue={org?.name ?? ""}
            disabled={!canWrite}
            required
          />
          {canWrite && <Button type="submit">Save</Button>}
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[var(--midnight)]">
          Members
        </h2>
        <ul className="divide-y divide-[var(--hairline)] border-t border-[var(--hairline)] text-sm">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <div className="font-medium text-[var(--midnight)]">{m.name}</div>
                <div className="truncate text-[var(--muted)]">{m.email}</div>
              </div>
              <Badge tone="accent">{m.role}</Badge>
            </li>
          ))}
        </ul>
      </section>

      {canWrite && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--midnight)]">
              Invite member
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Members are read-only. Admins can manage sites and updates.
            </p>
          </div>
          <form action={inviteMemberAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                className="flex h-11 w-full rounded-2xl bg-white/70 px-4 text-sm ring-1 ring-[var(--hairline)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mid)]/35"
                defaultValue="member"
              >
                <option value="member">Member (read-only)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit">Send invite</Button>
          </form>
          {invites.length > 0 && (
            <div className="border-t border-[var(--hairline)] pt-5">
              <h3 className="mb-2 text-sm font-medium">Pending invites</h3>
              <ul className="space-y-1.5 text-sm text-[var(--muted)]">
                {invites.map((i) => (
                  <li key={i.id}>
                    {i.email} · {i.role} · {i.status}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </MotionPage>
  );
}
