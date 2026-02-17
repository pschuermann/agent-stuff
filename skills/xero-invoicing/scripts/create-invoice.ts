#!/usr/bin/env -S npx tsx
// Create a Xero invoice from a JSON file.
// Usage: npx tsx scripts/create-invoice.ts <json-file>
//
// The JSON file should contain the invoice payload.

import { readFileSync } from "fs";
import { Invoice } from "xero-node";
import { getClient, formatErrors } from "../../xero/lib/client.js";

async function main() {
  const jsonFile = process.argv[2];
  if (!jsonFile) {
    console.error("Usage: npx tsx scripts/create-invoice.ts <json-file>");
    process.exit(1);
  }

  const payload = JSON.parse(readFileSync(jsonFile, "utf-8"));
  const { xero, tenantId } = await getClient();

  const response = await xero.accountingApi.createInvoices(tenantId, { invoices: [payload] });
  const invoice = response.body.invoices?.[0];

  if (!invoice) {
    console.error("Error: No invoice returned.");
    process.exit(1);
  }

  const errors = formatErrors(invoice);
  if (errors.length > 0) {
    console.error("Validation errors:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        invoiceID: invoice.invoiceID,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        total: invoice.total,
        contact: invoice.contact?.name,
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
