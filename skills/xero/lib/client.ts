import { XeroClient } from "xero-node";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const XERO_DIR = join(homedir(), ".xero");
const CONFIG_PATH = join(XERO_DIR, "config.json");
const TOKEN_PATH = join(XERO_DIR, "tokenset.json");

export interface XeroConfig {
  clientId: string;
  clientSecret: string;
  tenantId?: string;
  scopes?: string[];
  grantType?: "client_credentials" | "authorization_code";
}

function loadConfig(): XeroConfig {
  if (!existsSync(CONFIG_PATH)) {
    console.error(`Error: ${CONFIG_PATH} not found.`);
    console.error(`Create it with: { "clientId": "...", "clientSecret": "...", "tenantId": "..." }`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
}

function loadTokenSet(): Record<string, unknown> | null {
  if (!existsSync(TOKEN_PATH)) return null;
  return JSON.parse(readFileSync(TOKEN_PATH, "utf-8"));
}

function saveTokenSet(tokenSet: Record<string, unknown>): void {
  if (!existsSync(XERO_DIR)) mkdirSync(XERO_DIR, { recursive: true });
  writeFileSync(TOKEN_PATH, JSON.stringify(tokenSet, null, 2));
}

/**
 * Initialize and return a ready-to-use XeroClient with a valid access token.
 * Handles both Custom Connections (client_credentials) and regular OAuth2 (refresh_token).
 */
export async function getClient(): Promise<{ xero: XeroClient; tenantId: string }> {
  const config = loadConfig();

  const defaultScopes = [
    "offline_access",
    "accounting.transactions",
    "accounting.contacts",
    "accounting.settings.read",
    "projects",
  ];

  const xero = new XeroClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUris: ["http://localhost/callback"],
    scopes: (config.scopes ?? defaultScopes).join(" ").split(" "),
    ...(config.grantType === "client_credentials" ? { grantType: "client_credentials" } : {}),
  });

  await xero.initialize();

  if (config.grantType === "client_credentials") {
    // Custom Connection (M2M) — no stored tokens needed
    await xero.getClientCredentialsToken();
  } else {
    // Standard OAuth2 with refresh tokens
    const tokenSet = loadTokenSet();
    if (!tokenSet?.refresh_token) {
      console.error(`Error: ${TOKEN_PATH} not found or missing refresh_token.`);
      console.error("Run the auth script first to obtain tokens.");
      process.exit(1);
    }

    await xero.setTokenSet(tokenSet as any);
    const refreshed = await xero.refreshToken();
    saveTokenSet(refreshed as any);
  }

  // Resolve tenant ID
  let tenantId = config.tenantId ?? "";
  if (!tenantId && config.grantType !== "client_credentials") {
    await xero.updateTenants(false);
    if (xero.tenants.length === 0) {
      console.error("Error: No connected Xero organisations found.");
      process.exit(1);
    }
    tenantId = xero.tenants[0].tenantId;
  }

  return { xero, tenantId };
}

/**
 * Format Xero validation errors for display.
 */
export function formatErrors(element: any): string[] {
  if (!element?.validationErrors?.length && !element?.ValidationErrors?.length) return [];
  const errors = element.validationErrors ?? element.ValidationErrors ?? [];
  return errors.map((e: any) => e.message ?? e.Message ?? JSON.stringify(e));
}

/**
 * Parse common CLI flags.
 */
export function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] ?? "true";
      i++;
    } else {
      positional.push(argv[i]);
    }
  }
  if (positional.length) args._positional = positional.join(" ");
  return args;
}
