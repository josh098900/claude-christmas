#!/usr/bin/env python3
"""One frame per shot (middle of the shot) as a labelled storyboard sheet.
   python3 render/storyboard.py build/film_540.mp4 final/storyboard_contact_sheet.png"""
import json, os, subprocess, sys, tempfile, textwrap
from PIL import Image, ImageDraw, ImageFont
film, out = sys.argv[1], sys.argv[2]
edl = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'film', 'edl.json')))
tmp = tempfile.mkdtemp()
cols, w = 6, 400
h = w * 9 // 16
cap = 64
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
    bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
    big = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
except Exception:
    font = bold = big = ImageFont.load_default()
shots = edl['shots']
rows = (len(shots) + cols - 1) // cols
head = 70
sheet = Image.new('RGB', (cols * (w + 10) + 10, head + rows * (h + cap + 10) + 10), (238, 232, 220))
d = ImageDraw.Draw(sheet)
d.text((14, 18), 'SEEN FROM SPACE  ·  storyboard (one frame per shot)', fill=(40, 40, 60), font=big)
t = 0.0
for i, s in enumerate(shots):
    mid = t + s['dur'] * 0.6
    fp = os.path.join(tmp, f'{i:02d}.png')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{mid:.3f}', '-i', film, '-frames:v', '1', '-vf', f'scale={w}:{h}', fp], check=True)
    r, c = divmod(i, cols)
    x, y = 10 + c * (w + 10), head + r * (h + cap + 10)
    sheet.paste(Image.open(fp).convert('RGB'), (x, y))
    m, sec = divmod(t, 60)
    d.text((x, y + h + 4), f"{s['id']}  {int(m)}:{sec:05.2f}  ({s['dur']:.1f}s)", fill=(30, 30, 50), font=bold)
    for k, line in enumerate(textwrap.wrap(s['action'], 58)[:2]):
        d.text((x, y + h + 24 + k * 16), line, fill=(70, 70, 90), font=font)
    t += s['dur']
sheet.save(out)
print(out, sheet.size)
