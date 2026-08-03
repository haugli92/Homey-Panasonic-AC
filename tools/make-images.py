#!/usr/bin/env python3
"""Generate the PNG assets Homey requires, for both the app and the driver.

Draws a clean AC indoor-unit glyph with airflow on a brand-blue gradient.
Everything is rendered at 4x and downscaled with LANCZOS for smooth edges.
The app/driver icon.svg files are hand-maintained separately and not touched
here."""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SS = 4  # supersampling factor for anti-aliasing

TOP = (0, 103, 192)
BOTTOM = (0, 74, 140)
WHITE = (255, 255, 255)
ACCENT = (206, 227, 245)


def gradient(size):
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        row = tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = row
    return img


def glyph(size):
    w, h = (size[0] * SS, size[1] * SS)
    img = gradient((w, h)).convert("RGBA")
    d = ImageDraw.Draw(img)
    s = min(w, h)

    bw, bh = int(s * 0.66), int(s * 0.26)
    x0 = (w - bw) // 2
    y0 = int(h * 0.28)
    r = int(bh * 0.34)

    # soft shadow
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ds = ImageDraw.Draw(shadow)
    off = int(s * 0.015)
    ds.rounded_rectangle([x0, y0 + off, x0 + bw, y0 + bh + off], radius=r,
                         fill=(0, 0, 0, 70))
    img.alpha_composite(shadow)

    # unit body
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=r, fill=WHITE)
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + int(bh * 0.46)], radius=r,
                        fill=ACCENT)
    # louver
    ly = y0 + int(bh * 0.74)
    d.line([x0 + r, ly, x0 + bw - r, ly], fill=(0, 86, 160), width=max(SS, s // 90))
    # status dot
    dot = int(bh * 0.11)
    dx = x0 + bw - int(bh * 0.5)
    dy = y0 + int(bh * 0.24)
    d.ellipse([dx, dy, dx + dot, dy + dot], fill=(0, 122, 90))

    # airflow arcs
    for i in range(3):
        aw = int(bw * (0.34 + i * 0.12))
        ah = int(s * 0.16)
        ax = w // 2 - aw // 2
        ay = y0 + bh + int(s * 0.06) + i * int(s * 0.05)
        alpha = 235 - i * 60
        d.arc([ax, ay, ax + aw, ay + ah], start=200, end=340,
              fill=(255, 255, 255, alpha), width=max(SS, s // 80))

    return img.resize(size, Image.LANCZOS)


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.convert("RGBA").save(path)
    print("wrote", os.path.relpath(path, ROOT))


# App images
for name, dim in (("small", (250, 175)), ("large", (500, 350)), ("xlarge", (1000, 700))):
    save(glyph(dim), os.path.join(ROOT, "assets", "images", f"{name}.png"))

# Driver images
for name, dim in (("small", (75, 75)), ("large", (500, 500)), ("xlarge", (1000, 1000))):
    save(glyph(dim), os.path.join(ROOT, "drivers", "heatpump", "assets", "images", f"{name}.png"))

# Note: app icon (assets/icon.svg) and driver icon (drivers/heatpump/assets/icon.svg)
# are hand-maintained SVGs and are intentionally not generated here.
