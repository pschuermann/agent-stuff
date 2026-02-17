#!/bin/bash
# List Xero quotes with optional filters
# Usage: ./list-quotes.sh [options]
#
# Options:
#   --status STATUS     Filter by status (DRAFT,SENT,ACCEPTED,DECLINED,INVOICED)
#   --contact ID        Filter by contact UUID
#   --from DATE         Quote date from (YYYY-MM-DD)
#   --to DATE           Quote date to (YYYY-MM-DD)
#   --page N            Page number (default: 1)

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found"; exit 1; }

PAGE=1
PARAMS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --status) PARAMS+=("Status=$2"); shift 2 ;;
        --contact) PARAMS+=("ContactID=$2"); shift 2 ;;
        --from) PARAMS+=("DateFrom=$2"); shift 2 ;;
        --to) PARAMS+=("DateTo=$2"); shift 2 ;;
        --page) PAGE="$2"; shift 2 ;;
        *) shift ;;
    esac
done

QUERY="page=${PAGE}&order=Date%20DESC"
for P in "${PARAMS[@]}"; do
    QUERY="${QUERY}&${P}"
done

curl -s -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
    -H "xero-tenant-id: ${XERO_TENANT_ID}" \
    -H "Accept: application/json" \
    "https://api.xero.com/api.xro/2.0/Quotes?${QUERY}" | jq '[.Quotes[] | {
        QuoteID,
        QuoteNumber,
        Contact: .Contact.Name,
        Title,
        Date,
        ExpiryDate,
        Status,
        Total,
        CurrencyCode
    }]'
