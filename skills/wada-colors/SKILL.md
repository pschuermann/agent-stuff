---
name: wada-colors
description: "Find color combinations from Sanzo Wada's 'A Dictionary of Color Combinations' (348 combinations, 159 colors). Use when the user wants color palette suggestions, asks about color combinations, references the Wada/Sanzo color book, or provides a color (hex, name, or from an image) and wants matching palettes. Also use when user asks for harmonious/curated color combos for design work."
---

# Wada Color Combinations

Find curated color combinations from Sanzo Wada's *A Dictionary of Color Combinations* (1933). 348 combinations of 2-4 colors from 159 named colors. Each result references the book page number.

Color data uses ICC-profiled conversion (U.S. Web Coated SWOP v2 -> sRGB) for accurate screen representation. Colors are approximate - the book page is the ground truth.

## Workflow

### 1. Get a hex color from the user

Accept any of:
- **Hex code**: `#4A6B3F` or `4A6B3F`
- **Color name**: Convert to approximate hex (e.g. "dusty rose" -> `#DCAE96`)
- **Image reference**: If the user provides an image and says "use the green from the tree", read the image, estimate the hex value of the referenced color, then proceed

### 2. Search for matching combinations

```bash
python3 scripts/search.py <hex> [max-results] [max-distance]
```

- `hex`: color to match (e.g. `#4A6B3F`)
- `max-results`: max combos returned (default 10)
- `max-distance`: max Delta E perceptual distance (default 30, increase to 50 for broader matches)

Returns JSON with:
- `matches`: closest Wada colors with Delta E distances
- `combinations`: matching combos with all colors, hex codes, and page numbers
- `total_combinations`: total combos found (may exceed max-results)

### 3. Show visual swatches

Pipe search output to the swatch generator:

```bash
python3 scripts/search.py "#4A6B3F" 15 | python3 scripts/swatch.py -
```

Opens an HTML page in the browser with:
- Color swatch blocks (hover for name/hex, click to copy hex)
- Page references for the physical book (e.g. "p. 156")
- Filter by combo size (2/3/4-color)
- "Paper feel" toggle that simulates warm paper tint
- Input color and closest Wada color matches with Delta E

To save to a file instead of temp:
```bash
python3 scripts/search.py "#4A6B3F" | python3 scripts/swatch.py - output.html
```

Use `--no-open` to skip auto-opening the browser.

### 4. Present results

When showing results to the user, include:
- The closest Wada color name(s) and how close the match is
- A summary of the top combinations with color names
- The book page reference so they can check the physical book
- Open the swatch page so they can visually compare

Example response format:
> Your color is closest to **Cossack Green** (#437742, Delta E 9.1). Found 27 combinations using similar greens. Opening swatch page...
>
> Top matches:
> - **#5** (p. 5): Cossack Green + Vandar Poel's Blue
> - **#158** (p. 158): Cossack Green + Pale Lemon Yellow + Rose Red

## Data

- `data/colors.json` - 159 Wada colors with name, hex, RGB, LAB, swatch chapter, combo IDs
- `data/combos.json` - 348 combinations with color details and page numbers

## Notes

- Delta E < 5 is very close (near-exact match)
- Delta E 5-15 is a good match (same color family)
- Delta E 15-30 is a loose match (related colors)
- Combination numbers map directly to page numbers in the English edition
- Screen colors are sRGB approximations of print inks - the book is the source of truth
