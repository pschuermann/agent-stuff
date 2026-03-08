#!/bin/bash
# One-time setup: set Woolworths NZ location to a local store and save cookies.
# Usage: setup-woolworths-location.sh [suburb]
# Example: setup-woolworths-location.sh "Queenstown"
#
# Saves cookies to ../woolworths-cookies.txt for use by woolworths-search.sh.

SUBURB="${1:-Queenstown}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COOKIES_FILE="$SCRIPT_DIR/../woolworths-cookies.txt"
SESSION="ww-setup"

echo "Opening Woolworths in browser..."
echo ""

playwright-cli -s="$SESSION" open --persistent --headed 2>/dev/null || true
sleep 1
playwright-cli -s="$SESSION" goto "https://www.woolworths.co.nz" 2>/dev/null || true
sleep 3

echo "Browser is open at woolworths.co.nz"
echo ""
echo "Please:"
echo "  1. Click the delivery/location selector"
echo "  2. Search for and select a store near $SUBURB"
echo "  3. Come back here and press Enter"
echo ""
read -r -p "Press Enter when your store is selected..."

echo ""
echo "Saving cookies..."

playwright-cli -s="$SESSION" eval '() => document.cookie' 2>/dev/null | python3 -c "
import sys, json

raw = sys.stdin.read()
lines = raw.split('\n')
result_str = None
for i, line in enumerate(lines):
    if line.strip() == '### Result':
        if i + 1 < len(lines):
            result_str = lines[i + 1]
        break

if not result_str:
    print('Could not read cookies', file=sys.stderr)
    sys.exit(1)

try:
    cookie_str = json.loads(result_str)
except:
    cookie_str = result_str.strip('\"')

print('# Netscape HTTP Cookie File')
for pair in cookie_str.split(';'):
    pair = pair.strip()
    if '=' in pair:
        name, _, value = pair.partition('=')
        print(f'.woolworths.co.nz\tTRUE\t/\tFALSE\t0\t{name.strip()}\t{value.strip()}')
" > "$COOKIES_FILE"

playwright-cli -s="$SESSION" close 2>/dev/null || true

echo "Verifying location..."
ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('berocca'))")
curl -s -b "$COOKIES_FILE" \
  "https://www.woolworths.co.nz/api/v1/products?target=search&search=${ENCODED}&size=1" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "x-requested-with: OnlineShopping.WebApp" \
  -H "Accept: application/json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
store = data.get('context', {}).get('fulfilment', {}).get('address', 'Unknown')
print(f'Store set to: {store}')
"
