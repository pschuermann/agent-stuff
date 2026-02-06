#!/usr/bin/env python3
"""Search Wada color combinations by hex color using CIELAB Delta E distance."""
import json
import math
import sys
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')


def hex_to_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i+2], 16) for i in (0, 2, 4)]


def rgb_to_lab(rgb):
    """Convert sRGB to CIELAB (D50 illuminant to match source data)."""
    # sRGB -> linear RGB
    def linearize(v):
        v = v / 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = [linearize(c) for c in rgb]

    # Linear RGB -> XYZ (D50 adapted matrix)
    x = r * 0.4360747 + g * 0.3850649 + b * 0.1430804
    y = r * 0.2225045 + g * 0.7168786 + b * 0.0606169
    z = r * 0.0139322 + g * 0.0971045 + b * 0.7141733

    # D50 reference white
    xn, yn, zn = 0.96422, 1.0, 0.82521

    def f(t):
        return t ** (1/3) if t > 0.008856 else 7.787 * t + 16/116

    fx, fy, fz = f(x/xn), f(y/yn), f(z/zn)
    L = 116 * fy - 16
    a = 500 * (fx - fy)
    b_val = 200 * (fy - fz)
    return [L, a, b_val]


def delta_e(lab1, lab2):
    """CIE76 Delta E."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(lab1, lab2)))


def search(hex_color, max_results=10, max_distance=30):
    with open(os.path.join(DATA_DIR, 'colors.json')) as f:
        colors = json.load(f)
    with open(os.path.join(DATA_DIR, 'combos.json')) as f:
        combos = json.load(f)

    input_rgb = hex_to_rgb(hex_color)
    input_lab = rgb_to_lab(input_rgb)

    # Find closest Wada colors
    matches = []
    for c in colors:
        dist = delta_e(input_lab, c['lab'])
        if dist <= max_distance:
            matches.append({'color': c, 'distance': dist})
    matches.sort(key=lambda m: m['distance'])

    if not matches:
        return {'input': hex_color, 'input_lab': input_lab, 'matches': [], 'combinations': []}

    # Collect all combo IDs from matched colors
    combo_ids = set()
    matched_names = []
    for m in matches[:5]:  # top 5 closest colors
        matched_names.append({
            'name': m['color']['name'],
            'hex': m['color']['hex'],
            'distance': round(m['distance'], 1)
        })
        for cid in m['color']['combinations']:
            combo_ids.add(cid)

    # Build combo results
    combo_results = []
    combo_by_id = {c['id']: c for c in combos}
    for cid in sorted(combo_ids):
        combo = combo_by_id[cid]
        combo_results.append({
            'id': cid,
            'page': cid,
            'colors': combo['colors']
        })
        if len(combo_results) >= max_results:
            break

    return {
        'input': hex_color,
        'input_lab': input_lab,
        'matches': matched_names,
        'combinations': combo_results,
        'total_combinations': len(combo_ids)
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: search.py <hex-color> [max-results] [max-distance]", file=sys.stderr)
        print("  hex-color: e.g. #4A6B3F or 4A6B3F", file=sys.stderr)
        print("  max-results: max combos to return (default 10)", file=sys.stderr)
        print("  max-distance: max Delta E distance (default 30)", file=sys.stderr)
        sys.exit(1)

    hex_color = sys.argv[1]
    max_results = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    max_distance = float(sys.argv[3]) if len(sys.argv) > 3 else 30

    result = search(hex_color, max_results, max_distance)
    print(json.dumps(result, indent=2))
