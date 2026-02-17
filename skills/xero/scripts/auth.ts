#!/usr/bin/env -S npx tsx
// Refresh the Xero OAuth 2.0 access token and display connected tenants.
// Usage: npx tsx scripts/auth.ts

import { XeroClient } from "xero-node";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const XERO_DIR = join(homedir(), ".xero");
const CONFIG_PATH = join(XERO_DIR, "config.json");
const TOKEN_PATH = join(XERO_DIR, "tokenset.json");

async function main() {
  if (!existsSync(CONFIG_PATH)) {
    console.error(`Error: ${CONFIG_PATH} not found.`);
    console.error("Create it with:");
    console.error(
      JSON.stringify(
        { clientId: "<your_client_id>", clientSecret: "<your_client_secret>", tenantId: "" },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));

  if (config.grantType === "client_credentials") {
    const xero = new XeroClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      grantType: "client_credentials",
    });
    await xero.initialize();
    await xero.getClientCredentialsToken();
    console.log("Custom Connection authenticated. No token storage needed.");
    return;
  }

  // Standard OAuth2 flow
  const xero = new XeroClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUris: ["http://localhost/callback"],
    scopes: ["offline_access", "accounting.transactions", "accounting.contacts", "accounting.settings.read", "projects"],
  });
  await xero.initialize();

  const tokenSet = existsSync(TOKEN_PATH)
    ? JSON.parse(readFileSync(TOKEN_PATH, "utf-8"))
    : null;

  if (!tokenSet?.refresh_token) {
    console.error(`Error: ${TOKEN_PATH} not found or missing refresh_token.`);
    console.error("Obtain initial tokens through the OAuth2 authorization flow.");
    process.exit(1);
  }

  await xero.setTokenSet(tokenSet);
  const refreshed = await xero.refreshToken();

  if (!existsSync(XERO_DIR)) mkdirSync(XERO_DIR, { recursive: true });
  writeFileSync(TOKEN_PATH, JSON.stringify(refreshed, null, 2));
  console.log("Token refreshed and saved to", TOKEN_PATH);

  // Show connected tenants
  await xero.updateTenants(false);
  if (xero.tenants.length > 0) {
    console.log("\nConnected organisations:");
    for (const t of xero.tenants) {
      console.log(`  ${t.tenantName} (${t.tenantId}) [${t.tenantType}]`);
    }
    if (!config.tenantId) {
      console.log(`\nAdd "tenantId": "${xero.tenants[0].tenantId}" to ${CONFIG_PATH}`);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
