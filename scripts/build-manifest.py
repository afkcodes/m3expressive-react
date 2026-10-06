"""Build figma/<component>/manifest.json from compact variant rows (pulled read-only from Figma).

Each row: "<key> <nodeId> <x>,<y> <w>x<h>[ rb<x>,<y>,<w>,<h>]" (positions relative to the frame).
Export hygiene, applied automatically (CLAUDE.md §8):
  * 1px capture margin around every node where room allows (AA classification needs neighbours);
  * crops never intersect a neighbour's render area (tight rows: neighbours' shadows);
  * a node touching the component set's edge loses that 1px column (Figma bakes the dashed set
    border into every export).

usage: python3 -I scripts/build-manifest.py spec.json
spec.json: {"component", "fileKey", "background", "frames": {name: {"node", "file", "size": [w,h],
            "origin": [x,y]?, "background"?: per-frame override, "rows": "row;row;..."}}}
Names: rows' <key> is mapped by the optional "rename" dict, else used verbatim.
Optional "exceptions": {name: {"allowedDiffPixels": n, "allowedDiffReason": "..."}} — measured,
documented residuals (CLAUDE.md §9); merged into the variant so regeneration never drops them.
Keep each component's spec at figma/<component>/spec.json so manifests are reproducible.
"""
import json, math, re, sys

spec = json.load(open(sys.argv[1]))
comp = spec['component']
rename = spec.get('rename', {})
variants, rects = {}, {}

def tidy(o):
    if isinstance(o, float) and o.is_integer(): return int(o)
    if isinstance(o, float): return round(o, 3)
    if isinstance(o, list): return [tidy(v) for v in o]
    if isinstance(o, dict): return {k: tidy(v) for k, v in o.items()}
    return o

for fname, f in spec['frames'].items():
    W, H = f['size']
    ox, oy = f.get('origin', [0, 0])
    entries = []
    for row in f['rows'].split(';'):
        m = re.match(r'(\S+) (\S+) (-?[\d.]+),(-?[\d.]+) ([\d.]+)x([\d.]+)(?: rb(-?[\d.]+),(-?[\d.]+),([\d.]+),([\d.]+))?$', row.strip())
        if not m: raise SystemExit(f'bad row: {row}')
        key, node = m[1], m[2]
        x, y, w, h = map(float, m.groups()[2:6])
        rb = [float(v) for v in m.groups()[6:10]] if m[7] else None
        entries.append((rename.get(key, key), node, x, y, w, h, rb))
    # neighbour render areas (absolute in frame coords)
    areas = []
    for name, node, x, y, w, h, rb in entries:
        r = rb or [0, 0, w, h]
        areas.append((name, x + r[0], y + r[1], x + r[0] + r[2], y + r[1] + r[3]))
    for name, node, x, y, w, h, rb in entries:
        r = rb or [0, 0, w, h]
        x0, y0, x1, y1 = x + r[0] - 1, y + r[1] - 1, x + r[0] + r[2] + 1, y + r[1] + r[3] + 1
        notes = []
        # frame image bounds (origin may be negative when shadows overflow)
        x0, y0 = max(x0, ox), max(y0, oy)
        x1, y1 = min(x1, ox + W), min(y1, oy + H)
        # set border: dashed stroke 1px inside the set edge
        if x <= 0.5: x0 = max(x0, 1); notes.append('left column under set border excluded')
        if y <= 0.5: y0 = max(y0, 1); notes.append('top row under set border excluded')
        if x + w >= W - 0.5: x1 = min(x1, W - 1); notes.append('right column under set border excluded')
        if y + h >= H - 0.5: y1 = min(y1, H - 1); notes.append('bottom row under set border excluded')
        # neighbours: trim the side that intersects (prefer vertical trims for row layouts)
        for other, a0, b0, a1, b1 in areas:
            if other == name: continue
            if a0 < x1 and x0 < a1 and b0 < y1 and y0 < b1:
                if b1 <= y + h / 2: y0 = max(y0, b1); notes.append(f'top trimmed (neighbour {other})')
                elif b0 >= y + h / 2: y1 = min(y1, b0); notes.append(f'bottom trimmed (neighbour {other})')
                elif a1 <= x + w / 2: x0 = max(x0, a1); notes.append(f'left trimmed (neighbour {other})')
                else: x1 = min(x1, a0); notes.append(f'right trimmed (neighbour {other})')
        # snap to the 0.5px (2x) grid, inward
        x0, y0 = math.ceil(x0 * 2) / 2, math.ceil(y0 * 2) / 2
        x1, y1 = math.floor(x1 * 2) / 2, math.floor(y1 * 2) / 2
        v = {'node': node, 'size': [w, h], 'background': f.get('background', spec['background']), 'crop': {'frame': fname, 'x': x, 'y': y},
             'renderBounds': [x0 - x, y0 - y, x1 - x0, y1 - y0]}
        if notes: v['refNote'] = '; '.join(sorted(set(notes)))
        v.update(spec.get('exceptions', {}).get(name, {}))
        variants[name] = v
unknown = set(spec.get('exceptions', {})) - set(variants)
if unknown: raise SystemExit(f'exceptions for unknown variants: {sorted(unknown)}')
m = {'component': comp, 'fileKey': spec['fileKey'], 'scale': 2,
     'frames': {k: {kk: vv for kk, vv in {'node': f['node'], 'file': f['file'], 'origin': f.get('origin')}.items() if vv is not None} for k, f in spec['frames'].items()},
     'variants': tidy(variants)}
json.dump(m, open(f'figma/{comp}/manifest.json', 'w'), indent=2); open(f'figma/{comp}/manifest.json', 'a').write('\n')
print(comp, len(variants), 'variants;', sum(1 for v in variants.values() if 'refNote' in v), 'with trims')
