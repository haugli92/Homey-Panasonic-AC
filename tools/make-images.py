#!/usr/bin/env python3
"""Generate the PNG assets Homey requires, plus copy the driver icon.
Draws a simple AC indoor-unit glyph on the brand color. Replace with nicer
artwork any time — Homey only needs valid PNGs at the right dimensions."""
import os
import shutil
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = (0, 86, 160)
BRAND_HI = (0, 103, 192)
WHITE = (255, 255, 255)
SOFT = (207, 227, 245)


def rounded(draw, box, r, fill):
    draw.rounded_rectangle(box, radius=r, fill=fill)


def draw_glyph(size):
    w, h = size
    img = Image.new("RGBA", size, BRAND + (255,))
    d = ImageDraw.Draw(img)
    s = min(w, h)
    # AC unit body, centered
    bw, bh = int(s * 0.62), int(s * 0.24)
    x0, y0 = (w - bw) // 2, int(h * 0.30)
    r = int(bh * 0.35)
    rounded(d, [x0, y0, x0 + bw, y0 + bh], r, WHITE)
    rounded(d, [x0, y0, x0 + bw, y0 + int(bh * 0.5)], r, SOFT)
    # louver lines
    ly = y0 + int(bh * 0.72)
    d.line([x0 + r, ly, x0 + bw - r, ly], fill=BRAND, width=max(2, s // 60))
    # airflow waves
    for i, col in enumerate((WHITE, SOFT)):
        wy = y0 + bh + int(s * 0.10) + i * int(s * 0.11)
        step = bw // 4
        for k in range(3):
            cx = x0 + step // 2 + k * step
            d.arc([cx - step // 2, wy - step // 2, cx + step // 2, wy + step // 2],
                  start=180, end=360, fill=col, width=max(2, s // 55))
    return img


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    print("wrote", os.path.relpath(path, ROOT))


# App images
for name, dim in (("small", (250, 175)), ("large", (500, 350)), ("xlarge", (1000, 700))):
    save(draw_glyph(dim), os.path.join(ROOT, "assets", "images", f"{name}.png"))

# Driver images
for name, dim in (("small", (75, 75)), ("large", (500, 500)), ("xlarge", (1000, 1000))):
    save(draw_glyph(dim), os.path.join(ROOT, "drivers", "heatpump", "assets", "images", f"{name}.png"))

# Driver icon = app icon
shutil.copyfile(
    os.path.join(ROOT, "assets", "icon.svg"),
    os.path.join(ROOT, "drivers", "heatpump", "assets", "icon.svg"),
)
print("copied driver icon.svg")
