#!/usr/bin/env python3
"""Copy used Lucide SVGs from node_modules to src/assets/icons/.

Reads src/assets/storyboard.json, copies
node_modules/lucide-static/icons/<icon>.svg for each scene (falling back to
zap.svg with a warning), and writes the possibly-corrected icon names back.
"""
import json
import pathlib
import shutil
import sys


def main() -> int:
    scenes = json.load(open('src/assets/storyboard.json', encoding='utf-8'))
    src = pathlib.Path('node_modules/lucide-static/icons')
    dst = pathlib.Path('src/assets/icons')
    dst.mkdir(parents=True, exist_ok=True)
    for s in scenes:
        name = s['icon']
        cand = src / f'{name}.svg'
        if not cand.exists():
            print(f"::warning::lucide icon '{name}' not found, falling back to zap")
            s['icon'] = 'zap'
            cand = src / 'zap.svg'
        shutil.copyfile(cand, dst / f"{s['icon']}.svg")
    json.dump(scenes, open('src/assets/storyboard.json', 'w', encoding='utf-8'), ensure_ascii=False)
    print('icons:', sorted(p.name for p in dst.glob('*.svg')))
    return 0


if __name__ == '__main__':
    sys.exit(main())
