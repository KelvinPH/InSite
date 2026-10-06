export type PluginInfo = {
  slug: string;
  name: string;
  version: string;
  availableVersion: string | null;
  active: boolean;
};

export type ThemeInfo = {
  slug: string;
  name: string;
  version: string;
  availableVersion: string | null;
  active: boolean;
};

export type SiteStatusPayload = {
  siteUrl: string;
  wpVersion: string;
  phpVersion: string;
  activeTheme: ThemeInfo;
  plugins: PluginInfo[];
  themes: ThemeInfo[];
  coreUpdate: string | null;
  diskFreeBytes: number | null;
  memoryLimit: string | null;
};

export type SiteHealthIssue = {
  test: string;
  label: string;
  status: "critical" | "recommended" | "good";
  description: string;
};

export type SiteHealthPayload = {
  issues: SiteHealthIssue[];
};

export type UpdateTarget = {
  type: "core" | "plugin" | "theme";
  slug: string;
};

export type UpdateResult = {
  type: "core" | "plugin" | "theme";
  slug: string;
  beforeVersion: string | null;
  afterVersion: string | null;
  success: boolean;
  error: string | null;
};

export type WorkspaceRole = "owner" | "admin" | "member";
