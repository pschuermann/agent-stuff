#!/usr/bin/env -S npx tsx
// Email a Xero invoice to the contact.
// Usage: npx tsx scripts/send-invoice.ts <invoice-id>
//
// The invoice must be AUTHORISED and the contact must have an email address.

import { getClient } from "../../xero/lib/client.js";

async function main() {
  const invoiceId = process.argv[2];
  if (!invoiceId) {
    console.error("Usage: npx tsx scripts/send-invoice.ts <invoice-id>");
    process.exit(1);
  }

  const { xero, tenantId } = await getClient();

  await xero.accountingApi.emailInvoice(tenantId, invoiceId, {});
  console.log(`Invoice ${invoiceId} sent successfully.`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
