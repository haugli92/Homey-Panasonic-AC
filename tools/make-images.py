#!/usr/bin/env python3
"""Generate Homey Store images from the source photos in assets/src/.

- App images (250x175, 500x350, 1000x700): a lifestyle photo, centre-cropped
  to the required aspect ratio.
- Driver images (75x75, 500x500, 1000x1000): a product photo of the device,
  composited on white and centred as a square with a small margin.

See assets/src/ATTRIBUTION.md for image sources and licenses.
Run: python3 tools/make-images.py
"""
import os
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "src")


def app_image(size):
    im = Image.open(os.path.join(SRC, "app-lifestyle.jpg")).convert("RGB")
    w, h = im.size
    tw, th = size
    target = tw / th
    if w / h > target:
        cw = int(h * target)
        left = (w - cw) // 2
        box = (left, 0, left + cw, h)
    else:
        ch = int(w / target)
        top = (h - ch) // 2
        box = (0, top, w, top + ch)
    return im.crop(box).resize(size, Image.LANCZOS)


def driver_image(side):
    im = Image.open(os.path.join(SRC, "device.webp")).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    rgb = bg.convert("RGB")
    a = np.asarray(rgb).astype(int)
    mask = (a[:, :, 0] < 245) | (a[:, :, 1] < 245) | (a[:, :, 2] < 245)
    ys, xs = np.where(mask)
    crop = rgb.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    cw, ch = crop.size
    s = int(max(cw, ch) * 1.14)  # square canvas with ~7% margin
    canvas = Image.new("RGB", (s, s), (255, 255, 255))
    canvas.paste(crop, ((s - cw) // 2, (s - ch) // 2))
    return canvas.resize((side, side), Image.LANCZOS)


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    print("wrote", os.path.relpath(path, ROOT))


for name, dim in (("small", (250, 175)), ("large", (500, 350)), ("xlarge", (1000, 700))):
    save(app_image(dim), os.path.join(ROOT, "assets", "images", f"{name}.png"))

for name, side in (("small", 75), ("large", 500), ("xlarge", 1000)):
    save(driver_image(side), os.path.join(ROOT, "drivers", "heatpump", "assets", "images", f"{name}.png"))

# Note: the app/driver icon.svg files are hand-maintained line/silhouette art
# and are intentionally not generated here.
