---
name: xero-invoicing
description: "Create, manage, and send invoices and quotes in Xero. Use for billing customers, generating sales invoices, creating and sending quotes/estimates, converting quotes to invoices, tracking overdue payments, voiding invoices, and managing accounts receivable workflows. Also covers purchase bills (ACCPAY)."
---

# Xero Invoicing & Quotes

Create and manage invoices and quotes via the `xero-node` SDK. Requires `~/.xero/config.json` (see the `xero` skill for setup). Run scripts from `skills/xero/` (where `npm install` was run).

If the Xero MCP server is available, prefer its `create-invoice`, `update-invoice`, `list-invoices`, `create-quote`, `update-quote`, `list-quotes` tools over these scripts.

## Quick Reference

| Script | Purpose |
|--------|---------|
| `npx tsx scripts/list-invoices.ts [filters]` | List invoices with optional filters |
| `npx tsx scripts/get-invoice.ts <id-or-number>` | Get full invoice details |
| `npx tsx scripts/create-invoice.ts <json-file>` | Create an invoice from JSON |
| `npx tsx scripts/send-invoice.ts <invoice-id>` | Email invoice to the contact |
| `npx tsx scripts/list-quotes.ts [filters]` | List quotes with optional filters |
| `npx tsx scripts/create-quote.ts <json-file>` | Create a quote from JSON |

## Invoice Workflows

### Create and send an invoice

1. Look up the contact: `npx tsx xero/scripts/contacts.ts "Client Name"`
2. Look up account codes: `npx tsx xero/scripts/accounts.ts --type REVENUE`
3. Write the invoice JSON (see template below)
4. Create: `npx tsx scripts/create-invoice.ts /tmp/invoice.json`
5. Send: `npx tsx scripts/send-invoice.ts <InvoiceID>`

### Track overdue invoices

```bash
npx tsx scripts/list-invoices.ts --status AUTHORISED --overdue
```

### Void an invoice

Only `AUTHORISED` (unpaid) invoices can be voided. `PAID` invoices must be unreconciled first.

```bash
npx tsx scripts/get-invoice.ts <id>  # Verify status is AUTHORISED
# Then update status to VOIDED via the API
```

## Invoice JSON Template

```json
{
  "Type": "ACCREC",
  "Contact": { "ContactID": "<contact-uuid>" },
  "Date": "2026-02-17",
  "DueDate": "2026-03-17",
  "LineAmountTypes": "Exclusive",
  "Reference": "Project Alpha - February",
  "LineItems": [
    {
      "Description": "Consulting services",
      "Quantity": 10,
      "UnitAmount": 150.00,
      "AccountCode": "200"
    }
  ],
  "Status": "DRAFT"
}
```

**Required fields:** `Type`, `Contact` (with `ContactID` or `Name`), at least one `LineItem` with `Description`.

**Type values:** `ACCREC` (sales invoice to customer), `ACCPAY` (purchase bill from supplier).

**Status on creation:** `DRAFT` (default), `SUBMITTED` (awaiting approval), `AUTHORISED` (approved, awaiting payment).

## Invoice Status Lifecycle

```
DRAFT --> SUBMITTED --> AUTHORISED --> PAID
  |            |              |
  v            v              v
DELETED     DELETED        VOIDED
```

- `DRAFT` / `SUBMITTED`: Fully editable, can be deleted
- `AUTHORISED`: Locked, can only be voided (not edited or deleted)
- `PAID`: Terminal state; must unreconcile payment first to void
- Bulk create: Up to 50 invoices per POST request

## Quote Workflows

### Create and send a quote

1. Look up the contact
2. Write the quote JSON (see template below)
3. Create: `npx tsx scripts/create-quote.ts /tmp/quote.json`
4. Update status to `SENT` (requires a second API call with the full quote object)

### Convert a quote to an invoice

Quotes cannot be directly converted via API. The workflow is:

1. Get the quote: `npx tsx scripts/list-quotes.ts --status ACCEPTED`
2. Copy the line items and contact from the quote
3. Create an invoice with those details: `npx tsx scripts/create-invoice.ts`
4. Update the quote status to `INVOICED`

## Quote JSON Template

```json
{
  "Contact": { "ContactID": "<contact-uuid>" },
  "Date": "2026-02-17",
  "ExpiryDate": "2026-03-17",
  "LineAmountTypes": "Exclusive",
  "Title": "Website Redesign Proposal",
  "Summary": "Complete website redesign with responsive design",
  "Terms": "Valid for 30 days",
  "LineItems": [
    {
      "Description": "Design and development",
      "Quantity": 1,
      "UnitAmount": 5000.00,
      "AccountCode": "200"
    }
  ]
}
```

**Required fields:** `Contact`, `Date`, at least one `LineItem` with `Description`.

## Quote Status Lifecycle

```
DRAFT --> SENT --> ACCEPTED --> INVOICED
                     |
                  DECLINED
```

- All new quotes are created as `DRAFT` regardless of status supplied
- To mark as `SENT`, make a second PUT with the full quote object and `"Status": "SENT"`
- `ACCEPTED` / `DECLINED` are typically set by the recipient or manually

## Line Item Fields

| Field | Type | Notes |
|-------|------|-------|
| `Description` | string | **Required** |
| `Quantity` | decimal | Number of units |
| `UnitAmount` | decimal | Price per unit |
| `AccountCode` | string | Revenue/expense account code |
| `ItemCode` | string | Xero inventory item code |
| `TaxType` | string | Tax type (omit to use account default) |
| `DiscountRate` | decimal | Percentage discount |
| `DiscountAmount` | decimal | Fixed discount (mutually exclusive with DiscountRate) |
| `Tracking` | array | Tracking category assignments |

For full field reference, see [references/field-reference.md](references/field-reference.md).
