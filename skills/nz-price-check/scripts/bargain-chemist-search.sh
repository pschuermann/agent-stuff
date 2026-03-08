#!/bin/bash
# Search Bargain Chemist NZ for products using playwright-cli.
# Usage: bargain-chemist-search.sh <query> [max_results]
# Example: bargain-chemist-search.sh "berocca" 10
#
# Requires: playwright-cli

set -uo pipefail

QUERY="${1:?Usage: bargain-chemist-search.sh <query> [max_results]}"
MAX_RESULTS="${2:-10}"
SESSION="bc-search"
ENCODED_QUERY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QUERY'))")
EVAL_OUT=$(mktemp)
trap "playwright-cli -s=$SESSION close 2>/dev/null || true; rm -f $EVAL_OUT" EXIT

playwright-cli -s="$SESSION" open --persistent >/dev/null 2>&1 || true
sleep 1

playwright-cli -s="$SESSION" goto "https://www.bargainchemist.co.nz/search?q=${ENCODED_QUERY}" >/dev/null 2>&1

sleep 5

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
    print('Store: Bargain Chemist')
    print('Results: 0')
    sys.exit(0)

try:
    text = json.loads(result_str)
except:
    print('Store: Bargain Chemist')
    print('Results: 0')
    sys.exit(0)

# Parse products from page text
# Pattern: "Product Name\nRegular price $X.XX\n$X.XX\nQuick view\nAdd to cart"
# or sale: "Product Name\nRegular price $X, now on sale for $Y\n$Y\nWhy pay $X\nQuick view\nAdd to cart"
products = []
blocks = re.split(r'Add to cart', text)

for block in blocks:
    if len(products) >= max_results:
        break

    lines = [l.strip() for l in block.split('\n') if l.strip()]
    if len(lines) < 2:
        continue

    price = None
    was_price = None
    name = None

    for line in lines:
        sale_match = re.search(r'Regular price \$(\d+(?:\.\d{2})?),?\s*now on sale for \$(\d+(?:\.\d{2})?)', line)
        if sale_match:
            was_price = float(sale_match.group(1))
            price = float(sale_match.group(2))
            continue

        reg_match = re.match(r'^Regular price \$(\d+(?:\.\d{2})?)$', line)
        if reg_match and price is None:
            price = float(reg_match.group(1))
            continue

        why_match = re.search(r'Why pay \$(\d+(?:\.\d{2})?)', line)
        if why_match and was_price is None:
            was_price = float(why_match.group(1))
            continue

    if price is None:
        continue

    # Name: first substantial line that's not price/filter/nav
    skip_patterns = ['Regular price', 'Why pay', 'Quick view', 'Add to cart', 'Filter',
                     'Sort by', 'Products', 'Pages', 'results', 'Search Result',
                     'Brand', 'Category', 'Relevance', 'Grid view', 'List view',
                     'Click & Collect', 'Low online stock', 'Current Page',
                     'Go to Page', 'next page', 'Items Per Page']
    for line in lines:
        if any(p.lower() in line.lower() for p in skip_patterns):
            continue
        if line.startswith('$') or re.match(r'^\d+$', line):
            continue
        if len(line) > 5:
            name = line
            break

    if not name:
        continue

    if any(p['name'] == name for p in products):
        continue

    products.append({'name': name, 'price': price, 'wasPrice': was_price})

print('Store: Bargain Chemist')
print(f'Results: {len(products)}')
print()

products = sorted(products, key=lambda x: x['price'])

for p in products:
    name = p['name']
    price = p['price']
    was_price = p['wasPrice']

    pack_match = re.search(r'(\d+)(?:s\b|\s*tablets?|\s*capsules?|\s*pack|\s*sachets?)', name, re.I)
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
