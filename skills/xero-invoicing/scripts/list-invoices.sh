#!/bin/bash
# List Xero invoices with optional filters
# Usage: ./list-invoices.sh [options]
#
# Options:
#   --status STATUS     Filter by status (DRAFT,SUBMITTED,AUTHORISED,PAID,VOIDED)
#   --contact ID        Filter by contact UUID
#   --from DATE         Invoice date from (YYYY-MM-DD)
#   --to DATE           Invoice date to (YYYY-MM-DD)
#   --due-from DATE     Due date from
#   --due-to DATE       Due date to
#   --overdue           Shortcut: AUTHORISED with due date before today
#   --page N            Page number (default: 1)
#   --summary           Summary only (no line items)

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found"; exit 1; }

PAGE=1
PARAMS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --status) PARAMS+=("Statuses=$2"); shift 2 ;;
        --contact) PARAMS+=("ContactIDs=$2"); shift 2 ;;
        --from) PARAMS+=("DateFrom=$2"); shift 2 ;;
        --to) PARAMS+=("DateTo=$2"); shift 2 ;;
        --due-from) PARAMS+=("DueDateFrom=$2"); shift 2 ;;
        --due-to) PARAMS+=("DueDateTo=$2"); shift 2 ;;
        --overdue)
            PARAMS+=("Statuses=AUTHORISED")
            PARAMS+=("DueDateTo=$(date -u +%Y-%m-%d)")
            shift ;;
        --page) PAGE="$2"; shift 2 ;;
        --summary) PARAMS+=("summaryOnly=true"); shift ;;
        *) shift ;;
    esac
done

QUERY="page=${PAGE}&order=DueDate"
for P in "${PARAMS[@]}"; do
    QUERY="${QUERY}&${P}"
done

curl -s -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
    -H "xero-tenant-id: ${XERO_TENANT_ID}" \
    -H "Accept: application/json" \
    "https://api.xero.com/api.xro/2.0/Invoices?${QUERY}" | jq '[.Invoices[] | {
        InvoiceID,
        InvoiceNumber,
        Type,
        Contact: .Contact.Name,
        Date,
        DueDate,
        Status,
        AmountDue,
        Total,
        CurrencyCode
    }]'
