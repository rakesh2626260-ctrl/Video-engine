#!/usr/bin/env python3
"""Parse storyboard-raw.txt -> scenes.json.

Input: storyboard-raw.txt with one scene per line:
    TYPE | ON-SCREEN TEXT | ICON | NARRATION
TYPE is one of: title, step, stat, cta.

Output: scenes.json list of {type, text, icon, narration}.
Fails (exit 1) with a ::error:: message on any invalid non-empty line.
"""
import json
import re
import sys

VALID = {'title', 'step', 'stat', 'cta'}


def main() -> int:
    scenes = []
    with open('storyboard-raw.txt', encoding='utf-8') as f:
        raw_lines = f.read().splitlines()
    for lineno, line in enumerate(raw_lines, 1):
        if not line.strip():
            continue
        parts = [p.strip() for p in line.split('|')]
        if len(parts) < 4:
            print(
                f"::error::line {lineno}: need 4 columns "
                f"TYPE | TEXT | ICON | NARRATION, got {len(parts)}",
                flush=True,
            )
            return 1
        stype = parts[0].lower()
        if stype not in VALID:
            print(
                f"::error::line {lineno}: bad TYPE '{parts[0]}' "
                "(want one of title, step, stat, cta)",
                flush=True,
            )
            return 1
        text = parts[1]
        icon = re.sub(r'[\s_]+', '-', parts[2].strip().lower())
        icon = re.sub(r'[^a-z0-9-]', '', icon) or 'zap'
        narration = ' '.join(parts[3:]).strip()
        if not text:
            print(f'::error::line {lineno}: empty ON-SCREEN TEXT', flush=True)
            return 1
        if not narration:
            narration = text
        scenes.append(
            {'type': stype, 'text': text, 'icon': icon, 'narration': narration}
        )
    if not scenes:
        print('::error::no valid storyboard scenes found', flush=True)
        return 1
    with open('scenes.json', 'w', encoding='utf-8') as f:
        json.dump(scenes, f, ensure_ascii=False)
    print(f'parsed {len(scenes)} scenes')
    return 0


if __name__ == '__main__':
    sys.exit(main())
