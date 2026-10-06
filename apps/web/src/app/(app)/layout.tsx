import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { member, organization } from "@insite/db";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AppSidebar } from "@/components/app-sidebar";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const db = getDb();
  const memberships = await db
    .select({
      id: organization.id,
      name: organization.name,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, session.user.id));

  const activeId =
    session.session.activeOrganizationId ?? memberships[0]?.id ?? null;

  return (
    <div className="app-shell animate-in">
      <AppSidebar
        workspaces={memberships}
        activeId={activeId}
        email={session.user.email}
      />
      <div className="app-main">
        <header className="app-main-bar flex md:hidden">
          <SignOutButton />
        </header>
        <main className="app-main-content">{children}</main>
      </div>
    </div>
  );
}
