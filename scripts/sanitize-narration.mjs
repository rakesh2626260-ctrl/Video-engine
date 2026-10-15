/**
 * Narration sanitizer for BOTH video modes (code + storyboard).
 *
 * Before Piper TTS, strip anything that is not speakable:
 * - markdown (#, *, |, tables, fences, quotes, list markers)
 * - emojis
 * - text in square brackets [like this]
 * - whole lines that begin with Goal:, Visual, Audio or On-Screen
 * - collapse all whitespace to single spaces
 *
 * Usage:
 *   node scripts/sanitize-narration.mjs < input.txt > clean.txt
 *   node scripts/sanitize-narration.mjs input.txt output.txt
 *   echo "hi" | node scripts/sanitize-narration.mjs
 *
 * Also importable: `import {sanitizeNarration} from './sanitize-narration.mjs'`
 */

export function sanitizeNarration(raw) {
  let text = String(raw ?? '');

  // 1. Drop whole lines that are stage directions, case-insensitive:
  //    Goal:, Visual, Audio, On-Screen (also "On Screen:").
  const kept = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (/^(goal|visual|audio)\s*:/i.test(t)) continue;
    if (/^on[-\s]?screen\s*:/i.test(t)) continue;
    kept.push(line);
  }
  text = kept.join('\n');

  // 2. Remove [bracketed text] (non-nested, repeat to catch adjacents).
  //    Run before markdown stripping so "[link](url)" loses the label first.
  for (let i = 0; i < 3; i++) {
    const next = text.replace(/\[[^\[\]]*\]/g, ' ');
    if (next === text) break;
    text = next;
  }
  // Bare markdown links: [gone above] -> "(url)" remains; drop "(url)".
  text = text.replace(/\(\s*https?:\/\/[^)]*\)/g, ' ');

  // 3. Strip markdown/table characters.
  //    - fenced code blocks: keep inner text, drop the fences
  text = text.replace(/^```[\w-]*\s*$/gm, ' ');
  text = text.replace(/```/g, ' ');
  //    - table delimiter rows (|---|---|) become blank
  text = text.replace(/^\s*\|?[\s:|\-]+\|[\s:|\-]*\s*$/gm, ' ');
  //    - markdown structural chars: # * | ` ~ _ > + - =
  //      (leading list/quote/heading markers first, then inline)
  text = text.replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/gm, ' ');
  text = text.replace(/[#*|`~]/g, ' ');
  text = text.replace(/\|/g, ' ');
  //    - underscores used as emphasis (keep intra-word underscores in code-ish
  //      words by only collapsing runs of 1+ around spaces? simplest: drop all
  //      underscores that are not between alphanumerics)
  text = text.replace(/(?<![A-Za-z0-9])_|_(?![A-Za-z0-9])/g, ' ');

  // 4. Strip emojis (Unicode pictographic + emoji presentation + ZWJ/VS16).
  try {
    text = text.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ' ');
  } catch {
    // Very old Node without Unicode property escapes: fall back to surrogate ranges.
    text = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ');
    text = text.replace(/[\u2600-\u27BF\u2B00-\u2BFF]/g, ' ');
  }

  // 5. Collapse whitespace.
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

const isMain =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '');
if (isMain) {
  const {readFileSync, writeFileSync} = await import('node:fs');
  const args = process.argv.slice(2);
  let input;
  if (args[0]) {
    input = readFileSync(args[0], 'utf8');
  } else if (process.stdin.isTTY) {
    console.error('usage: node scripts/sanitize-narration.mjs [input.txt [output.txt]]');
    process.exit(2);
  } else {
    input = readFileSync(0, 'utf8');
  }
  const clean = sanitizeNarration(input);
  if (args[1]) writeFileSync(args[1], clean + '\n');
  else process.stdout.write(clean + '\n');
}
