#!/bin/bash
# Create a Xero project
# Usage: ./create-project.sh --contact <id> --name <name> [--estimate <amount>] [--deadline <date>]
#
# Examples:
#   ./create-project.sh --contact abc-123 --name "Website Rebuild"
#   ./create-project.sh --contact abc-123 --name "App Dev" --estimate 25000 --deadline 2026-06-30

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found"; exit 1; }

CONTACT=""
NAME=""
ESTIMATE=""
DEADLINE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --contact) CONTACT="$2"; shift 2 ;;
        --name) NAME="$2"; shift 2 ;;
        --estimate) ESTIMATE="$2"; shift 2 ;;
        --deadline) DEADLINE="$2"; shift 2 ;;
        *) shift ;;
    esac
done

if [ -z "$CONTACT" ] || [ -z "$NAME" ]; then
    echo "Usage: $0 --contact <contact-id> --name <project-name> [--estimate <amount>] [--deadline <YYYY-MM-DD>]"
    exit 1
fi

JSON="{\"contactId\":\"${CONTACT}\",\"name\":\"${NAME}\""

if [ -n "$ESTIMATE" ]; then
    JSON="${JSON},\"estimateAmount\":${ESTIMATE}"
fi

if [ -n "$DEADLINE" ]; then
    JSON="${JSON},\"deadlineUtc\":\"${DEADLINE}T23:59:59Z\""
fi

JSON="${JSON}}"

curl -s -X POST "https://api.xero.com/projects.xro/2.0/Projects" \
    -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
    -H "xero-tenant-id: ${XERO_TENANT_ID}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$JSON" | jq '{
        projectId,
        name,
        contactId,
        status,
        estimateAmount: .estimate.amount,
        deadlineUtc
    }'
