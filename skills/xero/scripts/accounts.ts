#!/usr/bin/env -S npx tsx
// List Xero chart of accounts.
// Usage: npx tsx scripts/accounts.ts [--type REVENUE|EXPENSE|BANK|...]

import { getClient, parseArgs } from "../lib/client.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const type = args.type;

  const { xero, tenantId } = await getClient();

  const where = type ? `Type=="${type}"` : undefined;

  const response = await xero.accountingApi.getAccounts(
    tenantId,
    undefined, // ifModifiedSince
    where,
    undefined, // order
  );

  const accounts = response.body.accounts ?? [];

  const output = accounts
    .map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
      taxType: a.taxType ?? null,
      class: a._class,
      status: a.status,
    }))
    .sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
