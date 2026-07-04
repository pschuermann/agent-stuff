#!/bin/bash
# Search The Warehouse NZ for products using playwright-cli.
# Usage: the-warehouse-search.sh <query> [max_results]
# Example: the-warehouse-search.sh "berocca" 10
#
# Requires: playwright-cli
# Filters out Marketplace items (only shows The Warehouse-owned products).

set -uo pipefail

QUERY="${1:?Usage: the-warehouse-search.sh <query> [max_results]}"
MAX_RESULTS="${2:-10}"
SESSION="tw-search"
ENCODED_QUERY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QUERY'))")
EVAL_OUT=$(mktemp)
trap "playwright-cli -s=$SESSION close 2>/dev/null || true; rm -f $EVAL_OUT" EXIT

playwright-cli -s="$SESSION" open --persistent >/dev/null 2>&1 || true
sleep 1

playwright-cli -s="$SESSION" goto "https://www.thewarehouse.co.nz/search?q=${ENCODED_QUERY}" >/dev/null 2>&1

sleep 4

playwright-cli -s="$SESSION" eval '() => document.body.innerText' > "$EVAL_OUT" 2>/dev/null

python3 - "$MAX_RESULTS" "$EVAL_OUT" << 'PYTHON'
import json, sys, re

max_results = int(sys.argv[1]) if len(sys.argv) > 1 else 10
with open(sys.argv[2]) as f:
    raw = f.read()

# Extract JSON string from playwright-cli markdown output
lines = raw.split('\n')
result_str = None
for i, line in enumerate(lines):
    if line.strip() == '### Result':
        if i + 1 < len(lines):
            result_str = lines[i + 1]
        break

if not result_str:
    print('Store: The Warehouse')
    print('Results: 0')
    sys.exit(0)

try:
    text = json.loads(result_str)
except:
    print('Store: The Warehouse')
    print('Results: 0')
    sys.exit(0)

# Parse products from page text
# Pattern: "$23.00\nProduct Name\nProduct rating: X.X"
# Marketplace items have seller name on a nearby line
marketplace_sellers = [
    'Noel Leeming', 'Oz Hair & Beauty', 'Vita Health', 'KG Superstore',
    'Willway Trends', 'Marketplace Store'
]

products = []
lines = [l.strip() for l in text.split('\n') if l.strip()]

i = 0
while i < len(lines) and len(products) < max_results:
    line = lines[i]

    # Skip "Save $X.XX" lines
    if line.startswith('Save '):
        i += 1
        continue

    price_match = re.match(r'^\$(\d+(?:,\d{3})*\.\d{2})$', line)
    if not price_match:
        i += 1
        continue

    price = float(price_match.group(1).replace(',', ''))

    if i + 1 >= len(lines):
        i += 1
        continue

    name = lines[i + 1]

    if name.startswith('$') or name.startswith('Save ') or len(name) < 5 or name in ['Add to wishlist', 'Sort by']:
        i += 1
        continue

    # Check for marketplace seller in nearby lines
    is_marketplace = False
    for j in range(i + 2, min(i + 6, len(lines))):
        if any(seller in lines[j] for seller in marketplace_sellers):
            is_marketplace = True
            break
        if re.match(r'^\$\d', lines[j]):
            break

    if is_marketplace:
        i += 2
        continue

    if price > 200:
        i += 2
        continue

    if not any(p['name'] == name for p in products):
        products.append({'name': name, 'price': price})

    i += 2

print('Store: The Warehouse')
print(f'Results: {len(products)}')
print()

products = sorted(products, key=lambda x: x['price'])

for p in products:
    name = p['name']
    price = p['price']

    pack_match = re.search(r'(\d+)\s*(?:Pack|Tablets?|Capsules?)', name, re.I)
    per_unit = ''
    if pack_match:
        count = int(pack_match.group(1))
        if count > 0:
            per_unit = f' = ${price/count:.2f}/ea'

    print(f'  ${price:.2f} | {name}{per_unit}')
PYTHON
