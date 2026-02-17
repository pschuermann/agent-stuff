#!/bin/bash
# Email a Xero invoice to the contact
# Usage: ./send-invoice.sh <invoice-id>
#
# The invoice must be AUTHORISED to be sent.
# The contact must have an email address.

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found"; exit 1; }

INVOICE_ID="${1:-}"
if [ -z "$INVOICE_ID" ]; then
    echo "Usage: $0 <invoice-id>"
    exit 1
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "https://api.xero.com/api.xro/2.0/Invoices/${INVOICE_ID}/Email" \
    -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
    -H "xero-tenant-id: ${XERO_TENANT_ID}" \
    -H "Content-Type: application/json" \
    -d '{}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "Invoice ${INVOICE_ID} sent successfully."
else
    echo "Error sending invoice (HTTP ${HTTP_CODE}):"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
fi
