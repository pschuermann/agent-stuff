#!/bin/bash
# Refresh the Xero OAuth 2.0 access token
# Usage: ./auth.sh
#
# Reads client_id, client_secret, and refresh_token from ~/.xero/credentials
# Updates the file with new access_token and refresh_token

CREDS_FILE="$HOME/.xero/credentials"

if [ ! -f "$CREDS_FILE" ]; then
    echo "Error: $CREDS_FILE not found"
    echo "Create it with: XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REFRESH_TOKEN"
    exit 1
fi

source "$CREDS_FILE"

if [ -z "$XERO_CLIENT_ID" ] || [ -z "$XERO_CLIENT_SECRET" ] || [ -z "$XERO_REFRESH_TOKEN" ]; then
    echo "Error: Missing XERO_CLIENT_ID, XERO_CLIENT_SECRET, or XERO_REFRESH_TOKEN in $CREDS_FILE"
    exit 1
fi

RESPONSE=$(curl -s -X POST "https://identity.xero.com/connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -u "${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}" \
    -d "grant_type=refresh_token&refresh_token=${XERO_REFRESH_TOKEN}")

NEW_ACCESS=$(echo "$RESPONSE" | jq -r '.access_token // empty')
NEW_REFRESH=$(echo "$RESPONSE" | jq -r '.refresh_token // empty')

if [ -z "$NEW_ACCESS" ]; then
    echo "Error refreshing token:"
    echo "$RESPONSE" | jq .
    exit 1
fi

# Update credentials file preserving client_id, client_secret, and tenant_id
cat > "$CREDS_FILE" <<EOF
XERO_CLIENT_ID=${XERO_CLIENT_ID}
XERO_CLIENT_SECRET=${XERO_CLIENT_SECRET}
XERO_REFRESH_TOKEN=${NEW_REFRESH}
XERO_ACCESS_TOKEN=${NEW_ACCESS}
XERO_TENANT_ID=${XERO_TENANT_ID}
EOF

echo "Token refreshed. Expires in $(echo "$RESPONSE" | jq -r '.expires_in')s."

# If tenant_id is missing, fetch it
if [ -z "$XERO_TENANT_ID" ]; then
    echo ""
    echo "No XERO_TENANT_ID set. Fetching connections..."
    curl -s -H "Authorization: Bearer ${NEW_ACCESS}" \
        "https://api.xero.com/connections" | jq '[.[] | {tenantId, tenantName, tenantType}]'
    echo ""
    echo "Add XERO_TENANT_ID=<tenantId> to $CREDS_FILE"
fi
