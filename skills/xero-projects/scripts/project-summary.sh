#!/bin/bash
# Get a financial summary of a Xero project
# Usage: ./project-summary.sh <project-id>
#
# Shows project details, budget status, tasks, and time logged.

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found"; exit 1; }

PROJECT_ID="${1:-}"
if [ -z "$PROJECT_ID" ]; then
    echo "Usage: $0 <project-id>"
    exit 1
fi

HEADERS=(-H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" -H "xero-tenant-id: ${XERO_TENANT_ID}" -H "Accept: application/json")
BASE="https://api.xero.com/projects.xro/2.0/Projects/${PROJECT_ID}"

echo "=== Project ==="
curl -s "${HEADERS[@]}" "$BASE" | jq '{
    name,
    status,
    contactId,
    deadlineUtc,
    estimate: .estimate.amount,
    totalTaskAmount: .totalTaskAmount.value,
    totalExpenseAmount: .totalExpenseAmount.value,
    totalInvoiced: .totalInvoiced.value,
    totalToBeInvoiced: .totalToBeInvoiced.value,
    minutesLogged,
    hoursLogged: (.minutesLogged / 60 | floor)
}'

echo ""
echo "=== Tasks ==="
curl -s "${HEADERS[@]}" "${BASE}/Tasks" | jq '[.items[] | {
    name,
    chargeType,
    rate: .rate.value,
    estimateMinutes,
    totalMinutes,
    totalAmount: .totalAmount.value,
    status,
    estimateHours: ((.estimateMinutes // 0) / 60),
    actualHours: ((.totalMinutes // 0) / 60)
}]'
