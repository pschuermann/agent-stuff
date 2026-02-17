#!/usr/bin/env -S npx tsx
// Create a Xero project.
// Usage: npx tsx scripts/create-project.ts --contact <id> --name <name> [--estimate <amount>] [--deadline <YYYY-MM-DD>]

import { getClient, parseArgs } from "../../xero/lib/client.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.contact || !args.name) {
    console.error(
      "Usage: npx tsx scripts/create-project.ts --contact <id> --name <name> [--estimate <amount>] [--deadline <YYYY-MM-DD>]",
    );
    process.exit(1);
  }

  const { xero, tenantId } = await getClient();

  const projectCreateOrUpdate: any = {
    contactId: args.contact,
    name: args.name,
  };

  if (args.estimate) {
    projectCreateOrUpdate.estimateAmount = parseFloat(args.estimate);
  }

  if (args.deadline) {
    projectCreateOrUpdate.deadlineUtc = new Date(`${args.deadline}T23:59:59Z`);
  }

  const response = await xero.projectApi.createProject(tenantId, projectCreateOrUpdate);
  const project = response.body;

  console.log(
    JSON.stringify(
      {
        projectId: project.projectId,
        name: project.name,
        contactId: project.contactId,
        status: project.status,
        estimateAmount: project.estimate?.amount,
        deadlineUtc: project.deadlineUtc,
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
