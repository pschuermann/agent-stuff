#!/bin/bash
# Create a Xero quote from a JSON file
# Usage: ./create-quote.sh <json-file>
#
# The JSON file should contain the quote object.
# All new quotes are created as DRAFT regardless of the status supplied.
# Returns the created quote with QuoteID.

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found"; exit 1; }

JSON_FILE="${1:-}"
if [ -z "$JSON_FILE" ] || [ ! -f "$JSON_FILE" ]; then
    echo "Usage: $0 <json-file>"
    echo "Example: $0 /tmp/quote.json"
    exit 1
fi

curl -s -X POST "https://api.xero.com/api.xro/2.0/Quotes" \
    -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
    -H "xero-tenant-id: ${XERO_TENANT_ID}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d @"$JSON_FILE" | jq '{
        QuoteID: .Quotes[0].QuoteID,
        QuoteNumber: .Quotes[0].QuoteNumber,
        Title: .Quotes[0].Title,
        Status: .Quotes[0].Status,
        Total: .Quotes[0].Total,
        Contact: .Quotes[0].Contact.Name,
        HasErrors: .Quotes[0].HasErrors,
        Errors: [.Quotes[0].ValidationErrors[]? // empty]
    }'
