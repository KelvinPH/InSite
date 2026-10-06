# Site groups + labels

## Goal

Organize sites with a primary **group** (list sections) and optional **labels** (filter chips). Fix Sites row affordance so rows look clickable.

## Data

- `site_groups`: id, organizationId, name, sortOrder, createdAt, updatedAt
- `sites.groupId` nullable FK → `site_groups` (null = Ungrouped); on group delete, sites become ungrouped
- `site_labels`: id, organizationId, name, createdAt
- `site_label_assignments`: siteId, labelId (composite PK)
- Unique: group name per org, label name per org
- All queries scoped by organizationId

## UX

- Sites list: sections by group (Ungrouped last). Labels as chips under URL.
- Whole row is a link to site detail; chevron affordance; hover = name color + chevron, no grey wash.
- Label filter chips above the list (optional, client or query param).
- Manage groups/labels: inline on Sites (create/rename/delete) for owner/admin.
- Add site: optional group + labels.
- Site detail: change group / labels.

## Permissions

- member: read
- owner/admin: write groups, labels, assignments
