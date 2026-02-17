#!/usr/bin/env -S npx tsx
// Get a financial summary of a Xero project.
// Usage: npx tsx scripts/project-summary.ts <project-id>

import { getClient } from "../../xero/lib/client.js";

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Usage: npx tsx scripts/project-summary.ts <project-id>");
    process.exit(1);
  }

  const { xero, tenantId } = await getClient();

  // Fetch project and tasks in parallel
  const [projectRes, tasksRes] = await Promise.all([
    xero.projectApi.getProject(tenantId, projectId),
    xero.projectApi.getTasks(tenantId, projectId, undefined, undefined, 1, 500),
  ]);

  const project = projectRes.body;
  const tasks = tasksRes.body.items ?? [];

  console.log("=== Project ===");
  console.log(
    JSON.stringify(
      {
        name: project.name,
        status: project.status,
        contactId: project.contactId,
        deadlineUtc: project.deadlineUtc,
        estimate: project.estimate?.amount,
        totalTaskAmount: project.totalTaskAmount?.value,
        totalExpenseAmount: project.totalExpenseAmount?.value,
        totalInvoiced: project.totalInvoiced?.value,
        totalToBeInvoiced: project.totalToBeInvoiced?.value,
        minutesLogged: project.minutesLogged,
        hoursLogged: project.minutesLogged ? Math.floor(project.minutesLogged / 60) : 0,
      },
      null,
      2,
    ),
  );

  console.log("\n=== Tasks ===");
  const taskSummary = tasks.map((t) => ({
    name: t.name,
    chargeType: t.chargeType,
    rate: t.rate?.value,
    estimateMinutes: t.estimateMinutes,
    totalMinutes: t.totalMinutes,
    totalAmount: t.totalAmount?.value,
    status: t.status,
    estimateHours: t.estimateMinutes ? t.estimateMinutes / 60 : null,
    actualHours: t.totalMinutes ? t.totalMinutes / 60 : null,
  }));

  console.log(JSON.stringify(taskSummary, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
