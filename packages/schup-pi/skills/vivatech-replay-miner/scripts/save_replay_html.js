#!/usr/bin/env node
// Save the VivaTech replay page HTML from an already-authenticated Chrome session.
// Usage: node save_replay_html.js <output-dir>

import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from '/Users/pschuermann/.claude/skills/browser-tools/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';

const outDir = process.argv[2] || 'vivatech-2026-replay';
await fs.mkdir(outDir, { recursive: true });

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
let [page] = await browser.pages();
if (!page) page = await browser.newPage();

await page.goto('https://vivatech.com/replay', { waitUntil: 'networkidle2', timeout: 60000 });
const html = await page.evaluate(async () => await (await fetch('/replay', { credentials: 'include' })).text());
const outPath = path.join(outDir, 'replay-browser.html');
await fs.writeFile(outPath, html);
console.log(JSON.stringify({ outPath, length: html.length, replayUrlCount: (html.match(/replayUrl/g) || []).length, title: await page.title(), url: page.url() }, null, 2));
await browser.disconnect();
