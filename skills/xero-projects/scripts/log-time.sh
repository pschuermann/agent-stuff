#!/bin/bash
# Log a time entry against a Xero project task
# Usage: ./log-time.sh <project-id> --task <id> --user <id> --date <YYYY-MM-DD> --duration <minutes> [--description <text>]
#
# Examples:
#   ./log-time.sh abc-123 --task def-456 --user ghi-789 --date 2026-02-17 --duration 240 --description "Frontend work"
#   ./log-time.sh abc-123 --task def-456 --user ghi-789 --date 2026-02-17 --duration 60

source "$HOME/.xero/credentials" 2>/dev/null || { echo "Error: ~/.xero/credentials not found"; exit 1; }

PROJECT_ID="${1:-}"
if [ -z "$PROJECT_ID" ]; then
    echo "Usage: $0 <project-id> --task <id> --user <id> --date <YYYY-MM-DD> --duration <minutes> [--description <text>]"
    exit 1
fi
shift

TASK=""
USER=""
DATE=""
DURATION=""
DESCRIPTION=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --task) TASK="$2"; shift 2 ;;
        --user) USER="$2"; shift 2 ;;
        --date) DATE="$2"; shift 2 ;;
        --duration) DURATION="$2"; shift 2 ;;
        --description) DESCRIPTION="$2"; shift 2 ;;
        *) shift ;;
    esac
done

if [ -z "$TASK" ] || [ -z "$USER" ] || [ -z "$DATE" ] || [ -z "$DURATION" ]; then
    echo "Usage: $0 <project-id> --task <id> --user <id> --date <YYYY-MM-DD> --duration <minutes> [--description <text>]"
    exit 1
fi

JSON="{\"userId\":\"${USER}\",\"taskId\":\"${TASK}\",\"dateUtc\":\"${DATE}T00:00:00Z\",\"duration\":${DURATION}"

if [ -n "$DESCRIPTION" ]; then
    JSON="${JSON},\"description\":\"${DESCRIPTION}\""
fi

JSON="${JSON}}"

curl -s -X POST "https://api.xero.com/projects.xro/2.0/Projects/${PROJECT_ID}/Time" \
    -H "Authorization: Bearer ${XERO_ACCESS_TOKEN}" \
    -H "xero-tenant-id: ${XERO_TENANT_ID}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$JSON" | jq '{
        timeEntryId,
        taskId,
        userId,
        dateUtc,
        duration,
        description,
        status
    }'
