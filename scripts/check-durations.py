#!/usr/bin/env python3
"""Check that video duration is within 0.1s of the voiceover.

Usage: python3 scripts/check-durations.py <video_seconds> <audio_seconds>
"""
import sys

if len(sys.argv) != 3:
    print('usage: check-durations.py <video_seconds> <audio_seconds>')
    sys.exit(2)
vd, ad = float(sys.argv[1]), float(sys.argv[2])
diff = abs(vd - ad)
print(f'diff={diff:.4f}s')
if diff > 0.1:
    print(
        f'::error::video ({vd:.3f}s) differs from voiceover ({ad:.3f}s) '
        f'by {diff:.3f}s (> 0.1s)'
    )
    sys.exit(1)
print('duration check passed')
