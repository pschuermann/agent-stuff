#!/bin/bash
# Search Woolworths NZ for products and return structured price data.
# Usage: woolworths-search.sh <query> [max_results]
# Example: woolworths-search.sh "snickers" 5
#
# Requires: curl, python3
# Location: Set by session cookies. Pass cookie file via WOOLWORTHS_COOKIES env var.
# Without cookies, defaults to a server-assigned location.

set -euo pipefail

QUERY="${1:?Usage: woolworths-search.sh <query> [max_results]}"
SIZE="${2:-8}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_COOKIES="$SCRIPT_DIR/../woolworths-cookies.txt"
COOKIE_ARGS=""

# Use explicit env var, then fall back to saved default cookies
COOKIES_FILE="${WOOLWORTHS_COOKIES:-}"
if [ -z "$COOKIES_FILE" ] && [ -f "$DEFAULT_COOKIES" ]; then
  COOKIES_FILE="$DEFAULT_COOKIES"
fi

if [ -n "$COOKIES_FILE" ] && [ -f "$COOKIES_FILE" ]; then
  COOKIE_ARGS="-b $COOKIES_FILE"
fi

ENCODED_QUERY=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QUERY'))")

curl -s $COOKIE_ARGS \
  "https://www.woolworths.co.nz/api/v1/products?target=search&search=${ENCODED_QUERY}&inStockProductsOnly=false&size=${SIZE}" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "x-requested-with: OnlineShopping.WebApp" \
  -H "Accept: application/json" | python3 -c "
import json, sys, re

data = json.load(sys.stdin)
store = 'Woolworths'
items = [i for i in data.get('products', {}).get('items', []) if i.get('type') == 'Product']

print(f'Store: Woolworths ({store})')
print(f'Results: {len(items)}')
print()

for item in items:
    p = item.get('price', {})
    sz = item.get('size', {})
    name = item['name']
    sale_price = p.get('salePrice', 0)
    orig_price = p.get('originalPrice', 0)
    is_club = p.get('isClubPrice', False)
    is_special = p.get('isSpecial', False)
    pkg = sz.get('volumeSize') or sz.get('packageType') or '?'
    cup_price = sz.get('cupPrice', '?')
    cup_measure = sz.get('cupMeasure', '?')

    tag = ''
    if is_club: tag = ' [CLUB]'
    elif is_special: tag = ' [SALE]'

    was = ''
    if sale_price != orig_price: was = f' (was \${orig_price})'

    # Calculate per-unit for packs/tablets
    per_unit = ''
    count_match = re.search(r'(\d+)\s*(?:pack|tablets?|capsules?|effervescent tablets?|sachets?)', str(pkg) + ' ' + name, re.I)
    if count_match:
        count = int(count_match.group(1))
        if count > 1:
            per_unit = f' = \${sale_price/count:.2f}/ea'

    print(f'  \${sale_price:.2f}{tag}{was} | {name} | {pkg} | \${cup_price}/{cup_measure}{per_unit}')
"
