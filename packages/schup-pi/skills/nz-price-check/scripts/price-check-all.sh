#!/bin/bash
# Search all NZ retailers for a product and display comparison table.
# Usage: price-check-all.sh <product> [max_results_per_store]
# Example: price-check-all.sh "berocca" 5
#
# Requires: curl, python3, playwright-cli
# Searches: Woolworths NZ, New World, Chemist Warehouse, Bargain Chemist, The Warehouse

set -euo pipefail

PRODUCT="${1:?Usage: price-check-all.sh <product> [max_results_per_store]}"
MAX_RESULTS="${2:-5}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIMITS_FILE="$SCRIPT_DIR/../limits.json"

# Ensure scripts are executable
chmod +x "$SCRIPT_DIR"/*.sh

# Temporary file for results
TEMP_FILE=$(mktemp)
trap "rm -f $TEMP_FILE" EXIT

echo "🔍 Searching $MAX_RESULTS results per store for: $PRODUCT"
echo ""

# Define stores and their scripts (using simple arrays for portability)
stores_names=("Woolworths" "Chemist Warehouse" "Bargain Chemist" "The Warehouse")
stores_scripts=("woolworths-search.sh" "chemist-warehouse-search.sh" "bargain-chemist-search.sh" "the-warehouse-search.sh")

# Run each search in parallel
for i in "${!stores_names[@]}"; do
  store="${stores_names[$i]}"
  script="${stores_scripts[$i]}"
  if [ -f "$SCRIPT_DIR/$script" ]; then
    echo "  Starting $store search..."
    "$SCRIPT_DIR/$script" "$PRODUCT" "$MAX_RESULTS" >> "$TEMP_FILE" 2>&1 &
  fi
done

# Wait for all background jobs
wait

echo ""
echo "━━━ PRICE COMPARISON ━━━"
echo ""

# Parse and display results — pass limits file, query, and results file as args
python3 - "$LIMITS_FILE" "$PRODUCT" "$TEMP_FILE" << 'PYTHON'
import sys, re, json

limits_file = sys.argv[1]
query = sys.argv[2].lower()
with open(sys.argv[3]) as _f:
    content = _f.read()

# Load personal price limits matching this query
active_limit = None
try:
    with open(limits_file) as f:
        data = json.load(f)
    for rule in data.get("limits", []):
        if any(kw.lower() in query for kw in rule["keywords"]):
            active_limit = rule
            break
except Exception:
    pass

# Parse results by store
current_store = None
all_items = []

for line in content.split("\n"):
    if "Store:" in line:
        current_store = line.split("Store:")[1].strip()
    elif line.startswith("  $") and current_store:
        match = re.match(r"\s*\$([0-9.]+)(.*)", line)
        if not match:
            continue
        price = float(match.group(1))
        rest = match.group(2).strip()

        per_unit = None
        m = re.search(r"=\s*\$([0-9.]+)/ea", rest)
        if m:
            per_unit = float(m.group(1))

        tag = ""
        if "[CLUB]" in rest:
            tag = "[CLUB]"

        parts = rest.split("|")
        name = parts[0].strip()
        name = re.sub(r"\[CLUB\]|\[SALE\]", "", name).strip()
        name = re.sub(r"\(was \$[0-9.]+\)", "", name).strip()
        if not name and len(parts) > 1:
            name = parts[1].strip()

        all_items.append({
            "store": current_store,
            "price": price,
            "per_unit": per_unit,
            "tag": tag,
            "name": name,
        })

if not all_items:
    print("No products found")
    sys.exit(0)

def sort_key(x):
    return x["per_unit"] if x["per_unit"] is not None else x["price"]

all_items = sorted(all_items, key=sort_key)

unit_label = active_limit["unit"] if active_limit else "ea"

# Show limit banner if active
if active_limit:
    lim = active_limit["max_per_unit"]
    within = [i for i in all_items if i["per_unit"] is not None and i["per_unit"] <= lim]
    print(f"  Budget: max ${lim:.2f}/{unit_label}  —  {len(within)} option(s) within budget\n")

print("{:<20} {:<10} {:<12} {:<5} {:<34}".format("STORE", "PRICE", "PER UNIT", "", "PRODUCT"))
print("─" * 82)

for item in all_items[:15]:
    store = item["store"][:19]
    price = "${:.2f}".format(item["price"])
    per_unit = "${:.2f}/{}".format(item["per_unit"], unit_label) if item["per_unit"] is not None else "—"
    name = item["name"][:33]

    budget = ""
    if active_limit and item["per_unit"] is not None:
        budget = "✓" if item["per_unit"] <= active_limit["max_per_unit"] else ""

    print("{:<20} {:<10} {:<12} {:<5} {:<34}".format(store, price, per_unit, budget, name))

print("")
best = all_items[0]
if best["per_unit"] is not None:
    print("✓ Best value: ${:.2f}/{} ({}) at {}".format(best["per_unit"], unit_label, "${:.2f}".format(best["price"]), best["store"]))
else:
    print("✓ Lowest price: ${:.2f} at {}".format(best["price"], best["store"]))
print("✓ Total results: {}".format(len(all_items)))
PYTHON
