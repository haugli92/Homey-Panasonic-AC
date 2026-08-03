#!/usr/bin/env python3
"""Generate the PNG assets Homey requires.

- App images: a lively climate illustration (unit + airflow + heat/cool cues).
- Driver images: a clean unit glyph on the brand gradient.

Rendered at 4x and downscaled with LANCZOS for smooth edges. The app/driver
icon.svg files are hand-maintained separately and are not touched here."""
import os
import math
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SS = 4

TOP = (39, 118, 205)
BOTTOM = (0, 54, 107)
WHITE = (255, 255, 255)
ACCENT = (206, 227, 245)
BODY_LINE = (0, 86, 160)


def gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        row = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = row
    return img.convert("RGBA")


def glow(img, cx, cy, r, color, alpha):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.35))
    img.alpha_composite(layer)


def snowflake(d, cx, cy, r, w):
    for a in range(0, 180, 60):
        rad = math.radians(a)
        dx, dy = math.cos(rad) * r, math.sin(rad) * r
        d.line([cx - dx, cy - dy, cx + dx, cy + dy], fill=(255, 255, 255, 230), width=w)


def sun(d, cx, cy, r, w):
    d.ellipse([cx - r * 0.5, cy - r * 0.5, cx + r * 0.5, cy + r * 0.5],
              outline=(255, 255, 255, 230), width=w)
    for a in range(0, 360, 45):
        rad = math.radians(a)
        x1, y1 = cx + math.cos(rad) * r * 0.72, cy + math.sin(rad) * r * 0.72
        x2, y2 = cx + math.cos(rad) * r, cy + math.sin(rad) * r
        d.line([x1, y1, x2, y2], fill=(255, 255, 255, 230), width=w)


def unit(d, x0, y0, bw, bh):
    r = int(bh * 0.32)
    # shadow
    sh = Image.new("RGBA", (2000, 2000), (0, 0, 0, 0))
    d.rounded_rectangle([x0, y0 + bh * 0.10, x0 + bw, y0 + bh + bh * 0.10],
                        radius=r, fill=(0, 0, 0, 60))
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=r, fill=WHITE)
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + int(bh * 0.46)], radius=r, fill=ACCENT)
    ly = y0 + int(bh * 0.72)
    d.line([x0 + r, ly, x0 + bw - r, ly], fill=BODY_LINE, width=max(SS, bw // 60))
    dot = int(bh * 0.10)
    d.ellipse([x0 + bw - bh * 0.55, y0 + bh * 0.22,
               x0 + bw - bh * 0.55 + dot, y0 + bh * 0.22 + dot], fill=(0, 150, 100))


def store(size):
    w, h = (size[0] * SS, size[1] * SS)
    img = gradient((w, h), TOP, BOTTOM)
    glow(img, int(w * 0.5), int(h * 0.42), int(min(w, h) * 0.55), (120, 190, 255), 90)
    d = ImageDraw.Draw(img)
    s = min(w, h)

    bw, bh = int(w * 0.5), int(s * 0.30)
    x0 = int(w * 0.5 - bw / 2)
    y0 = int(h * 0.16)
    unit(d, x0, y0, bw, bh)

    # airflow
    cx = w // 2
    for i in range(3):
        aw = int(bw * (0.5 + i * 0.16))
        ah = int(s * 0.16)
        ay = y0 + bh + int(s * 0.05) + i * int(s * 0.05)
        d.arc([cx - aw // 2, ay, cx + aw // 2, ay + ah], start=200, end=340,
              fill=(255, 255, 255, 230 - i * 60), width=max(SS, s // 70))

    # cool + heat cues flanking the unit
    snowflake(d, int(w * 0.18), int(h * 0.34), int(s * 0.07), max(SS, s // 90))
    sun(d, int(w * 0.82), int(h * 0.34), int(s * 0.08), max(SS, s // 90))

    return img.resize(size, Image.LANCZOS)


def glyph(size):
    w, h = (size[0] * SS, size[1] * SS)
    img = gradient((w, h), (0, 103, 192), (0, 74, 140))
    d = ImageDraw.Draw(img)
    s = min(w, h)
    bw, bh = int(s * 0.62), int(s * 0.24)
    x0, y0 = (w - bw) // 2, int(h * 0.32)
    unit(d, x0, y0, bw, bh)
    for i in range(3):
        aw = int(bw * (0.4 + i * 0.14))
        ah = int(s * 0.15)
        ay = y0 + bh + int(s * 0.07) + i * int(s * 0.05)
        d.arc([w // 2 - aw // 2, ay, w // 2 + aw // 2, ay + ah], start=200, end=340,
              fill=(255, 255, 255, 235 - i * 60), width=max(SS, s // 75))
    return img.resize(size, Image.LANCZOS)


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.convert("RGBA").save(path)
    print("wrote", os.path.relpath(path, ROOT))


for name, dim in (("small", (250, 175)), ("large", (500, 350)), ("xlarge", (1000, 700))):
    save(store(dim), os.path.join(ROOT, "assets", "images", f"{name}.png"))

for name, dim in (("small", (75, 75)), ("large", (500, 500)), ("xlarge", (1000, 1000))):
    save(glyph(dim), os.path.join(ROOT, "drivers", "heatpump", "assets", "images", f"{name}.png"))

# Note: app icon (assets/icon.svg) and driver icon (drivers/heatpump/assets/icon.svg)
# are hand-maintained SVGs and are intentionally not generated here.
