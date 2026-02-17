#!/usr/bin/env -S npx tsx
// Create a Xero quote from a JSON file.
// Usage: npx tsx scripts/create-quote.ts <json-file>
//
// All new quotes are created as DRAFT regardless of the status supplied.

import { readFileSync } from "fs";
import { getClient, formatErrors } from "../../xero/lib/client.js";

async function main() {
  const jsonFile = process.argv[2];
  if (!jsonFile) {
    console.error("Usage: npx tsx scripts/create-quote.ts <json-file>");
    process.exit(1);
  }

  const payload = JSON.parse(readFileSync(jsonFile, "utf-8"));
  const { xero, tenantId } = await getClient();

  const response = await xero.accountingApi.createQuotes(tenantId, { quotes: [payload] });
  const quote = response.body.quotes?.[0];

  if (!quote) {
    console.error("Error: No quote returned.");
    process.exit(1);
  }

  const errors = formatErrors(quote);
  if (errors.length > 0) {
    console.error("Validation errors:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        quoteID: quote.quoteID,
        quoteNumber: quote.quoteNumber,
        title: quote.title,
        status: quote.status,
        total: quote.total,
        contact: quote.contact?.name,
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
