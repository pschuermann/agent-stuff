#!/usr/bin/env -S npx tsx
// List Xero invoices with optional filters.
// Usage: npx tsx scripts/list-invoices.ts [--status STATUS] [--contact ID] [--overdue] [--page N] [--summary]

import { getClient, parseArgs } from "../../xero/lib/client.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const page = parseInt(args.page ?? "1", 10);

  const { xero, tenantId } = await getClient();

  const statuses = args.overdue ? ["AUTHORISED"] : args.status ? [args.status] : undefined;
  const contactIDs = args.contact ? [args.contact] : undefined;

  // Build where clause for overdue
  let where: string | undefined;
  if (args.overdue) {
    const today = new Date().toISOString().split("T")[0];
    where = `DueDate<DateTime(${today.replace(/-/g, ",")})`;
  }

  const response = await xero.accountingApi.getInvoices(
    tenantId,
    undefined, // ifModifiedSince
    where,
    "DueDate", // order
    undefined, // iDs
    undefined, // invoiceNumbers
    contactIDs,
    statuses,
    page,
    undefined, // includeArchived
    undefined, // createdByMyApp
    undefined, // unitdp
    args.summary === "true", // summaryOnly
  );

  const invoices = response.body.invoices ?? [];

  if (invoices.length === 0) {
    console.log("No invoices found.");
    return;
  }

  const output = invoices.map((inv) => ({
    invoiceID: inv.invoiceID,
    invoiceNumber: inv.invoiceNumber,
    type: inv.type,
    contact: inv.contact?.name,
    date: inv.date,
    dueDate: inv.dueDate,
    status: inv.status,
    amountDue: inv.amountDue,
    total: inv.total,
    currencyCode: inv.currencyCode,
  }));

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
