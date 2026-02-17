#!/usr/bin/env -S npx tsx
// Search or list Xero contacts.
// Usage: npx tsx scripts/contacts.ts [query] [--page N]

import { getClient, parseArgs } from "../lib/client.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const query = args._positional || "";
  const page = parseInt(args.page ?? "1", 10);

  const { xero, tenantId } = await getClient();

  const where = query ? `Name.Contains("${query}")` : undefined;

  const response = await xero.accountingApi.getContacts(
    tenantId,
    undefined, // ifModifiedSince
    where,
    undefined, // order
    undefined, // iDs
    page,
    undefined, // includeArchived
  );

  const contacts = response.body.contacts ?? [];

  if (contacts.length === 0) {
    console.log(query ? `No contacts matching "${query}".` : "No contacts found.");
    return;
  }

  const output = contacts.map((c) => ({
    contactID: c.contactID,
    name: c.name,
    emailAddress: c.emailAddress ?? null,
    accountNumber: c.accountNumber ?? null,
    isCustomer: c.isCustomer ?? false,
    isSupplier: c.isSupplier ?? false,
  }));

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
