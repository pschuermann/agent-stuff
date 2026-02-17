#!/bin/bash
# Create a Xero invoice from a JSON file
# Usage: ./create-invoice.sh <json-file>
#
# The JSON file should contain the invoice object (not wrapped in {Invoices:[...]}).
# Returns the created invoice with InvoiceID.

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found"; exit 1; }

JSON_FILE="${1:-}"
if [ -z "$JSON_FILE" ] || [ ! -f "$JSON_FILE" ]; then
    echo "Usage: $0 <json-file>"
    echo "Example: $0 /tmp/invoice.json"
    exit 1
fi

curl -s -X POST "https://api.xero.com/api.xro/2.0/Invoices" \
    -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
    -H "xero-tenant-id: ${XERO_TENANT_ID}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d @"$JSON_FILE" | jq '{
        InvoiceID: .Invoices[0].InvoiceID,
        InvoiceNumber: .Invoices[0].InvoiceNumber,
        Status: .Invoices[0].Status,
        Total: .Invoices[0].Total,
        Contact: .Invoices[0].Contact.Name,
        HasErrors: .Invoices[0].HasErrors,
        Errors: [.Invoices[0].ValidationErrors[]? // empty]
    }'
