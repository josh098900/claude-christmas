#!/usr/bin/env python3
"""Sample the film every 0.5 s into labelled contact sheets for critique.
   python3 render/samples.py build/film_540.mp4 build/review   -> build/review/sheet_XX.png"""
import json, os, subprocess, sys, glob
from PIL import Image, ImageDraw, ImageFont
film, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for f in glob.glob(os.path.join(out, '*.png')): os.remove(f)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', film, '-vf', 'fps=2,scale=384:-1', os.path.join(out, 'f_%04d.png')], check=True)
edl = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'film', 'edl.json')))
bounds, t = [], 0.0
for s in edl['shots']:
    bounds.append((t, t + s['dur'], s['id'])); t += s['dur']
def shot_at(x):
    for a, b, i in bounds:
        if a <= x < b: return i
    return bounds[-1][2]
frames = sorted(glob.glob(os.path.join(out, 'f_*.png')))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except Exception: font = ImageFont.load_default()
cols, rows = 5, 6
per = cols * rows
w, h = 384, 216
for si in range(0, len(frames), per):
    chunk = frames[si:si + per]
    sheet = Image.new('RGB', (cols * (w + 4) + 4, rows * (h + 24) + 4), (16, 16, 20))
    d = ImageDraw.Draw(sheet)
    for k, fp in enumerate(chunk):
        idx = si + k
        tt = idx * 0.5 + 0.25
        im = Image.open(fp).convert('RGB').resize((w, h))
        r, c = divmod(k, cols)
        x, y = 4 + c * (w + 4), 4 + r * (h + 24)
        sheet.paste(im, (x, y))
        d.text((x + 4, y + h + 3), f't={tt:6.2f}s  {shot_at(tt)}', fill=(230, 230, 230), font=font)
    sheet.save(os.path.join(out, f'sheet_{si // per:02d}.png'))
for fp in frames: os.remove(fp)
print(len(frames), 'frames ->', len(range(0, len(frames), per)), 'sheets in', out)
