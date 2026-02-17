#!/bin/bash
# Search or list Xero contacts
# Usage: ./contacts.sh [search-query] [--page N]
#
# Examples:
#   ./contacts.sh "Acme"         # Search by name
#   ./contacts.sh                 # List all (page 1)
#   ./contacts.sh --page 2       # Page 2

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found. Run auth.sh first."; exit 1; }

QUERY=""
PAGE=1

while [[ $# -gt 0 ]]; do
    case "$1" in
        --page) PAGE="$2"; shift 2 ;;
        *) QUERY="$1"; shift ;;
    esac
done

URL="https://api.xero.com/api.xro/2.0/Contacts?page=${PAGE}&order=Name"

if [ -n "$QUERY" ]; then
    ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('Name.Contains(\"${QUERY}\")'))")
    URL="${URL}&where=${ENCODED}"
fi

curl -s -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
    -H "xero-tenant-id: ${XERO_TENANT_ID}" \
    -H "Accept: application/json" \
    "$URL" | jq '[.Contacts[] | {
        ContactID,
        Name,
        EmailAddress,
        AccountNumber,
        IsCustomer,
        IsSupplier
    }]'
