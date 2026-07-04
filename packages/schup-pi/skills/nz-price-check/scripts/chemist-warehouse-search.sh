#!/bin/bash
# Search Chemist Warehouse NZ for products using playwright-cli.
# Usage: chemist-warehouse-search.sh <query> [max_results]
# Example: chemist-warehouse-search.sh "berocca" 10
#
# Requires: playwright-cli

set -uo pipefail

QUERY="${1:?Usage: chemist-warehouse-search.sh <query> [max_results]}"
MAX_RESULTS="${2:-10}"
SESSION="cw-search"
EVAL_OUT=$(mktemp)
trap "playwright-cli -s=$SESSION close 2>/dev/null || true; rm -f $EVAL_OUT" EXIT

ENCODED_QUERY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QUERY'))")

playwright-cli -s="$SESSION" open --persistent >/dev/null 2>&1 || true
sleep 1

QUERY_LOWER=$(echo "$QUERY" | tr '[:upper:]' '[:lower:]')
if echo "$QUERY_LOWER" | grep -q "berocca"; then
  playwright-cli -s="$SESSION" goto "https://www.chemistwarehouse.co.nz/shop-online/610/berocca" >/dev/null 2>&1
else
  playwright-cli -s="$SESSION" goto "https://www.chemistwarehouse.co.nz/search?q=${ENCODED_QUERY}" >/dev/null 2>&1
fi

sleep 3

playwright-cli -s="$SESSION" eval '() => document.body.innerText' > "$EVAL_OUT" 2>/dev/null

python3 - "$MAX_RESULTS" "$EVAL_OUT" << 'PYTHON'
import json, sys, re

max_results = int(sys.argv[1]) if len(sys.argv) > 1 else 10
with open(sys.argv[2]) as f:
    raw = f.read()

# Extract the JSON string from playwright-cli markdown output
# The result line after "### Result" is a JSON-encoded string
lines = raw.split('\n')
result_str = None
for i, line in enumerate(lines):
    if line.strip() == '### Result':
        if i + 1 < len(lines):
            result_str = lines[i + 1]
        break

if not result_str:
    print('Store: Chemist Warehouse')
    print('Results: 0')
    sys.exit(0)

try:
    text = json.loads(result_str)
except:
    print('Store: Chemist Warehouse')
    print('Results: 0')
    sys.exit(0)

# Parse products from page text
# Pattern: "Product Name\n(review_count)\n$price\nBUY NOW"
# or:      "Product Name\n(review_count)\n$price\nWhy Pay $was_price?\nBUY NOW"
products = []
blocks = re.split(r'BUY NOW', text)

for block in blocks:
    if len(products) >= max_results:
        break

    lines = [l.strip() for l in block.split('\n') if l.strip()]
    if len(lines) < 2:
        continue

    price = None
    was_price = None
    name = None

    for i, line in enumerate(lines):
        price_match = re.match(r'^\$(\d+\.\d{2})$', line)
        if price_match:
            price = float(price_match.group(1))
            if i + 1 < len(lines):
                why_match = re.match(r'Why Pay \$(\d+\.\d{2})', lines[i + 1])
                if why_match:
                    was_price = float(why_match.group(1))
            break

    if price is None or price <= 0:
        continue

    # Name: last substantial line before the price/review-count lines
    for line in reversed(lines):
        if line.startswith('$') or re.match(r'^\(\d+\)$', line) or len(line) < 5:
            continue
        if any(kw in line for kw in ['Showing', 'Results', 'Sort by', 'Refine', 'Why Pay']):
            continue
        name = line
        break

    if not name:
        continue

    products.append({'name': name, 'price': price, 'wasPrice': was_price})

print('Store: Chemist Warehouse')
print(f'Results: {len(products)}')
print()

products = sorted(products, key=lambda x: x['price'])

for p in products:
    name = p['name']
    price = p['price']
    was_price = p['wasPrice']

    pack_match = re.search(r'(\d+)\s*(?:Effervescent\s+Tablets?|Tablets?|Capsules?|Pack|Sachets?)', name, re.I)
    per_unit = ''
    if pack_match:
        count = int(pack_match.group(1))
        if count > 0:
            per_unit = f' = ${price/count:.2f}/ea'

    sale_tag = ''
    if was_price:
        sale_tag = f' [SALE] (was ${was_price:.2f})'

    print(f'  ${price:.2f} | {name}{sale_tag}{per_unit}')
PYTHON
