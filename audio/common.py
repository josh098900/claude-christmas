"""Shared constants for the Seen From Space soundtrack. Timing comes from film/edl.json."""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'out')
STEMS = os.path.join(OUT, 'stems')
MIDI = os.path.join(OUT, 'midi')
SR = 48000
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'

_edl = json.load(open(os.path.join(ROOT, 'film', 'edl.json')))
FPS = _edl['fps']
SHOT = {}
_t = 0.0
for _s in _edl['shots']:
    SHOT[_s['id']] = (_t, _t + _s['dur'])
    _t += _s['dur']
LENGTH = _t  # 168.0

def st(shot_id, offset=0.0):
    """Absolute time (s) of an offset into a shot."""
    return SHOT[shot_id][0] + offset

BLAZE = SHOT['I4'][0]          # 136.5 s, frame 3276
CLICK = st('H4', 0.25)         # the dead click of the switch

def ensure_dirs():
    for d in (OUT, STEMS, MIDI):
        os.makedirs(d, exist_ok=True)

def write_wav(path, x, sr=SR):
    from scipy.io import wavfile
    x = np.asarray(x, dtype=np.float32)
    wavfile.write(path, sr, x)

def read_wav(path):
    from scipy.io import wavfile
    sr, x = wavfile.read(path)
    if x.dtype == np.int16:
        x = x.astype(np.float32) / 32768.0
    elif x.dtype == np.int32:
        x = x.astype(np.float32) / 2147483648.0
    x = x.astype(np.float32)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    assert sr == SR, (path, sr)
    return x
