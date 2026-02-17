#!/bin/bash
# Get full details of a Xero invoice
# Usage: ./get-invoice.sh <invoice-id-or-number>
#
# Accepts InvoiceID (UUID) or InvoiceNumber (e.g., INV-0001)

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found"; exit 1; }

ID="${1:-}"
if [ -z "$ID" ]; then
    echo "Usage: $0 <invoice-id-or-number>"
    exit 1
fi

curl -s -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
    -H "xero-tenant-id: ${XERO_TENANT_ID}" \
    -H "Accept: application/json" \
    "https://api.xero.com/api.xro/2.0/Invoices/${ID}" | jq '.Invoices[0] // .'
