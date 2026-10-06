import type { SiteStatusPayload } from "@insite/shared";

export function countPendingUpdates(payload: SiteStatusPayload): number {
  let n = payload.coreUpdate ? 1 : 0;
  for (const p of payload.plugins) {
    if (p.availableVersion) n += 1;
  }
  for (const t of payload.themes) {
    if (t.availableVersion) n += 1;
  }
  return n;
}
