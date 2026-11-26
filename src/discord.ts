export interface Env {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  ADMIN_SECRET: string;
  VERIFIED_ROLE_ID: string;
  WELCOME_CHANNEL_ID: string;
  CLASS_ROLES: string; // JSON: {"A":"roleId","B":"roleId"}
  ROLES: Record<string, { emoji: string; id: string }>;
  VERIFIED: KVNamespace;

  // LLM Configuration
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string; // e.g. "https://api.openai.com/v1"
  LLM_MODEL?: string; // e.g. "gpt-4o-mini"
  LLM_SYSTEM_PROMPT?: string;
}

const API = "https://discord.com/api/v10";

export async function discordApi(
  env: Env,
  path: string,
  init: { method?: string; body?: unknown; reason?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };
  if (init.reason)
    headers["X-Audit-Log-Reason"] = encodeURIComponent(init.reason);

  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Discord API ${res.status} ${path}: ${await res.text()}`);
  }
  return res;
}

export async function editOriginalResponse(
  appId: string,
  token: string,
  content: string,
): Promise<void> {
  await fetch(`${API}/webhooks/${appId}/${token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export async function createFollowupMessage(
  appId: string,
  token: string,
  content: string,
): Promise<void> {
  await fetch(`${API}/webhooks/${appId}/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}
