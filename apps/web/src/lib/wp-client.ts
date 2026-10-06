import {
  createNonce,
  signRequest,
  type SiteHealthPayload,
  type SiteStatusPayload,
  type UpdateResult,
  type UpdateTarget,
} from "@insite/shared";

const DEFAULT_TIMEOUT_MS = 60_000;

export type WpClientOptions = {
  baseUrl: string;
  secret: string;
  timeoutMs?: number;
};

function restPath(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/wp-json/insite/v1${clean}`;
}

async function signedFetch(
  opts: WpClientOptions,
  method: string,
  path: string,
  body: string = "",
): Promise<Response> {
  const urlPath = restPath(path);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = createNonce();
  const signature = await signRequest({
    method,
    path: urlPath,
    timestamp,
    nonce,
    body,
    secret: opts.secret,
  });

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const res = await fetch(`${opts.baseUrl.replace(/\/$/, "")}${urlPath}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-InSite-Timestamp": timestamp,
        "X-InSite-Nonce": nonce,
        "X-InSite-Signature": signature,
        "User-Agent": "InSite-Dashboard/1.0",
      },
      body: method === "GET" || method === "HEAD" ? undefined : body,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Connector error ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export async function fetchStatus(
  opts: WpClientOptions,
): Promise<SiteStatusPayload> {
  const res = await signedFetch(opts, "GET", "/status");
  return parseJson<SiteStatusPayload>(res);
}

export async function fetchHealth(
  opts: WpClientOptions,
): Promise<SiteHealthPayload> {
  const res = await signedFetch(opts, "GET", "/health");
  return parseJson<SiteHealthPayload>(res);
}

export async function fetchErrors(
  opts: WpClientOptions,
  lines = 100,
): Promise<{ lines: string[]; available: boolean }> {
  const res = await signedFetch(opts, "GET", `/errors?lines=${lines}`);
  return parseJson(res);
}

export async function runUpdate(
  opts: WpClientOptions,
  target: UpdateTarget,
): Promise<UpdateResult> {
  const body = JSON.stringify({
    type: target.type,
    slug: target.slug,
  });
  const res = await signedFetch(opts, "POST", "/update", body);
  return parseJson<UpdateResult>(res);
}

export async function checkHomepage(url: string): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "InSite-Dashboard/1.0" },
    });
    return res.status;
  } finally {
    clearTimeout(timer);
  }
}
