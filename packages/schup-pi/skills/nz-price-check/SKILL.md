---
name: nz-price-check
description: >
  Search and compare product prices across New Zealand supermarkets and pharmacies.
  Supports Woolworths NZ, New World, Chemist Warehouse, Bargain Chemist, and The Warehouse.
  Use when the user asks about supermarket/pharmacy prices, wants to compare product costs,
  check if something is on sale, find the cheapest option for a product, or asks things like
  "how much is X", "is X on special", "compare prices for X", "cheapest berocca", "price check".
  Calculates per-unit prices (per tablet, per 100g, per item) to enable fair comparison across
  different pack sizes. Shows club/member prices (Onecard, Clubcard) as the default best price.
---

# NZ Price Check — Supermarkets & Pharmacies

Compare product prices across 5 major NZ retailers using optimized API and browser-based methods.

**Retailers Covered**: Woolworths NZ, New World, Chemist Warehouse, Bargain Chemist, The Warehouse

## Quick Start

### All Stores (Aggregated)

```bash
{baseDir}/scripts/price-check-all.sh "berocca" 5
```

Searches all major NZ retailers and displays a sorted price comparison table.

### Woolworths NZ (REST API — fastest)

```bash
{baseDir}/scripts/woolworths-search.sh "snickers" 5
```

Returns structured results with prices, club/sale tags, and per-unit costs. No browser needed.

### Chemist Warehouse NZ (Browser-rendered)

```bash
{baseDir}/scripts/chemist-warehouse-search.sh "berocca" 10
```

### Bargain Chemist NZ (Browser-rendered)

```bash
{baseDir}/scripts/bargain-chemist-search.sh "berocca" 10
```

### The Warehouse NZ (Browser-rendered, filters out marketplace)

```bash
{baseDir}/scripts/the-warehouse-search.sh "berocca" 10
```

### New World (playwright-cli — requires persistent session setup)

```bash
{baseDir}/scripts/newworld-search.sh "snickers"
```

Requires a running playwright-cli session with the store already set. See Setup below.

## Setup

### Woolworths

Works out of the box. Location defaults to server-assigned area.

To set a specific location, open the Woolworths site in a browser session, navigate to
`/bookatimeslot`, click "Change address", type the suburb/town, and select it.
Then use the session cookies for API calls.

For most use cases, the API without location cookies returns nationally consistent pricing.
Club/sale offers may vary by region.

### New World (one-time store setup)

New World is behind Cloudflare and blocks headless browsers. Use playwright-cli in headed mode
with a persistent profile:

```bash
# First time: open browser, select store
playwright-cli -s=nw open https://www.newworld.co.nz --headed --persistent --browser=chrome
# Manually click the store selector and choose your store (e.g. "New World Three Parks")
# The store is saved in cookies in the persistent profile
playwright-cli -s=nw close
```

After setup, `newworld-search.sh` reuses the persistent `nw` session automatically.

**Key cookies set by store selection:**
- `eCom_STORE_ID`: Store UUID
- `STORE_ID_V2`: Store UUID + flag
- `Region`: `NI` (North Island) or `SI` (South Island)

## Comparing Products

When comparing across stores or pack sizes, always calculate and show per-unit price:

- **Tablets/capsules**: `$total / pack_count` → show as `$/tablet`
- **Chocolate/food by weight**: Use the `cupPrice` / `cupMeasure` from the data (usually $/100g)
- **Multi-packs**: `$total / item_count` → show as `$/ea`

Sort results by per-unit price so the best value is immediately visible.

### Price Tags

- **[CLUB]**: Onecard (Woolworths) or Clubcard (New World) member price. Both cards are free. Always use this as the effective price.
- **[SALE]**: Temporary special/promotion
- No tag: Regular shelf price

## API & Technical Architecture

### API Status

| Retailer | API Type | Auth | Speed | Method |
|----------|----------|------|-------|--------|
| **Woolworths** | REST (public) | ✅ None | ~200ms | `curl` + Python |
| **Chemist Warehouse** | CDN JSON (semi-private) | ⚠️ None | ~500ms | `curl` (if category known) |
| **The Warehouse** | SFCC REST (auth) | ❌ client_id | ~100ms | Requires reverse-engineering |
| **New World** | Edge API (Cloudflare) | ❌ JWT | ~5s | `playwright-cli --headed` |
| **Bargain Chemist** | None (client-side) | — | ~5s | `playwright-cli` (scraping) |

### Discovery Method

1. **Browser Navigation** — Load page in controlled Chrome session
2. **Script Inspection** — Extract API references from HTML/JS
3. **Endpoint Testing** — Try common patterns (`/api`, `/graphql`, `/dw/shop`)
4. **Platform Detection** — Identify tech stack (SFCC, Kentico, Vue.js)

### Key Findings

- ✅ **Woolworths**: Public REST API (`/api/v1/products`) — fully working
- ⚠️ **Chemist Warehouse**: CDN JSON at `fd.chemistwarehouse.co.nz/primarycontainer/` — semi-public, need category enumeration
- ⚠️ **The Warehouse**: SFCC Demandware API exists (`/dw/shop/vXX_X/`) — blocked by missing `client_id` parameter
- ❌ **Bargain Chemist**: No public API; Vue.js client-side rendering only
- ❌ **New World**: Cloudflare-protected; JWT required

## Output Format

Present results as a sorted comparison table:

```
━━━ PRODUCT NAME ━━━

  STORE            PRICE    TAG      SIZE       PER UNIT
  Woolworths       $1.50    ⭐Club   44g        $3.41/100g
  New World        $2.49             44g        $5.66/100g
```

When the user asks about a single product, show all variants across both stores sorted by per-unit price.
When comparing specific items, show matched products side by side.

## Technical Details

### API Availability & Strategy

| Store | API Status | Method | Notes |
|-------|-----------|--------|-------|
| **Woolworths** | ✅ Public REST API | `curl` + headers | `x-requested-with: OnlineShopping.WebApp`. No auth required. Fast & reliable. |
| **New World** | ⛔ Cloudflare-protected | `playwright-cli --headed` | JWT-protected edge API exists but not publicly accessible. Requires browser. |
| **Chemist Warehouse** | 🔍 Partially exposed CDN | `playwright-cli` | Server-renders product pages. CDN-based JSON assets (`fd.chemistwarehouse.co.nz`) exist but are not directly querable. Fallback: page scraping. |
| **Bargain Chemist** | 🔍 Client-side rendering | `playwright-cli` | Uses JavaScript to load products. No public API found. |
| **The Warehouse** | 🔍 Dynamic Yield + JS | `playwright-cli` | Uses personalization service (Dynamic Yield). Page scraping with marketplace filtering. |

### Speed Optimization

- **Woolworths**: ~200ms (API, fastest)
- **Chemist Warehouse**: ~3–5s (browser rendering)
- **Bargain Chemist**: ~4–6s (browser rendering, slow JS)
- **The Warehouse**: ~3–4s (browser rendering)
- **New World**: ~5–7s (browser + Cloudflare check)

For fastest results on a single product, use `woolworths-search.sh` first, then run the others in parallel via `price-check-all.sh`.

## Limitations

- **New World** requires a visible browser (macOS/Linux with display). Cannot run on a headless VPS.
- **Woolworths** API works anywhere (curl-based) — most reliable.
- **Chemist Warehouse, Bargain Chemist, The Warehouse**: Require browser automation. Subject to dynamic rendering delays.
- Prices vary by store/region. Always note which store location is being shown.
- Club deals change weekly. Results are point-in-time snapshots.
- Marketplace items at The Warehouse are automatically filtered out.

