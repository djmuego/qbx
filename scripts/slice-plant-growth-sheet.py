#!/usr/bin/env python3
"""Slice plant-growth-sheet-9.png into 9 stage sprites with alpha."""
from __future__ import annotations

import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public/assets/spatial/pack/plant-growth-sheet-9.png")
OUT_DIR = os.path.join(ROOT, "public/assets/spatial/plants/growth")

# 3x3 grid — row-major, stage 01 top-left → 09 bottom-right
COLS, ROWS = 3, 3


def remove_black_bg(im: Image.Image, threshold: int = 28) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r < threshold and g < threshold and b < threshold:
                px[x, y] = (0, 0, 0, 0)
    return im


def trim_alpha(im: Image.Image, pad: int = 4) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(im.width, right + pad)
    bottom = min(im.height, bottom + pad)
    return im.crop((left, top, right, bottom))


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    sheet = Image.open(SRC)
    sw, sh = sheet.size
    cw, ch = sw // COLS, sh // ROWS
    idx = 1
    for row in range(ROWS):
        for col in range(COLS):
            box = (col * cw, row * ch, (col + 1) * cw, (row + 1) * ch)
            cell = sheet.crop(box)
            cell = remove_black_bg(cell)
            cell = trim_alpha(cell)
            out = os.path.join(OUT_DIR, f"plant-stage-{idx:02d}.webp")
            cell.save(out, "WEBP", quality=88, method=6)
            print(f"Wrote {out} ({cell.size[0]}x{cell.size[1]})")
            idx += 1


if __name__ == "__main__":
    main()
