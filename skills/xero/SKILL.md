---
name: xero
description: "Interact with Xero accounting platform. Set up authentication, search contacts, list chart of accounts and tax rates. Foundation for Xero invoicing and project management. Use when working with Xero API, managing Xero credentials, looking up contacts, or querying account codes. Also use when setting up the Xero MCP server."
---

# Xero

Access the Xero accounting API. Credentials are stored in `~/.xero/credentials`.

## Setup

### Option A: Xero MCP Server (Recommended)

If the Xero MCP server is available, prefer using its tools directly (`list-contacts`, `list-accounts`, `list-tax-rates`, etc.) over shell scripts. Configure it with:

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

### Option B: API Scripts

Create `~/.xero/credentials` with:

```bash
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret
XERO_REFRESH_TOKEN=your_refresh_token
XERO_ACCESS_TOKEN=your_access_token
XERO_TENANT_ID=your_tenant_id
```

Obtain credentials from a Xero OAuth 2.0 app at https://developer.xero.com/app/manage. Required scopes: `offline_access accounting.transactions accounting.contacts accounting.settings.read projects`.

Run `scripts/auth.sh` to refresh the access token when it expires (tokens last 30 minutes).

## Quick Reference

| Script | Purpose |
|--------|---------|
| `scripts/auth.sh` | Refresh the OAuth access token |
| `scripts/contacts.sh [query]` | Search or list contacts |
| `scripts/accounts.sh` | List chart of accounts |

## Contacts

Search contacts by name or list all:

```bash
./scripts/contacts.sh "Acme"          # Search by name
./scripts/contacts.sh                  # List all (page 1)
./scripts/contacts.sh --page 2        # Paginate
```

Returns: `ContactID`, `Name`, `EmailAddress`, `AccountNumber`, `IsCustomer`, `IsSupplier`.

Use the `ContactID` when creating invoices, quotes, or projects.

## Chart of Accounts

List accounts to find valid `AccountCode` values for line items:

```bash
./scripts/accounts.sh                  # All accounts
./scripts/accounts.sh --type REVENUE   # Revenue accounts only
```

Common account types: `REVENUE`, `EXPENSE`, `BANK`, `CURRENT`, `FIXED`, `EQUITY`.

Revenue account codes (e.g., `200`, `260`, `270`) are needed when creating invoice/quote line items.

## Rate Limits

| Limit | Value |
|-------|-------|
| Concurrent requests | 5 |
| Per minute | 60 calls |
| Per day (per org) | 5,000 calls |

## API Authentication Headers

All Xero API requests require:

```
Authorization: Bearer <access_token>
xero-tenant-id: <tenant_id>
Content-Type: application/json
```

For detailed field references, see [references/api-overview.md](references/api-overview.md).
