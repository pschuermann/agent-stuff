#!/usr/bin/env -S npx tsx
// List Xero quotes with optional filters.
// Usage: npx tsx scripts/list-quotes.ts [--status STATUS] [--contact ID] [--page N]

import { getClient, parseArgs } from "../../xero/lib/client.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const page = parseInt(args.page ?? "1", 10);

  const { xero, tenantId } = await getClient();

  const response = await xero.accountingApi.getQuotes(
    tenantId,
    undefined, // ifModifiedSince
    undefined, // dateFrom
    undefined, // dateTo
    undefined, // expiryDateFrom
    undefined, // expiryDateTo
    args.contact, // contactID
    args.status, // status
    page,
    undefined, // order
    undefined, // quoteNumber
  );

  const quotes = response.body.quotes ?? [];

  if (quotes.length === 0) {
    console.log("No quotes found.");
    return;
  }

  const output = quotes.map((q) => ({
    quoteID: q.quoteID,
    quoteNumber: q.quoteNumber,
    contact: q.contact?.name,
    title: q.title,
    date: q.date,
    expiryDate: q.expiryDate,
    status: q.status,
    total: q.total,
    currencyCode: q.currencyCode,
  }));

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
