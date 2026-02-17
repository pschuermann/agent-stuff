---
name: xero-projects
description: "Manage projects, tasks, and time tracking in Xero Projects. Use for creating client projects, defining billable tasks, logging time entries, monitoring project budgets and profitability, and tracking work across team members. Also use when asked about project financials, time logged, or task status in Xero."
---

# Xero Projects

Manage projects, tasks, and time entries via the `xero-node` SDK. Requires `~/.xero/config.json` with the `projects` scope (see the `xero` skill for setup). Run scripts from `skills/xero/` (where `npm install` was run).

**Important:** The Projects API uses `camelCase` field names (not `PascalCase` like the Accounting API). The SDK handles this transparently.

## Quick Reference

| Script | Purpose |
|--------|---------|
| `npx tsx scripts/list-projects.ts [filters]` | List projects |
| `npx tsx scripts/create-project.ts <args>` | Create a new project |
| `npx tsx scripts/tasks.ts <project-id> [args]` | List or create tasks |
| `npx tsx scripts/log-time.ts <project-id> <args>` | Log a time entry |
| `npx tsx scripts/project-summary.ts <project-id>` | Financial summary of a project |

## Project Workflows

### Set up a new client project

1. Look up the contact: `npx tsx xero/scripts/contacts.ts "Client Name"`
2. Create the project:
   ```bash
   npx tsx scripts/create-project.ts --contact <id> --name "Website Rebuild" \
       --estimate 25000 --deadline 2026-06-30
   ```
3. Add tasks:
   ```bash
   npx tsx scripts/tasks.ts <project-id> --create --name "Design" \
       --rate 150 --charge-type TIME --estimate-hours 40
   npx tsx scripts/tasks.ts <project-id> --create --name "Development" \
       --rate 150 --charge-type TIME --estimate-hours 80
   npx tsx scripts/tasks.ts <project-id> --create --name "Hosting Setup" \
       --rate 500 --charge-type FIXED
   ```

### Log time against a project

```bash
# Get project users first
npx tsx scripts/list-projects.ts --users

# Log 4 hours of design work
npx tsx scripts/log-time.ts <project-id> --task <task-id> --user <user-id> \
    --date 2026-02-17 --duration 240 --description "Homepage wireframes"
```

Duration is in **minutes** (240 = 4 hours). Max: 59,940 minutes.

### Check project budget status

```bash
npx tsx scripts/project-summary.ts <project-id>
```

Shows: estimate vs. actual amounts, time logged, invoiced amounts, remaining budget.

### Invoice from a project

The Projects API does not create invoices directly. The workflow is:

1. Review time and tasks: `npx tsx scripts/project-summary.ts <project-id>`
2. Get task details: `npx tsx scripts/tasks.ts <project-id>`
3. Create an invoice using `npx tsx xero-invoicing/scripts/create-invoice.ts` with line items matching the project tasks/time
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
