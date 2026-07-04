#!/bin/bash
# Search New World NZ for products using playwright-cli (headed, persistent session).
# Usage: newworld-search.sh <query>
# Example: newworld-search.sh "snickers"
#
# Requires: playwright-cli (npm i -g @anthropic/playwright-cli), Chrome
# Store: Set interactively via playwright-cli. State persisted in session "nw".
#
# First-time setup:
#   playwright-cli -s=nw open https://www.newworld.co.nz --headed --persistent --browser=chrome
#   # Then manually select your store via the store picker in the UI
#   playwright-cli -s=nw close
#
# The persistent session remembers the store between runs.

set -euo pipefail

QUERY="${1:?Usage: newworld-search.sh <query>}"
SESSION="nw"
ENCODED_QUERY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QUERY'))")

# Check if session exists, if not start one
if ! playwright-cli -s=$SESSION tab-list 2>/dev/null | grep -q "current"; then
  playwright-cli -s=$SESSION open --headed --persistent --browser=chrome 2>/dev/null
  sleep 2
fi

# Navigate to search
playwright-cli -s=$SESSION goto "https://www.newworld.co.nz/shop/search?q=${ENCODED_QUERY}" 2>/dev/null

# Wait for page to load past Cloudflare
sleep 5

# Extract product data
playwright-cli -s=$SESSION eval '() => {
  const products = [];
  const links = document.querySelectorAll("a[href*=product]");
  const seen = new Set();
  links.forEach(link => {
    const ps = link.querySelectorAll("p");
    if (ps.length < 1) return;
    const name = ps[0].textContent.trim();
    if (seen.has(name)) return;
    seen.add(name);
    const card = link.closest("div").parentElement;
    const allText = card.innerText;
    products.push({ name, size: ps.length > 1 ? ps[1].textContent.trim() : "", text: allText.replace(/\n/g, " | ").substring(0, 300) });
  });
  return products;
}' 2>/dev/null | python3 -c "
import json, sys, re

# Read the playwright-cli output — find the JSON array in the output
raw = sys.stdin.read()
match = re.search(r'\[.*\]', raw, re.DOTALL)
if not match:
    print('Error: No product data found')
    sys.exit(1)

products = json.loads(match.group())

# Determine store from page
print('Store: New World (from persistent session)')
print(f'Results: {len(products)}')
print()

for p in products:
    text = p['text']
    parts = [x.strip() for x in text.split('|') if x.strip()]

    # Extract prices: pattern 'X.' followed by 'YY' or standalone 'XX' followed by 'YY'
    prices = []
    unit_prices = []
    i = 0
    while i < len(parts):
        if re.match(r'^\d+\.\$', parts[i]):
            i += 1
            continue
        if parts[i].startswith('\$') and '/' in parts[i]:
            unit_prices.append(parts[i])
            i += 1
            continue
        if re.match(r'^\d+\.$', parts[i]) and i+1 < len(parts) and re.match(r'^\d{1,2}$', parts[i+1]):
            prices.append(float(f'{parts[i]}{parts[i+1]}'))
            i += 2
            continue
        if re.match(r'^\d+$', parts[i]) and i+1 < len(parts) and re.match(r'^\d{2}$', parts[i+1]):
            if i+2 < len(parts) and ('ea' in parts[i+2] or parts[i+2].startswith('\$')):
                prices.append(float(f'{parts[i]}.{parts[i+1]}'))
                i += 2
                continue
            if i > 0 and parts[i-1].startswith('\$') and '/' in parts[i-1]:
                prices.append(float(f'{parts[i]}.{parts[i+1]}'))
                i += 2
                continue
        i += 1

    has_club = len(prices) >= 2
    if has_club:
        best = prices[0]
        regular = prices[1]
        tag = f' [CLUB] (was \${regular})'
        unit = unit_prices[0] if unit_prices else ''
    elif prices:
        best = prices[0]
        tag = ''
        unit = unit_prices[0] if unit_prices else ''
    else:
        best = 0
        tag = ' [PARSE ERROR]'
        unit = ''

    # Per-unit for packs
    per_unit = ''
    pack_match = re.search(r'(\d+)pk', p['size'])
    if pack_match:
        count = int(pack_match.group(1))
        per_unit = f' = \${best/count:.2f}/ea'

    print(f'  \${best:.2f}{tag} | {p[\"name\"]} | {p[\"size\"]} | {unit}{per_unit}')
"
