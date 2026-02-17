# Xero API Overview

## Base URLs

| API | Base URL |
|-----|----------|
| Accounting (Invoices, Quotes, Contacts) | `https://api.xero.com/api.xro/2.0/` |
| Projects | `https://api.xero.com/projects.xro/2.0/` |
| Identity | `https://api.xero.com/connections` |
| OAuth Token | `https://identity.xero.com/connect/token` |

## OAuth 2.0 Scopes

| Scope | Access |
|-------|--------|
| `accounting.transactions` | Invoices, quotes, payments, credit notes |
| `accounting.contacts` | Contacts and contact groups |
| `accounting.settings.read` | Accounts, tax rates, branding themes |
| `projects` | Projects, tasks, time entries |
| `offline_access` | Enables refresh tokens |

## Contact Fields

| Field | Type | Notes |
|-------|------|-------|
| `ContactID` | UUID | Primary identifier |
| `Name` | string | Required for creation |
| `EmailAddress` | string | Used for sending invoices/quotes |
| `AccountNumber` | string | Optional reference |
| `IsCustomer` | boolean | Has accounts receivable activity |
| `IsSupplier` | boolean | Has accounts payable activity |
| `Phones` | array | Phone numbers by type |
| `Addresses` | array | Postal/street addresses |

## Account Fields

| Field | Type | Notes |
|-------|------|-------|
| `AccountID` | UUID | Primary identifier |
| `Code` | string | Account code (e.g., `200`) |
| `Name` | string | Account name |
| `Type` | enum | REVENUE, EXPENSE, BANK, etc. |
| `TaxType` | string | Default tax type |
| `Class` | enum | ASSET, EQUITY, EXPENSE, LIABILITY, REVENUE |

## Tax Rate Fields

| Field | Type | Notes |
|-------|------|-------|
| `Name` | string | Display name |
| `TaxType` | string | Tax type code (use in line items) |
| `EffectiveRate` | decimal | Current rate percentage |
| `Status` | enum | ACTIVE, DELETED |

## Common Tax Types (NZ/AU/UK)

Vary by region. Query `GET /TaxRates` to see available types for the connected org.

## Error Handling

Xero returns validation errors in the response body:

```json
{
  "ErrorNumber": 10,
  "Type": "ValidationException",
  "Message": "A validation exception occurred",
  "Elements": [{
    "ValidationErrors": [{"Message": "Description is required"}]
  }]
}
```

Check `HasErrors: true` on elements and inspect `ValidationErrors` array.
