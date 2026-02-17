# Xero Projects API Details

## Base URL

`https://api.xero.com/projects.xro/2.0/`

All endpoints require `Authorization: Bearer <token>` and `xero-tenant-id: <id>` headers.

## Projects Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/Projects` | List projects |
| GET | `/Projects/{projectId}` | Get a project |
| POST | `/Projects` | Create a project |
| PUT | `/Projects/{projectId}` | Update a project |
| PATCH | `/Projects/{projectId}` | Update project status |
| GET | `/ProjectsUsers` | List project users |

### GET /Projects query params

| Param | Notes |
|-------|-------|
| `projectIds` | Comma-separated UUIDs |
| `contactID` | Filter by contact |
| `states` | `INPROGRESS` or `CLOSED` |
| `page` | Default 1 |
| `pageSize` | 1-500, default 50 |

### Project response fields (read-only)

| Field | Type | Notes |
|-------|------|-------|
| `projectId` | UUID | Primary identifier |
| `minutesLogged` | integer | Total minutes logged |
| `totalTaskAmount` | object | Total value of all tasks |
| `totalExpenseAmount` | object | Total expenses |
| `estimateAmount` | number | Budget estimate |
| `totalInvoiced` | object | Amount already invoiced |
| `totalToBeInvoiced` | object | Amount ready to invoice |
| `status` | enum | INPROGRESS or CLOSED |

## Tasks Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/Projects/{projectId}/Tasks` | List tasks |
| GET | `/Projects/{projectId}/Tasks/{taskId}` | Get a task |
| POST | `/Projects/{projectId}/Tasks` | Create a task |
| PUT | `/Projects/{projectId}/Tasks/{taskId}` | Update a task |
| DELETE | `/Projects/{projectId}/Tasks/{taskId}` | Delete a task |

### GET /Tasks query params

| Param | Notes |
|-------|-------|
| `taskIds` | Comma-separated UUIDs |
| `chargeType` | TIME, FIXED, or NON_CHARGEABLE |
| `page` | Default 1 |
| `pageSize` | 1-500, default 50 |

### Task response fields (read-only)

| Field | Type | Notes |
|-------|------|-------|
| `taskId` | UUID | Primary identifier |
| `totalMinutes` | integer | Total time logged |
| `totalAmount` | object | Total value (rate x time or fixed) |
| `minutesInvoiced` | integer | Minutes already invoiced |
| `minutesToBeInvoiced` | integer | Minutes ready to invoice |
| `fixedMinutes` | integer | For FIXED tasks: total minutes |
| `nonChargeableMinutes` | integer | Non-billable minutes |

## Time Entries Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/Projects/{projectId}/Time` | List time entries |
| GET | `/Projects/{projectId}/Time/{timeEntryId}` | Get a time entry |
| POST | `/Projects/{projectId}/Time` | Create a time entry |
| PUT | `/Projects/{projectId}/Time/{timeEntryId}` | Update a time entry |
| DELETE | `/Projects/{projectId}/Time/{timeEntryId}` | Delete a time entry |

### GET /Time query params

| Param | Notes |
|-------|-------|
| `userId` | Filter by user |
| `taskId` | Filter by task |
| `invoiceId` | Filter by invoice |
| `dateAfterUtc` | Entries after this date |
| `dateBeforeUtc` | Entries before this date |
| `isChargeable` | true/false |
| `states` | ACTIVE or LOCKED |
| `page` | Default 1 |
| `pageSize` | 1-500, default 50 |

## Amount Object

Financial values in the Projects API use an amount object:

```json
{
  "currency": "NZD",
  "value": 150.00
}
```

The currency is set by the connected Xero organisation and cannot be overridden per-project.
