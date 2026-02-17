#!/usr/bin/env -S npx tsx
// List or create tasks for a Xero project.
// Usage:
//   npx tsx scripts/tasks.ts <project-id>
//   npx tsx scripts/tasks.ts <project-id> --create --name <name> --rate <rate> --charge-type <TIME|FIXED|NON_CHARGEABLE>
//     [--estimate-hours <hours>] [--currency <NZD>]

import { getClient, parseArgs } from "../../xero/lib/client.js";
import { ChargeType } from "xero-node";

async function main() {
  const argv = process.argv.slice(2);
  const projectId = argv[0];

  if (!projectId) {
    console.error("Usage: npx tsx scripts/tasks.ts <project-id> [--create ...]");
    process.exit(1);
  }

  const args = parseArgs(argv.slice(1));
  const { xero, tenantId } = await getClient();

  if ("create" in args) {
    if (!args.name || !args.rate || !args["charge-type"]) {
      console.error(
        "Usage: npx tsx scripts/tasks.ts <project-id> --create --name <name> --rate <rate> --charge-type <TIME|FIXED|NON_CHARGEABLE>",
      );
      process.exit(1);
    }

    const taskCreateOrUpdate: any = {
      name: args.name,
      rate: {
        currency: args.currency ?? "NZD",
        value: parseFloat(args.rate),
      },
      chargeType: args["charge-type"] as ChargeType,
    };

    if (args["estimate-hours"]) {
      taskCreateOrUpdate.estimateMinutes = parseInt(args["estimate-hours"], 10) * 60;
    }

    const response = await xero.projectApi.createTask(tenantId, projectId, taskCreateOrUpdate);
    const task = response.body;

    console.log(
      JSON.stringify(
        {
          taskId: task.taskId,
          name: task.name,
          chargeType: task.chargeType,
          rate: task.rate?.value,
          estimateMinutes: task.estimateMinutes,
          status: task.status,
        },
        null,
        2,
      ),
    );
  } else {
    // List tasks
    const response = await xero.projectApi.getTasks(
      tenantId,
      projectId,
      undefined, // taskIds
      undefined, // chargeType
      1,
      50,
    );

    const tasks = response.body.items ?? [];

    if (tasks.length === 0) {
      console.log("No tasks found.");
      return;
    }

    const output = tasks.map((t) => ({
      taskId: t.taskId,
      name: t.name,
      chargeType: t.chargeType,
      rate: t.rate?.value,
      estimateMinutes: t.estimateMinutes,
      totalMinutes: t.totalMinutes,
      totalAmount: t.totalAmount?.value,
      status: t.status,
    }));

    console.log(JSON.stringify(output, null, 2));
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
