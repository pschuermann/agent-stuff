# Invoice & Quote Field Reference

## Invoice Fields (Full)

### Writable Fields

| Field | Type | Notes |
|-------|------|-------|
| `Type` | enum | **Required.** `ACCREC` (sales) or `ACCPAY` (purchase) |
| `Contact` | object | **Required.** `{ContactID}` or `{Name}` |
| `LineItems` | array | **Required.** At least one with `Description` |
| `InvoiceNumber` | string | Auto-generated if omitted (max 255 chars) |
| `Reference` | string | Free-text reference |
| `Date` | date | Invoice date (ISO 8601, e.g., `2026-02-17`) |
| `DueDate` | date | Payment due date |
| `LineAmountTypes` | enum | `Exclusive`, `Inclusive`, or `NoTax` |
| `CurrencyCode` | string | ISO 4217 (e.g., `NZD`, `AUD`, `USD`, `GBP`) |
| `CurrencyRate` | decimal | Exchange rate (omit for org default currency) |
| `BrandingThemeID` | UUID | Branding theme to apply |
| `Status` | enum | `DRAFT`, `SUBMITTED`, `AUTHORISED`, `VOIDED` |
| `Url` | string | Link to source document |
| `ExpectedPaymentDate` | date | Expected payment date |
| `PlannedPaymentDate` | date | Planned payment date |

### Read-Only Fields

| Field | Type | Notes |
|-------|------|-------|
| `InvoiceID` | UUID | Primary identifier |
| `SubTotal` | decimal | Sum of line amounts before tax |
| `TotalTax` | decimal | Total tax amount |
| `Total` | decimal | Grand total |
| `TotalDiscount` | decimal | Total discount applied |
| `AmountDue` | decimal | Outstanding balance |
| `AmountPaid` | decimal | Total paid |
| `AmountCredited` | decimal | Credits applied |
| `FullyPaidOnDate` | date | When fully paid |
| `UpdatedDateUTC` | datetime | Last modified timestamp |
| `HasAttachments` | boolean | Has file attachments |
| `SentToContact` | boolean | Has been emailed |
| `Payments` | array | Payment records |

## Quote Fields (Full)

### Writable Fields

| Field | Type | Notes |
|-------|------|-------|
| `Contact` | object | **Required.** `{ContactID}` or `{Name}` |
| `Date` | date | **Required.** Quote date |
| `LineItems` | array | **Required.** At least one with `Description` |
| `QuoteNumber` | string | Auto-generated if omitted |
| `Reference` | string | Free-text reference |
| `ExpiryDate` | date | When the quote expires |
| `LineAmountTypes` | enum | `Exclusive`, `Inclusive`, or `NoTax` |
| `CurrencyCode` | string | ISO 4217 currency code |
| `Title` | string | Quote title |
| `Summary` | string | Summary text |
| `Terms` | string | Terms and conditions text |
| `BrandingThemeID` | UUID | Branding theme |
| `Status` | enum | `DRAFT`, `SENT`, `ACCEPTED`, `DECLINED`, `INVOICED` |

### Read-Only Fields

| Field | Type | Notes |
|-------|------|-------|
| `QuoteID` | UUID | Primary identifier |
| `SubTotal` | decimal | Before tax |
| `TotalTax` | decimal | Tax amount |
| `Total` | decimal | Grand total |
| `TotalDiscount` | decimal | Total discount |
| `UpdatedDateUTC` | datetime | Last modified |

## Filtering Invoices (GET query params)

| Parameter | Example | Notes |
|-----------|---------|-------|
| `where` | `Status=="AUTHORISED"` | OData-style filter |
| `Statuses` | `AUTHORISED,PAID` | Comma-separated status list |
| `ContactIDs` | `<uuid>` | Filter by contact |
| `DateFrom` / `DateTo` | `2026-01-01` | Invoice date range |
| `DueDateFrom` / `DueDateTo` | `2026-02-01` | Due date range |
| `InvoiceNumbers` | `INV-0001` | Specific invoice number |
| `page` | `1` | Page number (100 per page) |
| `order` | `DueDate DESC` | Sort order |
| `summaryOnly` | `true` | Exclude line items for faster response |
| `createdByMyApp` | `true` | Only invoices created by this OAuth app |

## Filtering Quotes (GET query params)

| Parameter | Example | Notes |
|-----------|---------|-------|
| `Status` | `SENT` | Single status filter |
| `ContactID` | `<uuid>` | Filter by contact |
| `DateFrom` / `DateTo` | `2026-01-01` | Quote date range |
| `ExpiryDateFrom` / `ExpiryDateTo` | `2026-03-01` | Expiry date range |
| `QuoteNumber` | `QU-0001` | Specific quote number |
| `page` | `1` | Page number |
| `order` | `Date DESC` | Sort order |
