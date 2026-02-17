---
name: xero-projects
description: "Manage projects, tasks, and time tracking in Xero Projects. Use for creating client projects, defining billable tasks, logging time entries, monitoring project budgets and profitability, and tracking work across team members. Also use when asked about project financials, time logged, or task status in Xero."
---

# Xero Projects

Manage projects, tasks, and time entries via the Xero Projects API. Requires `~/.xero/credentials` with the `projects` scope (see the `xero` skill for setup).

**Important:** The Projects API uses a different base URL (`projects.xro/2.0`) than the Accounting API. Field names use `camelCase` (not `PascalCase`).

## Quick Reference

| Script | Purpose |
|--------|---------|
| `scripts/list-projects.sh [filters]` | List projects |
| `scripts/create-project.sh <args>` | Create a new project |
| `scripts/tasks.sh <project-id> [args]` | List or create tasks |
| `scripts/log-time.sh <project-id> <args>` | Log a time entry |
| `scripts/project-summary.sh <project-id>` | Financial summary of a project |

## Project Workflows

### Set up a new client project

1. Look up the contact: `xero/scripts/contacts.sh "Client Name"`
2. Create the project:
   ```bash
   scripts/create-project.sh --contact <id> --name "Website Rebuild" \
       --estimate 25000 --deadline 2026-06-30
   ```
3. Add tasks:
   ```bash
   scripts/tasks.sh <project-id> --create --name "Design" \
       --rate 150 --charge-type TIME --estimate-hours 40
   scripts/tasks.sh <project-id> --create --name "Development" \
       --rate 150 --charge-type TIME --estimate-hours 80
   scripts/tasks.sh <project-id> --create --name "Hosting Setup" \
       --rate 500 --charge-type FIXED
   ```

### Log time against a project

```bash
# Get project users first
scripts/list-projects.sh --users

# Log 4 hours of design work
scripts/log-time.sh <project-id> --task <task-id> --user <user-id> \
    --date 2026-02-17 --duration 240 --description "Homepage wireframes"
```

Duration is in **minutes** (240 = 4 hours). Max: 59,940 minutes.

### Check project budget status

```bash
scripts/project-summary.sh <project-id>
```

Shows: estimate vs. actual amounts, time logged, invoiced amounts, remaining budget.

### Invoice from a project

The Projects API does not create invoices directly. The workflow is:

1. Review time and tasks: `scripts/project-summary.sh <project-id>`
2. Get task details: `scripts/tasks.sh <project-id>`
3. Create an invoice using `xero-invoicing/scripts/create-invoice.sh` with line items matching the project tasks/time
4. Mark FIXED tasks as invoiced via the API

## Project Fields

| Field | Type | Notes |
|-------|------|-------|
| `contactId` | UUID | **Required.** The client contact |
| `name` | string | **Required.** Project name |
| `estimateAmount` | number | Estimated monetary value |
| `deadlineUtc` | datetime | ISO 8601 UTC deadline |
| `status` | enum | `INPROGRESS` (default) or `CLOSED` |

## Task Fields

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | **Required.** Task name (max 100 chars) |
| `rate` | object | **Required.** `{"currency": "NZD", "value": 150.00}` |
| `chargeType` | enum | **Required.** `TIME`, `FIXED`, or `NON_CHARGEABLE` |
| `estimateMinutes` | integer | Estimated time in minutes |
| `status` | enum | `ACTIVE`, `INVOICED`, or `LOCKED` (read-only) |

### Charge Types

- **TIME**: Billed per hour based on logged time. Total = rate x hours logged.
- **FIXED**: Billed as a flat amount. The rate value is the total charge.
- **NON_CHARGEABLE**: Tracked for reporting but not billable.

## Time Entry Fields

| Field | Type | Notes |
|-------|------|-------|
| `userId` | UUID | **Required.** Xero user logging time |
| `taskId` | UUID | **Required.** Task to log against |
| `dateUtc` | datetime | **Required.** Date (ISO 8601 UTC) |
| `duration` | integer | **Required.** Minutes (1 to 59,940) |
| `description` | string | Description of work done |
| `status` | enum | `ACTIVE` or `LOCKED` (read-only) |

For full API details, see [references/api-details.md](references/api-details.md).
