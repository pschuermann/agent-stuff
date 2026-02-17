#!/bin/bash
# List or create tasks for a Xero project
# Usage:
#   ./tasks.sh <project-id>                                    # List tasks
#   ./tasks.sh <project-id> --create --name <name> --rate <rate> --charge-type <type> [--estimate-hours <hours>]
#
# Charge types: TIME, FIXED, NON_CHARGEABLE
# Rate: hourly rate for TIME, total amount for FIXED

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found"; exit 1; }

PROJECT_ID="${1:-}"
if [ -z "$PROJECT_ID" ]; then
    echo "Usage: $0 <project-id> [--create --name <name> --rate <rate> --charge-type <type>]"
    exit 1
fi
shift

CREATE=false
NAME=""
RATE=""
CHARGE_TYPE=""
ESTIMATE_HOURS=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --create) CREATE=true; shift ;;
        --name) NAME="$2"; shift 2 ;;
        --rate) RATE="$2"; shift 2 ;;
        --charge-type) CHARGE_TYPE="$2"; shift 2 ;;
        --estimate-hours) ESTIMATE_HOURS="$2"; shift 2 ;;
        *) shift ;;
    esac
done

BASE_URL="https://api.xero.com/projects.xro/2.0/Projects/${PROJECT_ID}/Tasks"

if [ "$CREATE" = true ]; then
    if [ -z "$NAME" ] || [ -z "$RATE" ] || [ -z "$CHARGE_TYPE" ]; then
        echo "Usage: $0 <project-id> --create --name <name> --rate <rate> --charge-type <TIME|FIXED|NON_CHARGEABLE>"
        exit 1
    fi

    # Get org currency from credentials or default
    CURRENCY="${XERO_CURRENCY:-NZD}"

    JSON="{\"name\":\"${NAME}\",\"rate\":{\"currency\":\"${CURRENCY}\",\"value\":${RATE}},\"chargeType\":\"${CHARGE_TYPE}\""

    if [ -n "$ESTIMATE_HOURS" ]; then
        ESTIMATE_MINS=$((ESTIMATE_HOURS * 60))
        JSON="${JSON},\"estimateMinutes\":${ESTIMATE_MINS}"
    fi

    JSON="${JSON}}"

    curl -s -X POST "$BASE_URL" \
        -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
        -H "xero-tenant-id: ${XERO_TENANT_ID}" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "$JSON" | jq '{
            taskId,
            name,
            chargeType,
            rate: .rate.value,
            estimateMinutes,
            status
        }'
else
    curl -s -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
        -H "xero-tenant-id: ${XERO_TENANT_ID}" \
        -H "Accept: application/json" \
        "$BASE_URL" | jq '[.items[] | {
            taskId,
            name,
            chargeType,
            rate: .rate.value,
            estimateMinutes,
            totalMinutes,
            totalAmount: .totalAmount.value,
            status
        }]'
fi
