#!/bin/bash
# List Xero chart of accounts
# Usage: ./accounts.sh [--type TYPE]
#
# Examples:
#   ./accounts.sh                 # All accounts
#   ./accounts.sh --type REVENUE  # Revenue accounts only
#   ./accounts.sh --type EXPENSE  # Expense accounts only

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found. Run auth.sh first."; exit 1; }

TYPE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --type) TYPE="$2"; shift 2 ;;
        *) shift ;;
    esac
done

URL="https://api.xero.com/api.xro/2.0/Accounts"

if [ -n "$TYPE" ]; then
    ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('Type==\"${TYPE}\"'))")
    URL="${URL}?where=${ENCODED}"
fi

curl -s -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
    -H "xero-tenant-id: ${XERO_TENANT_ID}" \
    -H "Accept: application/json" \
    "$URL" | jq '[.Accounts[] | {
        Code,
        Name,
        Type,
        TaxType,
        Class,
        Status
    }] | sort_by(.Code)'
