#!/usr/bin/env bash
# Build every deliverable from the 1080p segments: master, poster, storyboard, cut-downs, score.
set -euo pipefail
cd "$(dirname "$0")/.."
node render/build.mjs
node render/master.mjs --tag 1080 --kbps 4000                 # final/seen_from_space.mp4 (< 95 MB)
node render/still.mjs --scale 2 --out build/poster lab:poster # 3840x2160 key art
python3 - <<'PY'
from PIL import Image
im = Image.open('build/poster/poster.png').convert('RGB')
W, H = im.size
w = int(H * 2 / 3)
im.crop(((W - w) // 2, 0, (W + w) // 2, H)).save('final/poster.png')
im.resize((1920, 1080), Image.LANCZOS).save('final/keyart_16x9.png')
print('poster', w, H)
PY
python3 render/storyboard.py final/seen_from_space.mp4 final/storyboard_contact_sheet.png
node render/cutdowns.mjs final/seen_from_space.mp4
cp audio/out/mix.wav final/score.wav
ls -la final/
