#!/usr/bin/env -S npx tsx
// Log a time entry against a Xero project task.
// Usage: npx tsx scripts/log-time.ts <project-id> --task <id> --user <id> --date <YYYY-MM-DD> --duration <minutes> [--description <text>]

import { getClient, parseArgs } from "../../xero/lib/client.js";

async function main() {
  const argv = process.argv.slice(2);
  const projectId = argv[0];

  if (!projectId) {
    console.error(
      "Usage: npx tsx scripts/log-time.ts <project-id> --task <id> --user <id> --date <YYYY-MM-DD> --duration <minutes> [--description <text>]",
    );
    process.exit(1);
  }

  const args = parseArgs(argv.slice(1));

  if (!args.task || !args.user || !args.date || !args.duration) {
    console.error(
      "Required: --task <id> --user <id> --date <YYYY-MM-DD> --duration <minutes>",
    );
    process.exit(1);
  }

  const { xero, tenantId } = await getClient();

  const timeEntryCreateOrUpdate: any = {
    userId: args.user,
    taskId: args.task,
    dateUtc: new Date(`${args.date}T00:00:00Z`),
    duration: parseInt(args.duration, 10),
  };

  if (args.description) {
    timeEntryCreateOrUpdate.description = args.description;
  }

  const response = await xero.projectApi.createTimeEntry(tenantId, projectId, timeEntryCreateOrUpdate);
  const entry = response.body;

  console.log(
    JSON.stringify(
      {
        timeEntryId: entry.timeEntryId,
        taskId: entry.taskId,
        userId: entry.userId,
        dateUtc: entry.dateUtc,
        duration: entry.duration,
        description: entry.description,
        status: entry.status,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
