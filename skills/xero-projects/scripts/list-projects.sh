#!/bin/bash
# List Xero projects with optional filters
# Usage: ./list-projects.sh [options]
#
# Options:
#   --state STATE       Filter by state (INPROGRESS, CLOSED)
#   --contact ID        Filter by contact UUID
#   --page N            Page number (default: 1)
#   --users             List project users instead of projects

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found"; exit 1; }

PAGE=1
PARAMS=()
LIST_USERS=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --state) PARAMS+=("states=$2"); shift 2 ;;
        --contact) PARAMS+=("contactID=$2"); shift 2 ;;
        --page) PAGE="$2"; shift 2 ;;
        --users) LIST_USERS=true; shift ;;
        *) shift ;;
    esac
done

if [ "$LIST_USERS" = true ]; then
    curl -s -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
        -H "xero-tenant-id: ${XERO_TENANT_ID}" \
        -H "Accept: application/json" \
        "https://api.xero.com/projects.xro/2.0/ProjectsUsers" | jq '.items'
    exit 0
fi

QUERY="page=${PAGE}"
for P in "${PARAMS[@]}"; do
    QUERY="${QUERY}&${P}"
done

curl -s -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
    -H "xero-tenant-id: ${XERO_TENANT_ID}" \
    -H "Accept: application/json" \
    "https://api.xero.com/projects.xro/2.0/Projects?${QUERY}" | jq '[.items[] | {
        projectId,
        name,
        contactId,
        status,
        deadlineUtc,
        estimateAmount: .estimate.amount,
        totalTaskAmount: .totalTaskAmount.value,
        totalInvoiced: .totalInvoiced.value,
        minutesLogged
    }]'
