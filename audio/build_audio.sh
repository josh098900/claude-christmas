#!/usr/bin/env bash
# Rebuild the whole soundtrack from code: score -> stems, foley, mix/master, cue sheet.
set -euo pipefail
cd "$(dirname "$0")"
python3 score.py
python3 foley.py
python3 mix.py
python3 cuesheet.py
