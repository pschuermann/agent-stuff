#!/usr/bin/env -S npx tsx
// Get full details of a Xero invoice.
// Usage: npx tsx scripts/get-invoice.ts <invoice-id-or-number>

import { getClient } from "../../xero/lib/client.js";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npx tsx scripts/get-invoice.ts <invoice-id-or-number>");
    process.exit(1);
  }

  const { xero, tenantId } = await getClient();

  // If it looks like a UUID, fetch directly; otherwise search by number
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isUUID) {
    const response = await xero.accountingApi.getInvoice(tenantId, id);
    console.log(JSON.stringify(response.body.invoices?.[0] ?? response.body, null, 2));
  } else {
    const response = await xero.accountingApi.getInvoices(
      tenantId,
      undefined, undefined, undefined, undefined,
      [id], // invoiceNumbers
    );
    const invoice = response.body.invoices?.[0];
    if (!invoice) {
      console.error(`Invoice "${id}" not found.`);
      process.exit(1);
    }
    console.log(JSON.stringify(invoice, null, 2));
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
