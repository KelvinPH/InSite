"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import {
  siteGroups,
  siteLabelAssignments,
  siteLabels,
  sites,
} from "@insite/db";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { assertCanWrite, requireSite, requireWorkspace } from "@/lib/tenant";
import { nanoid } from "@/lib/utils";

function revalidateSites(siteId?: string) {
  revalidatePath("/sites");
  revalidatePath("/sites/add");
  if (siteId) revalidatePath(`/sites/${siteId}`);
}

export async function createGroupAction(formData: FormData) {
  const ctx = await requireWorkspace();
  assertCanWrite(ctx);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Group name is required");

  const db = getDb();
  const existing = await db
    .select({ id: siteGroups.id })
    .from(siteGroups)
    .where(eq(siteGroups.organizationId, ctx.organizationId));

  await db.insert(siteGroups).values({
    id: nanoid(),
    organizationId: ctx.organizationId,
    name,
    sortOrder: existing.length,
  });
  revalidateSites();
}

export async function renameGroupAction(formData: FormData) {
  const ctx = await requireWorkspace();
  assertCanWrite(ctx);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) throw new Error("Group id and name are required");

  const db = getDb();
  await db
    .update(siteGroups)
    .set({ name, updatedAt: new Date() })
    .where(
      and(
        eq(siteGroups.id, id),
        eq(siteGroups.organizationId, ctx.organizationId),
      ),
    );
  revalidateSites();
}

export async function deleteGroupAction(formData: FormData) {
  const ctx = await requireWorkspace();
  assertCanWrite(ctx);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = getDb();
  await db
    .delete(siteGroups)
    .where(
      and(
        eq(siteGroups.id, id),
        eq(siteGroups.organizationId, ctx.organizationId),
      ),
    );
  revalidateSites();
}

export async function createLabelAction(formData: FormData) {
  const ctx = await requireWorkspace();
  assertCanWrite(ctx);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Label name is required");

  const id = nanoid();
  const db = getDb();
  await db.insert(siteLabels).values({
    id,
    organizationId: ctx.organizationId,
    name,
  });
  revalidateSites();
  return { id, name };
}

export async function deleteLabelAction(formData: FormData) {
  const ctx = await requireWorkspace();
  assertCanWrite(ctx);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = getDb();
  await db
    .delete(siteLabels)
    .where(
      and(
        eq(siteLabels.id, id),
        eq(siteLabels.organizationId, ctx.organizationId),
      ),
    );
  revalidateSites();
}

export async function updateSiteOrganizationAction(formData: FormData) {
  const siteId = String(formData.get("siteId") ?? "");
  const { ctx, site } = await requireSite(siteId);
  assertCanWrite(ctx);

  const groupIdRaw = String(formData.get("groupId") ?? "").trim();
  const groupId = groupIdRaw || null;
  const labelIds = formData
    .getAll("labelIds")
    .map(String)
    .filter(Boolean);

  const db = getDb();

  if (groupId) {
    const [group] = await db
      .select({ id: siteGroups.id })
      .from(siteGroups)
      .where(
        and(
          eq(siteGroups.id, groupId),
          eq(siteGroups.organizationId, ctx.organizationId),
        ),
      )
      .limit(1);
    if (!group) throw new Error("Group not found");
  }

  if (labelIds.length > 0) {
    const owned = await db
      .select({ id: siteLabels.id })
      .from(siteLabels)
      .where(
        and(
          eq(siteLabels.organizationId, ctx.organizationId),
          inArray(siteLabels.id, labelIds),
        ),
      );
    if (owned.length !== labelIds.length) {
      throw new Error("Invalid labels");
    }
  }

  await db
    .update(sites)
    .set({ groupId, updatedAt: new Date() })
    .where(eq(sites.id, site.id));

  await db
    .delete(siteLabelAssignments)
    .where(eq(siteLabelAssignments.siteId, site.id));

  if (labelIds.length > 0) {
    await db.insert(siteLabelAssignments).values(
      labelIds.map((labelId) => ({ siteId: site.id, labelId })),
    );
  }

  revalidateSites(site.id);
}

export async function listOrganizeOptions() {
  const ctx = await requireWorkspace();
  const db = getDb();
  const [groups, labels] = await Promise.all([
    db
      .select()
      .from(siteGroups)
      .where(eq(siteGroups.organizationId, ctx.organizationId))
      .orderBy(asc(siteGroups.sortOrder), asc(siteGroups.name)),
    db
      .select()
      .from(siteLabels)
      .where(eq(siteLabels.organizationId, ctx.organizationId))
      .orderBy(asc(siteLabels.name)),
  ]);
  return { groups, labels };
}
