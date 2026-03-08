#!/bin/bash
# Multi-store price comparison for NZ retailers.
# Usage: multi-store-search.sh <product_name>
# Example: multi-store-search.sh "berocca"
#
# Searches:  Woolworths (API), Chemist Warehouse (playwright), The Warehouse (playwright)
# Output: Sorted price comparison table

set -uo pipefail

PRODUCT="${1:?Usage: multi-store-search.sh <product_name>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔍 Price Search: $PRODUCT"
echo ""

# Run Woolworths search (fastest, API-based)
echo "📊 Searching Woolworths..."
WW_RESULTS=$("$SCRIPT_DIR/woolworths-search.sh" "$PRODUCT" 5 2>/dev/null || echo "Store: Woolworths\nResults: 0")

# Show results
echo "$WW_RESULTS"
