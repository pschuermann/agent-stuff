#!/usr/bin/env python3
"""Generate HTML swatch page from search results and open in browser."""
import json
import sys
import os
import subprocess
import tempfile


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wada Color Combinations</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    background: #f5f5f0;
    color: #333;
    padding: 2rem;
    max-width: 900px;
    margin: 0 auto;
  }
  body.paper-mode { background: #f0ebe0; }
  h1 {
    font-size: 1.4rem;
    font-weight: 300;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }
  .subtitle {
    font-size: 0.85rem;
    color: #888;
    margin-bottom: 0.3rem;
  }
  .input-color {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 0.85rem;
    color: #666;
  }
  .input-swatch {
    width: 24px;
    height: 24px;
    border-radius: 3px;
    border: 1px solid rgba(0,0,0,0.1);
    display: inline-block;
  }
  .matches {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 2rem;
  }
  .match-chip {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: white;
    border-radius: 20px;
    padding: 0.3rem 0.7rem;
    font-size: 0.75rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .match-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid rgba(0,0,0,0.1);
    flex-shrink: 0;
  }
  .match-dist { color: #aaa; }
  .controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    align-items: center;
  }
  .toggle {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
    border: 1px solid #ccc;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .toggle:hover { border-color: #999; }
  .toggle.active { background: #333; color: white; border-color: #333; }
  .combo {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  body.paper-mode .combo { background: #faf6ed; }
  .combo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .combo-id {
    font-size: 0.8rem;
    color: #999;
    letter-spacing: 0.05em;
  }
  .combo-page {
    font-size: 0.75rem;
    color: #b0a080;
    background: #f9f6ef;
    padding: 0.2rem 0.6rem;
    border-radius: 3px;
  }
  body.paper-mode .combo-page { background: #ede8db; }
  .swatches {
    display: flex;
    gap: 0;
    border-radius: 6px;
    overflow: hidden;
    height: 100px;
    margin-bottom: 1rem;
  }
  .swatch {
    flex: 1;
    position: relative;
    transition: flex 0.3s ease;
    cursor: pointer;
  }
  .swatch:hover { flex: 1.5; }
  .swatch-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 0.4rem 0.5rem;
    font-size: 0.65rem;
    background: rgba(0,0,0,0.4);
    color: white;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .swatch:hover .swatch-info { opacity: 1; }
  .color-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .color-tag {
    font-size: 0.7rem;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1px solid rgba(0,0,0,0.1);
  }
  .color-name { color: #666; }
  .color-hex { color: #aaa; font-family: monospace; font-size: 0.65rem; cursor: pointer; border-radius: 3px; padding: 0.1rem 0.3rem; transition: background 0.2s; }
  .color-hex:hover { background: rgba(0,0,0,0.08); }
  .copy-all-btn {
    font-size: 0.7rem;
    padding: 0.3rem 0.6rem;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    color: #888;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .copy-all-btn:hover { border-color: #999; color: #555; }
  body.paper-mode .copy-all-btn { background: #faf6ed; }
  .copied-toast {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: #333;
    color: #fff;
    padding: 0.5rem 1.2rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-family: monospace;
    opacity: 0;
    transition: opacity 0.2s, transform 0.2s;
    pointer-events: none;
    z-index: 100;
  }
  .copied-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  .filter-bar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    align-items: center;
  }
  .filter-label { font-size: 0.75rem; color: #888; margin-right: 0.3rem; }
</style>
</head>
<body>
<h1>A Dictionary of Color Combinations</h1>
<div class="subtitle">Sanzo Wada &mdash; matching combinations</div>

<div class="input-color" id="input-info"></div>
<div class="matches" id="matches"></div>

<div class="controls">
  <div class="filter-bar" id="filters">
    <span class="filter-label">Show:</span>
  </div>
  <button class="toggle" id="paper-toggle" onclick="togglePaper()">Paper feel</button>
</div>

<div id="combos"></div>
<div class="copied-toast" id="toast"></div>

<script>
const DATA = __DATA__;
let toastTimer;

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1200);
}

function copyHex(hex, evt) {
  if (evt) evt.stopPropagation();
  navigator.clipboard.writeText(hex).then(() => showToast('Copied ' + hex));
}

function copyAllHex(comboId, evt) {
  if (evt) evt.stopPropagation();
  const combo = DATA.combinations.find(c => c.id === comboId);
  if (!combo) return;
  const hexes = combo.colors.map(c => c.hex).join(', ');
  navigator.clipboard.writeText(hexes).then(() => showToast('Copied ' + hexes));
}

function init() {
  // Input color
  const info = document.getElementById('input-info');
  if (DATA.input) {
    info.innerHTML = `Searching near <span class="input-swatch" style="background:${DATA.input}"></span> <strong>${DATA.input}</strong>`;
  }

  // Matched Wada colors
  const matchesEl = document.getElementById('matches');
  (DATA.matches || []).forEach(m => {
    matchesEl.innerHTML += `<div class="match-chip">
      <span class="match-dot" style="background:${m.hex}"></span>
      ${m.name} <span class="match-dist">\u0394E ${m.distance}</span>
    </div>`;
  });

  // Filter buttons
  const sizes = [...new Set(DATA.combinations.map(c => c.colors.length))].sort();
  const filters = document.getElementById('filters');
  filters.innerHTML += `<button class="toggle active" data-size="all" onclick="filter('all',this)">All</button>`;
  sizes.forEach(s => {
    filters.innerHTML += `<button class="toggle" data-size="${s}" onclick="filter(${s},this)">${s}-color</button>`;
  });

  renderCombos(DATA.combinations);
}

function filter(size, btn) {
  document.querySelectorAll('.filter-bar .toggle').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = size === 'all' ? DATA.combinations : DATA.combinations.filter(c => c.colors.length === size);
  renderCombos(filtered);
}

function togglePaper() {
  document.body.classList.toggle('paper-mode');
  document.getElementById('paper-toggle').classList.toggle('active');
}

function renderCombos(combos) {
  const el = document.getElementById('combos');
  el.innerHTML = combos.map(combo => `
    <div class="combo">
      <div class="combo-header">
        <span class="combo-id">Combination #${combo.id}</span>
        <span class="combo-page">p. ${combo.page}</span>
      </div>
      <div class="swatches">
        ${combo.colors.map(c => `
          <div class="swatch" style="background-color:${c.hex}" onclick="copyHex('${c.hex}', event)">
            <div class="swatch-info">${c.name}<br>${c.hex} · click to copy</div>
          </div>
        `).join('')}
      </div>
      <div class="color-list">
        ${combo.colors.map(c => `
          <span class="color-tag">
            <span class="color-dot" style="background:${c.hex}"></span>
            <span class="color-name">${c.name}</span>
            <span class="color-hex" onclick="copyHex('${c.hex}', event)" title="Click to copy">${c.hex}</span>
          </span>
        `).join('')}
        <button class="copy-all-btn" onclick="copyAllHex(${combo.id}, event)">Copy all</button>
      </div>
    </div>
  `).join('');
}

init();
</script>
</body>
</html>"""


def generate(search_json, output_path=None, open_browser=True):
    if isinstance(search_json, str):
        data = json.loads(search_json)
    else:
        data = search_json

    html = HTML_TEMPLATE.replace('__DATA__', json.dumps(data))

    if output_path:
        with open(output_path, 'w') as f:
            f.write(html)
        path = os.path.abspath(output_path)
    else:
        fd, path = tempfile.mkstemp(suffix='.html', prefix='wada-')
        with os.fdopen(fd, 'w') as f:
            f.write(html)

    if open_browser:
        subprocess.run(['open', path])

    return path


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    no_open = '--no-open' in sys.argv

    if not args or args[0] == '-':
        data = sys.stdin.read()
    else:
        with open(args[0]) as f:
            data = f.read()

    output = args[1] if len(args) > 1 else None
    path = generate(data, output, open_browser=not no_open)
    print(path)
