#!/usr/bin/env -S npx tsx
// List Xero projects with optional filters.
// Usage: npx tsx scripts/list-projects.ts [--state INPROGRESS|CLOSED] [--contact ID] [--page N] [--users]

import { getClient, parseArgs } from "../../xero/lib/client.js";
import { ProjectStatus } from "xero-node";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const page = parseInt(args.page ?? "1", 10);

  const { xero, tenantId } = await getClient();

  // List project users instead
  if ("users" in args) {
    const response = await xero.projectApi.getProjectUsers(tenantId, page, 50);
    console.log(JSON.stringify(response.body.items ?? response.body, null, 2));
    return;
  }

  const states = args.state
    ? [args.state as ProjectStatus]
    : undefined;

  const response = await xero.projectApi.getProjects(
    tenantId,
    undefined, // projectIds
    args.contact, // contactID
    states,
    page,
    50, // pageSize
  );

  const projects = response.body.items ?? [];

  if (projects.length === 0) {
    console.log("No projects found.");
    return;
  }

  const output = projects.map((p) => ({
    projectId: p.projectId,
    name: p.name,
    contactId: p.contactId,
    status: p.status,
    deadlineUtc: p.deadlineUtc,
    estimateAmount: p.estimate?.amount,
    totalTaskAmount: p.totalTaskAmount?.value,
    totalInvoiced: p.totalInvoiced?.value,
    minutesLogged: p.minutesLogged,
  }));

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
