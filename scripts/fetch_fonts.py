#!/usr/bin/env python3
"""Fetch self-hosted fonts from Google Fonts CSS2 (variable + italics aware).
Run from site root: python scripts/fetch_fonts.py
Requires: fonts/gfonts-raw.css already downloaded via curl with browser UA.
"""
import os, re, urllib.request, hashlib

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(BASE, 'fonts', 'gfonts-raw.css')
OUT = os.path.join(BASE, 'fonts', 'fonts.css')
FONTS = os.path.join(BASE, 'fonts')

css = open(RAW, encoding='utf-8').read()
# keep only latin unicode-range blocks
blocks = re.findall(r'/\* ([a-z-]+) \*/\s*@font-face\s*\{([^}]+)\}', css)
latin = [b for b in blocks if b[0] == 'latin']
print(f"blocchi latin: {len(latin)} / {len(blocks)}")

url2name = {}
out_blocks = []
for subset, body in latin:
    fam = re.search(r"font-family:\s*'([^']+)'", body).group(1)
    style = re.search(r"font-style:\s*(\w+)", body).group(1)
    weight = re.search(r"font-weight:\s*([\d\s]+)", body).group(1).strip()
    url = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
    if url not in url2name:
        slug = fam.lower().replace(' ', '-')
        wslug = weight.replace(' ', '-') if ' ' in weight else weight
        name = f"{slug}-{style}-{wslug}.woff2" if style != 'normal' else f"{slug}-{wslug}.woff2"
        name = name.replace(' ', '')
        url2name[url] = name
    name = url2name[url]
    # rewrite body: local name + unicode-range
    new_body = re.sub(r"font-family:\s*'([^']+)'", f"font-family: '{fam}'", body)
    new_body = re.sub(r"font-style:\s*(\w+)", f"font-style: {style}", new_body)
    new_body = re.sub(r"font-weight:\s*([\d\s]+)", f"font-weight: {weight}", new_body)
    new_body = re.sub(r"url\(https://[^)]+\.woff2\)", f"url('{name}')", new_body)
    out_blocks.append((fam, style, weight, url, name, new_body))

# download unique files
seen = set()
for fam, style, weight, url, name, _ in out_blocks:
    if url in seen:
        continue
    seen.add(url)
    dst = os.path.join(FONTS, name)
    if os.path.exists(dst) and os.path.getsize(dst) > 1000:
        print("skip (esiste)", name)
        continue
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'})
    with urllib.request.urlopen(req, timeout=60) as r, open(dst, 'wb') as f:
        f.write(r.read())
    print("downloaded", name, os.path.getsize(dst)//1024, "KB")

# write fonts.css
with open(OUT, 'w', encoding='utf-8') as f:
    f.write("/* Font self-hosted — generato da fetch_fonts.py */\n")
    for fam, style, weight, url, name, body in out_blocks:
        f.write(f"@font-face {{\n{body}\n}}\n\n")

# verify wOF2 magic
bad = []
for _, _, _, _, name, _ in out_blocks:
    p = os.path.join(FONTS, name)
    with open(p, 'rb') as fh:
        if fh.read(4) != b'wOF2':
            bad.append(name)
print("files:", len(seen), "| wOF2 bad:", bad or "nessuno")
print("italic blocks:", sum(1 for b in out_blocks if b[1] == 'italic'))
