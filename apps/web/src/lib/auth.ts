import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import * as schema from "@insite/db";
import { getDb } from "./db";
import { nanoid } from "./utils";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        organization: schema.organization,
        member: schema.member,
        invitation: schema.invitation,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const db = getDb();
            const domain = user.email.split("@")[1] ?? "workspace";
            const personalDomains = new Set([
              "gmail.com",
              "outlook.com",
              "hotmail.com",
              "yahoo.com",
              "icloud.com",
            ]);
            const name = personalDomains.has(domain.toLowerCase())
              ? `${user.name}'s Workspace`
              : `${domain} Workspace`;
            const slug = `${domain
              .replace(/[^a-z0-9]+/gi, "-")
              .toLowerCase()
              .replace(/^-|-$/g, "")}-${user.id.slice(0, 8)}`;
            const orgId = nanoid();
            const now = new Date();
            await db.insert(schema.organization).values({
              id: orgId,
              name,
              slug,
              createdAt: now,
            });
            await db.insert(schema.member).values({
              id: nanoid(),
              organizationId: orgId,
              userId: user.id,
              role: "owner",
              createdAt: now,
            });
            // Stash for the session.create hook in the same signup request.
            (globalThis as unknown as { __insitePendingOrg?: Record<string, string> })
              .__insitePendingOrg ??= {};
            (
              globalThis as unknown as {
                __insitePendingOrg: Record<string, string>;
              }
            ).__insitePendingOrg[user.id] = orgId;
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            if (session.activeOrganizationId) {
              return { data: session };
            }
            const pending = (
              globalThis as unknown as {
                __insitePendingOrg?: Record<string, string>;
              }
            ).__insitePendingOrg?.[session.userId];
            if (pending) {
              delete (
                globalThis as unknown as {
                  __insitePendingOrg: Record<string, string>;
                }
              ).__insitePendingOrg[session.userId];
              return {
                data: {
                  ...session,
                  activeOrganizationId: pending,
                },
              };
            }
            const db = getDb();
            const [membership] = await db
              .select()
              .from(schema.member)
              .where(eq(schema.member.userId, session.userId))
              .limit(1);
            return {
              data: {
                ...session,
                activeOrganizationId: membership?.organizationId ?? null,
              },
            };
          },
        },
      },
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: true,
        organizationLimit: 20,
        membershipLimit: 100,
        creatorRole: "owner",
        invitationExpiresIn: 60 * 60 * 48,
        async sendInvitationEmail(data) {
          const resend = getResend();
          const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?invitationId=${data.id}`;
          if (!resend) {
            console.log(
              "[insite] invite link (no RESEND_API_KEY):",
              inviteLink,
            );
            return;
          }
          await resend.emails.send({
            from: process.env.EMAIL_FROM ?? "InSite <onboarding@resend.dev>",
            to: data.email,
            subject: `Join ${data.organization.name} on InSite`,
            html: `<p>You have been invited to join <strong>${data.organization.name}</strong> on InSite.</p>
                 <p><a href="${inviteLink}">Accept invitation</a></p>`,
          });
        },
      }),
    ],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { __insiteAuth?: AuthInstance };

export const auth: AuthInstance =
  globalForAuth.__insiteAuth ?? createAuth();

if (process.env.NODE_ENV !== "production") {
  globalForAuth.__insiteAuth = auth;
}

export type Session = typeof auth.$Infer.Session;
