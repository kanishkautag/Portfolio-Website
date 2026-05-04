"""
Build oneko-runner.gif from github-profile-assets/oneko.gif (32x32 sheet, 8x4 cells).

Run from repo root:  python scripts/build_oneko_banner.py
Requires: pip install pillow
"""
from __future__ import annotations

import random
import sys
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / "github-profile-assets" / "oneko.gif"
OUT = ROOT / "github-profile-assets" / "oneko-runner.gif"

CELL = 32
COLS, ROWS = 8, 4
# Row 2–3 tend to be locomotion in classic sheets; row 0–1 idle / sleep / scratch.
RUN_RIGHT = [16, 17, 18, 19, 20, 21, 22, 23]
IDLE_SPECIAL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]


def load_first_frame(path: Path) -> Image.Image:
    im = Image.open(path)
    im.seek(0)
    return im.convert("RGBA")


def slice_cells(sheet: Image.Image) -> list[Image.Image]:
    w, h = sheet.size
    assert w == COLS * CELL and h == ROWS * CELL, f"Expected {COLS*CELL}x{ROWS*CELL}, got {w}x{h}"
    cells: list[Image.Image] = []
    for r in range(ROWS):
        for c in range(COLS):
            box = (c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)
            cells.append(sheet.crop(box))
    return cells


def build_banner(cells: list[Image.Image]) -> list[Image.Image]:
    canvas_w, canvas_h = 720, 96
    pad_y = (canvas_h - CELL) // 2
    n_out = 140
    frames: list[Image.Image] = []

    x = -CELL
    run_i = 0
    special_left = 0
    next_special_at = random.randint(18, 34)

    for _ in range(n_out):
        if special_left > 0:
            cell_idx = random.choice(IDLE_SPECIAL)
            special_left -= 1
        else:
            if next_special_at <= 0:
                special_left = random.randint(4, 9)
                next_special_at = random.randint(22, 45)
                cell_idx = random.choice(IDLE_SPECIAL)
            else:
                cell_idx = RUN_RIGHT[run_i % len(RUN_RIGHT)]
                run_i += 1
                next_special_at -= 1

        cat = cells[cell_idx]
        fr = Image.new("RGBA", (canvas_w, canvas_h), (10, 10, 10, 255))
        fr.paste(cat, (int(x), pad_y), cat)
        frames.append(fr)
        x += 5.2
        if x > canvas_w:
            x = -CELL

    # One shared palette = less flicker than per-frame ADAPTIVE.
    rgb = [f.convert("RGB") for f in frames]
    pal = rgb[0].quantize(colors=48, method=Image.FASTOCTREE)
    return [im.quantize(palette=pal) for im in rgb]


def main() -> int:
    if not SHEET.exists():
        print("Missing", SHEET, file=sys.stderr)
        return 1
    random.seed(42)
    sheet = load_first_frame(SHEET)
    cells = slice_cells(sheet)
    frames = build_banner(cells)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        OUT,
        save_all=True,
        append_images=frames[1:],
        duration=45,
        loop=0,
        optimize=True,
    )
    print("Wrote", OUT, "frames=", len(frames))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
