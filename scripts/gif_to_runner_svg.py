"""
Turn github-profile-assets/oneko-runner.gif into github-profile-assets/oneko-runner.svg
using a horizontal PNG filmstrip + SMIL discrete translate (no JavaScript).

GitHub profile README often shows GIFs as static; SVG + SMIL tends to animate more reliably.

Run:  python scripts/gif_to_runner_svg.py
Requires: pip install pillow
"""
from __future__ import annotations

import base64
import io
import math
import sys
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
GIF_PATH = ROOT / "github-profile-assets" / "oneko-runner.gif"
OUT_SVG = ROOT / "github-profile-assets" / "oneko-runner.svg"

# Keep SVG under ~1MB raw for GitHub; tune if needed.
MAX_FRAMES = 28
FRAME_MAX_W = 400
MAX_B64 = 900_000


def iter_frames(path: Path) -> list[Image.Image]:
    im = Image.open(path)
    frames: list[Image.Image] = []
    for i in range(getattr(im, "n_frames", 1)):
        im.seek(i)
        frames.append(im.convert("RGBA"))
    return frames


def subsample(frames: list[Image.Image], max_n: int) -> list[Image.Image]:
    if len(frames) <= max_n:
        return frames
    step = len(frames) / max_n
    out: list[Image.Image] = []
    for j in range(max_n):
        idx = min(int(j * step), len(frames) - 1)
        out.append(frames[idx])
    return out


def resize_frame(im: Image.Image, max_w: int) -> Image.Image:
    w, h = im.size
    if w <= max_w:
        return im
    nh = int(round(h * (max_w / w)))
    return im.resize((max_w, nh), Image.Resampling.LANCZOS)


def build_strip(frames: list[Image.Image]) -> tuple[Image.Image, int, int]:
    """Return strip image, single frame width, height."""
    if not frames:
        raise ValueError("no frames")
    rs = [resize_frame(f, FRAME_MAX_W) for f in frames]
    fw, fh = rs[0].size
    for f in rs[1:]:
        if f.size != (fw, fh):
            f = f.resize((fw, fh), Image.Resampling.LANCZOS)
    strip = Image.new("RGBA", (fw * len(rs), fh), (10, 10, 10, 255))
    for i, f in enumerate(rs):
        strip.paste(f, (i * fw, 0), f)
    return strip, fw, fh


def strip_to_png_bytes(strip: Image.Image) -> bytes:
    buf = io.BytesIO()
    strip.save(buf, format="PNG", optimize=True, compress_level=9)
    return buf.getvalue()


def build_svg(b64: str, fw: int, fh: int, n_frames: int, frame_ms: int) -> str:
    strip_w = fw * n_frames
    dur_s = max(0.6, (n_frames * frame_ms) / 1000.0)
    # discrete steps: show frame k at translate(-k*fw, 0)
    vals = ";".join(f"{-i * fw},0" for i in range(n_frames))
    if n_frames == 1:
        key_times = "0;1"
        vals = "0,0;0,0"
    else:
        key_times = ";".join(f"{i / (n_frames - 1):.5f}" for i in range(n_frames))

    # XML-escape only & in data URL (rare in base64); + is fine in attributes for SVG in HTML5
    safe_b64 = b64.replace("&", "&amp;")

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fw} {fh}" width="{fw}" height="{fh}" role="img" aria-label="Oneko runner animation">
  <title>Oneko runner</title>
  <defs>
    <clipPath id="onekoView">
      <rect width="{fw}" height="{fh}" x="0" y="0"/>
    </clipPath>
  </defs>
  <rect width="{fw}" height="{fh}" fill="#0a0a0a"/>
  <g clip-path="url(#onekoView)">
    <image
      href="data:image/png;base64,{safe_b64}"
      width="{strip_w}"
      height="{fh}"
      x="0"
      y="0"
      preserveAspectRatio="xMinYMid meet">
      <animateTransform
        attributeName="transform"
        attributeType="XML"
        type="translate"
        calcMode="discrete"
        values="{vals}"
        keyTimes="{key_times}"
        dur="{dur_s:.3f}s"
        repeatCount="indefinite"/>
    </image>
  </g>
</svg>
"""


def main() -> int:
    if not GIF_PATH.exists():
        print("Missing", GIF_PATH, file=sys.stderr)
        return 1

    frames = iter_frames(GIF_PATH)
    frames = subsample(frames, MAX_FRAMES)
    strip, fw, fh = build_strip(frames)
    n = len(frames)

    png = strip_to_png_bytes(strip)
    b64 = base64.standard_b64encode(png).decode("ascii")

    while len(b64) > MAX_B64 and n > 8:
        n = max(8, n - 4)
        frames = subsample(iter_frames(GIF_PATH), n)
        strip, fw, fh = build_strip(frames)
        png = strip_to_png_bytes(strip)
        b64 = base64.standard_b64encode(png).decode("ascii")
        print("Reduced to", n, "frames, b64 len", len(b64), file=sys.stderr)

    svg = build_svg(b64, fw, fh, n, frame_ms=50)
    OUT_SVG.write_text(svg, encoding="utf-8")
    print("Wrote", OUT_SVG, "frames=", n, "viewport", fw, "x", fh, "strip", fw * n, "x", fh, "svg_bytes", OUT_SVG.stat().st_size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
