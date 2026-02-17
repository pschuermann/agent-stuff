---
name: xero
description: "Interact with Xero accounting platform. Set up authentication, search contacts, list chart of accounts and tax rates. Foundation for Xero invoicing and project management. Use when working with Xero API, managing Xero credentials, looking up contacts, or querying account codes. Also use when setting up the Xero MCP server."
---

# Xero

Access the Xero accounting API via the `xero-node` SDK. Configuration stored in `~/.xero/`.

## Setup

### Prerequisites

Install dependencies from the `skills/xero/` directory:

```bash
cd skills/xero && npm install
```

### Option A: Xero MCP Server (Recommended)

If the Xero MCP server is available, prefer using its tools directly (`list-contacts`, `list-accounts`, `list-tax-rates`, etc.) over scripts. Configure it with:

```json
{
  "mcpServers": {
    "xero": {
      "command": "npx",
      "args": ["-y", "@xeroapi/xero-mcp-server@latest"],
      "env": {
        "XERO_CLIENT_ID": "<client_id>",
        "XERO_CLIENT_SECRET": "<client_secret>"
      }
    }
  }
}
```

This requires a Xero "Custom Connection" app with scopes: `accounting.transactions`, `accounting.contacts`, `accounting.settings.read`, `projects`.

### Option B: SDK Scripts

Create `~/.xero/config.json` with OAuth app credentials:

```json
{
  "clientId": "your_client_id",
  "clientSecret": "your_client_secret",
  "tenantId": "your_tenant_id",
  "grantType": "client_credentials"
}
```

For standard OAuth2 (with refresh tokens), omit `grantType` and also create `~/.xero/tokenset.json` with the token set from the initial authorization flow. Run `npx tsx scripts/auth.ts` to refresh tokens (they expire every 30 minutes).

For Custom Connections (M2M), set `"grantType": "client_credentials"` — no token file needed.

Obtain credentials from a Xero OAuth 2.0 app at https://developer.xero.com/app/manage. Required scopes: `offline_access accounting.transactions accounting.contacts accounting.settings.read projects`.

## Quick Reference

| Script | Purpose |
|--------|---------|
| `npx tsx scripts/auth.ts` | Refresh OAuth token, list connected orgs |
| `npx tsx scripts/contacts.ts [query]` | Search or list contacts |
| `npx tsx scripts/accounts.ts [--type TYPE]` | List chart of accounts |

## Contacts

Search contacts by name or list all:

```bash
npx tsx scripts/contacts.ts "Acme"          # Search by name
npx tsx scripts/contacts.ts                  # List all (page 1)
npx tsx scripts/contacts.ts --page 2        # Paginate
```

Returns: `contactID`, `name`, `emailAddress`, `accountNumber`, `isCustomer`, `isSupplier`.

Use the `contactID` when creating invoices, quotes, or projects.

## Chart of Accounts

List accounts to find valid account code values for line items:

```bash
npx tsx scripts/accounts.ts                  # All accounts
npx tsx scripts/accounts.ts --type REVENUE   # Revenue accounts only
```

Common account types: `REVENUE`, `EXPENSE`, `BANK`, `CURRENT`, `FIXED`, `EQUITY`.

Revenue account codes (e.g., `200`, `260`, `270`) are needed when creating invoice/quote line items.

## Shared Client Library

All xero skill scripts import from `lib/client.ts` which provides:

- `getClient()` — Returns an initialized `XeroClient` with valid token and `tenantId`
- `formatErrors(element)` — Extracts validation error messages from Xero responses
- `parseArgs(argv)` — Parses `--key value` CLI arguments

The `xero-invoicing` and `xero-projects` skills import this same library.

## Rate Limits

| Limit | Value |
|-------|-------|
| Concurrent requests | 5 |
| Per minute | 60 calls |
| Per day (per org) | 5,000 calls |

For detailed field references, see [references/api-overview.md](references/api-overview.md).
