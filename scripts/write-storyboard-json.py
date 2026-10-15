#!/usr/bin/env python3
"""Write src/assets/storyboard.json + src/assets/meta.json.

Reads scenes.json [{type, text, icon, narration}] and durations.txt (one
ffprobe duration per line), uses GAP seconds of silence between scenes.

Output storyboard.json: [{type, text, icon, start, duration}] with exact
start times; meta.json: {"duration": total}.
"""
import json
import sys

GAP = 0.35


def main() -> int:
    scenes = json.load(open('scenes.json', encoding='utf-8'))
    durations = [
        float(x.strip()) for x in open('durations.txt', encoding='utf-8') if x.strip()
    ]
    if len(durations) != len(scenes):
        print(
            f"::error::{len(durations)} durations vs {len(scenes)} scenes",
            flush=True,
        )
        return 1
    out = []
    t = 0.0
    for s, d in zip(scenes, durations):
        out.append(
            {
                'type': s['type'],
                'text': s['text'],
                'icon': s['icon'],
                'start': round(t, 4),
                'duration': round(d, 4),
            }
        )
        t += d + GAP
    total = round(t - GAP, 4) if out else 0.0
    with open('src/assets/storyboard.json', 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)
    with open('src/assets/meta.json', 'w', encoding='utf-8') as f:
        json.dump({'duration': total}, f)
    print(json.dumps(out[:2], ensure_ascii=False)[:300])
    print('total', total)
    return 0


if __name__ == '__main__':
    sys.exit(main())
