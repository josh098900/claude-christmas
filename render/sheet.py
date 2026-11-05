#!/usr/bin/env python3
"""Make a labelled contact sheet from PNGs: python3 render/sheet.py out.png cols w img1 img2 ..."""
import sys
from PIL import Image, ImageDraw, ImageFont
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
files = sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in files]
h = int(w * 9 / 16)
rows = (len(ims) + cols - 1) // cols
pad = 6
sheet = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + pad + 22) + pad), (18, 18, 24))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
except Exception:
    font = ImageFont.load_default()
for i, (im, f) in enumerate(zip(ims, files)):
    r, c = divmod(i, cols)
    x, y = pad + c * (w + pad), pad + r * (h + pad + 22)
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y))
    d.text((x + 4, y + h + 3), f.split('/')[-1], fill=(220, 220, 220), font=font)
sheet.save(out)
print(out, sheet.size)
