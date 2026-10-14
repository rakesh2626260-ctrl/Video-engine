import {Circle, Gradient, Node, Rect, Txt, makeScene2D} from '@revideo/2d';
import {
  all,
  createComputed,
  createRef,
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  easeOutQuad,
  useThread,
  waitFor,
} from '@revideo/core';

// The narration drives everything: the workflow writes the ffprobe duration of
// the generated voiceover into src/assets/meta.json.
import meta from '../assets/meta.json';
import codeRaw from '../assets/code.txt?raw';

/* ------------------------------------------------------------------ *
 * Timeline
 * ------------------------------------------------------------------ */

const INTRO = 0.9;
const OUTRO = 1.1;

const NARRATION_SECONDS =
  typeof meta?.duration === 'number' && meta.duration > 0 ? meta.duration : 6;

/** Typing always ends together with the narration. */
const TYPING = Math.max(1.5, NARRATION_SECONDS - 2);

/* ------------------------------------------------------------------ *
 * IDE window geometry (1920x1080 frame)
 * ------------------------------------------------------------------ */

const W = 1560;
const H = 850;
const TITLE_H = 54;
const STATUS_H = 46;
const GUTTER_W = 88;
const PAD_X = 22;
const PAD_Y = 24;
const FONT = 27;
const LINE_H = 42;
const GUTTER_FONT = 20;
/** DejaVu Sans Mono advance width = 0.60205em. */
const CHAR_W = FONT * 0.60205;
const FONT_FAMILY = '"DejaVu Sans Mono", "Liberation Mono", monospace';

const EDITOR_H = H - TITLE_H - STATUS_H;
const EDITOR_CENTER_Y = -H / 2 + TITLE_H + EDITOR_H / 2;
const CODE_TOP = -EDITOR_H / 2 + PAD_Y;
const CODE_START_X = -W / 2 + GUTTER_W + PAD_X;
const VISIBLE_LINES = Math.floor((EDITOR_H - PAD_Y * 2) / LINE_H);

const MAX_LINES = 100;
const MAX_COLS = 104;

/* ------------------------------------------------------------------ *
 * Typing speed: `charsPerSecond` plus a short pause on every newline.
 * The two are solved so the whole reveal takes exactly TYPING seconds.
 * ------------------------------------------------------------------ */

const LINE_PAUSE = 0.11;
const MIN_CPS = 12;
const MAX_CPS = 150;

/* ------------------------------------------------------------------ *
 * Regex syntax highlighting
 * ------------------------------------------------------------------ */

const COLORS = {
  bg: '#05070d',
  chrome: '#161b22',
  chromeTop: '#21262d',
  editor: '#0d1117',
  gutter: '#5b6570',
  curLine: '#1b2430',
  plain: '#9cdcfe',
  keyword: '#569cd6',
  control: '#c586c0',
  string: '#ce9178',
  number: '#b5cea8',
  comment: '#6a9955',
  func: '#dcdcaa',
  type: '#4ec9b0',
  punct: '#c9d1d9',
  text: '#8b949e',
  accent: '#58a6ff',
  ok: '#3fb950',
  dotRed: '#ff5f56',
  dotYellow: '#ffbd2e',
  dotGreen: '#27c93f',
} as const;

const KEYWORDS = new Set([
  'abstract', 'as', 'async', 'await', 'break', 'case', 'catch', 'class',
  'const', 'continue', 'default', 'delete', 'do', 'else', 'enum', 'export',
  'extends', 'finally', 'for', 'from', 'function', 'get', 'if', 'implements',
  'import', 'in', 'instanceof', 'interface', 'is', 'keyof', 'let', 'namespace',
  'new', 'of', 'private', 'protected', 'public', 'readonly', 'return', 'set',
  'static', 'super', 'switch', 'this', 'throw', 'try', 'type', 'typeof', 'var',
  'void', 'while', 'yield',
]);

const CONTROL = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'return', 'throw', 'try', 'catch', 'finally', 'yield', 'await', 'new',
  'delete', 'typeof', 'instanceof', 'in', 'of', 'void', 'as', 'is', 'in',
]);

const TOKEN_RE =
  /(?<comment>\/\/[^\n]*)|(?<string>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(?<number>\b\d[\w.]*)|(?<word>[A-Za-z_$][\w$]*)|(?<space>\s+)|(?<other>[^\sA-Za-z0-9_$]+)/g;

interface Token {
  text: string;
  color: string;
  col: number;
}

function nextIsCall(line: string, index: number): boolean {
  let i = index;
  while (i < line.length && line[i] === ' ') i++;
  return line[i] === '(';
}

function tokenize(line: string): Token[] {
  const out: Token[] = [];
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(line)) !== null) {
    const text = match[0];
    if (text.length === 0) {
      TOKEN_RE.lastIndex++;
      continue;
    }
    const groups = match.groups ?? {};
    let color: string = COLORS.punct;
    if (groups.comment !== undefined) {
      color = COLORS.comment;
    } else if (groups.string !== undefined) {
      color = COLORS.string;
    } else if (groups.number !== undefined) {
      color = COLORS.number;
    } else if (groups.word !== undefined) {
      if (CONTROL.has(text)) color = COLORS.control;
      else if (KEYWORDS.has(text)) color = COLORS.keyword;
      else if (/^[A-Z]/.test(text)) color = COLORS.type;
      else if (nextIsCall(line, match.index + text.length)) color = COLORS.func;
      else if (line[match.index - 1] === '.') color = COLORS.plain;
      else color = COLORS.text;
    }
    out.push({text, color, col: match.index});
  }
  return out;
}

/** Adjacent same-coloured tokens collapse into one node (monospace => exact). */
function mergeTokens(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const token of tokens) {
    const last = out[out.length - 1];
    if (last && last.color === token.color && last.col + last.text.length === token.col) {
      last.text += token.text;
    } else {
      out.push({...token});
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Code preparation
 * ------------------------------------------------------------------ */

const FALLBACK_CODE = [
  '// video-engine',
  'export function greet(name: string) {',
  '  const message = `Hello, ${name}!`;',
  '  console.log(message); // 1920x1080 @ 60fps',
  '  return message.length > 0;',
  '}',
].join('\n');

const normalized = (typeof codeRaw === 'string' ? codeRaw : '')
  .replace(/\r\n?/g, '\n')
  .replace(/\t/g, '  ');

const candidateLines = (normalized.trim().length > 0 ? normalized : FALLBACK_CODE)
  .split('\n')
  .slice(0, MAX_LINES)
  .map(line => line.slice(0, MAX_COLS));

/**
 * Keep only as many lines as can be typed inside TYPING at most MAX_CPS, so the
 * reveal never outlives the scene (and therefore never outlives the narration).
 */
let keep = 1;
for (let k = 1; k <= candidateLines.length; k++) {
  const chars =
    candidateLines.slice(0, k).reduce((total, line) => total + line.length, 0) +
    Math.max(0, k - 1);
  const available = TYPING - Math.max(0, k - 1) * LINE_PAUSE;
  if (chars <= MAX_CPS * Math.max(0.05, available)) keep = k;
  else break;
}

const fittedLines = candidateLines.slice(0, keep);
fittedLines[0] = fittedLines[0].slice(0, Math.floor(MAX_CPS * TYPING));

const TEXT = fittedLines.join('\n');
const LINES = TEXT.split('\n');
const N_CHARS = TEXT.length;

/** Global character index at which every line starts. */
const LINE_START: number[] = [];
{
  let cursor = 0;
  for (const line of LINES) {
    LINE_START.push(cursor);
    cursor += line.length + 1;
  }
}

const TOKENS = LINES.map(line => mergeTokens(tokenize(line)));

/** Time (relative to the start of typing) at which every char appears. */
const REVEAL = new Float32Array(N_CHARS);
let TYPED_SPAN = TYPING;
{
  const newlines = Math.max(0, LINES.length - 1);
  const natural = N_CHARS / Math.max(0.05, TYPING - newlines * LINE_PAUSE);
  const cps = Math.min(MAX_CPS, Math.max(MIN_CPS, natural));
  let t = 0;
  for (let i = 0; i < N_CHARS; i++) {
    REVEAL[i] = t;
    t += TEXT[i] === '\n' ? LINE_PAUSE : 1 / cps;
  }
  TYPED_SPAN = t;
}

/** Number of characters visible at `t` seconds into the typing phase. */
function countAt(t: number): number {
  if (t <= 0) return 0;
  if (t >= TYPED_SPAN) return N_CHARS;
  let lo = 0;
  let hi = N_CHARS;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (REVEAL[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Index of the line that contains the global character `index`. */
function lineOf(index: number): number {
  if (index <= 0) return 0;
  let lo = 0;
  let hi = LINE_START.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (LINE_START[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function lineY(index: number): number {
  return CODE_TOP + index * LINE_H + LINE_H / 2;
}

/** Target scroll offset (px) once `index` is the active line. */
function scrollTarget(index: number): number {
  return Math.max(0, index - (VISIBLE_LINES - 3)) * LINE_H;
}

/* ------------------------------------------------------------------ *
 * Scene
 * ------------------------------------------------------------------ */

export default makeScene2D('example', function* (view) {
  // `thread.time` is a signal that advances with the animation clock, so every
  // computed below stays in sync with the narration without per-frame updates.
  const time = useThread().time;
  const windowRef = createRef<Rect>();

  /* --- computed signals: every animated value is a pure function of time --- */

  const charCount = createComputed(() => countAt(time() - INTRO));

  const currentLine = createComputed(() => {
    const count = charCount();
    return count <= 0 ? 0 : lineOf(count - 1);
  });

  const currentColumn = createComputed(() => {
    const count = charCount();
    if (count <= 0) return 0;
    return count - LINE_START[currentLine()];
  });

  const caretX = createComputed(() => CODE_START_X + currentColumn() * CHAR_W);
  const caretY = createComputed(() => lineY(currentLine()));

  const caretOpacity = createComputed(() => {
    const t = time();
    if (t < INTRO) return 0;
    if (t > INTRO + TYPED_SPAN + 0.2) return 0.9;
    return t % 0.9 < 0.45 ? 1 : 0.12;
  });

  const scrollY = createComputed(() => {
    const t = time() - INTRO;
    if (t <= 0) return 0;
    const line = countAt(t) <= 0 ? 0 : lineOf(countAt(t) - 1);
    const from = scrollTarget(line);
    const to = scrollTarget(Math.min(line + 1, LINES.length - 1));
    // The next line starts after this line's own content + a newline pause.
    const nextStart = line + 1 < LINES.length ? REVEAL[LINE_START[line + 1]] : TYPED_SPAN;
    const start = REVEAL[LINE_START[line]];
    const span = Math.max(0.001, nextStart - start);
    const progress = Math.min(1, Math.max(0, (t - start) / span));
    return from + (to - from) * easeInOutCubic(progress);
  });

  const progress = createComputed(() => charCount() / N_CHARS);
  const statusText = createComputed(
    () => `Ln ${currentLine() + 1}, Col ${currentColumn() + 1}`,
  );
  const percentText = createComputed(() => `${Math.round(progress() * 100)}%`);

  /* --- static content: one flat list of absolutely positioned nodes --- */

  const codeNodes: Node[] = [];
  for (let i = 0; i < LINES.length; i++) {
    const y = lineY(i);
    codeNodes.push(
      <Txt
        key={`gutter-${i}`}
        text={`${i + 1}`}
        fill={COLORS.gutter}
        fontFamily={FONT_FAMILY}
        fontSize={GUTTER_FONT}
        width={GUTTER_W - 24}
        textAlign={'right'}
        offset={[-1, 0]}
        x={-W / 2 + 12}
        y={y}
      />,
    );
    for (let j = 0; j < TOKENS[i].length; j++) {
      const token = TOKENS[i][j];
      const start = LINE_START[i] + token.col;
      codeNodes.push(
        <Txt
          key={`code-${i}-${j}`}
          text={createComputed(() => {
            const visible = charCount() - start;
            if (visible <= 0) return '';
            return token.text.slice(0, Math.min(visible, token.text.length));
          })}
          fill={token.color}
          fontFamily={FONT_FAMILY}
          fontSize={FONT}
          offset={[-1, 0]}
          x={CODE_START_X + token.col * CHAR_W}
          y={y}
        />,
      );
    }
  }

  /* --- background ------------------------------------------------------- */

  view.add(
    <Rect
      width={1920}
      height={1080}
      fill={
        new Gradient({
          type: 'linear',
          from: [-960, -540],
          to: [960, 540],
          stops: [
            {offset: 0, color: '#101a2e'},
            {offset: 0.55, color: '#070a12'},
            {offset: 1, color: '#04060b'},
          ],
        })
      }
    />,
  );

  /* --- IDE window ------------------------------------------------------- */

  view.add(
    <Rect ref={windowRef} width={W} height={H} radius={18} clip fill={COLORS.chrome}>
      {/* editor surface */}
      <Rect
        width={W}
        height={EDITOR_H}
        y={EDITOR_CENTER_Y}
        fill={COLORS.editor}
        clip
      >
        <Rect width={1} height={EDITOR_H} x={-W / 2 + GUTTER_W} fill={'#21262d'} />
        <Node y={createComputed(() => -scrollY())}>
          {[
            <Rect
              key={'active-line'}
              width={W}
              height={LINE_H}
              offset={[-1, 0]}
              x={-W / 2}
              y={caretY}
              fill={COLORS.curLine}
            />,
            ...codeNodes,
            <Rect
              key={'caret'}
              width={3}
              height={FONT * 1.25}
              radius={1.5}
              x={caretX}
              y={caretY}
              fill={COLORS.accent}
              opacity={caretOpacity}
            />,
          ]}
        </Node>
      </Rect>

      {/* title bar */}
      <Rect width={W} height={TITLE_H} y={-H / 2 + TITLE_H / 2} fill={COLORS.chromeTop} />
      <Circle x={-W / 2 + 40} y={-H / 2 + TITLE_H / 2} size={18} fill={COLORS.dotRed} />
      <Circle x={-W / 2 + 72} y={-H / 2 + TITLE_H / 2} size={18} fill={COLORS.dotYellow} />
      <Circle x={-W / 2 + 104} y={-H / 2 + TITLE_H / 2} size={18} fill={COLORS.dotGreen} />
      <Txt
        text={'code.txt'}
        fill={COLORS.text}
        fontFamily={FONT_FAMILY}
        fontSize={21}
        y={-H / 2 + TITLE_H / 2}
      />
      <Rect
        width={168}
        height={30}
        radius={15}
        x={W / 2 - 102}
        y={-H / 2 + TITLE_H / 2}
        fill={COLORS.editor}
      />
      <Txt
        text={'video-engine'}
        fill={COLORS.accent}
        fontFamily={FONT_FAMILY}
        fontSize={17}
        x={W / 2 - 102}
        y={-H / 2 + TITLE_H / 2}
      />

      {/* status bar */}
      <Rect width={W} height={STATUS_H} y={H / 2 - STATUS_H / 2} fill={COLORS.chromeTop} />
      <Txt
        text={`TypeScript   UTF-8   ${LINES.length} lines`}
        fill={COLORS.text}
        fontFamily={FONT_FAMILY}
        fontSize={18}
        offset={[-1, 0]}
        x={-W / 2 + 26}
        y={H / 2 - STATUS_H / 2}
      />
      <Txt
        text={statusText}
        fill={COLORS.text}
        fontFamily={FONT_FAMILY}
        fontSize={18}
        offset={[1, 0]}
        x={W / 2 - 26}
        y={H / 2 - STATUS_H / 2}
      />
      <Txt
        text={percentText}
        fill={COLORS.ok}
        fontFamily={FONT_FAMILY}
        fontSize={18}
        x={W / 2 - 190}
        y={H / 2 - STATUS_H / 2}
      />

      {/* progress bar */}
      <Rect width={W} height={4} y={H / 2 - 2} fill={COLORS.chromeTop} />
      <Rect
        width={createComputed(() => W * progress())}
        height={4}
        offset={[-1, 0]}
        x={-W / 2}
        y={H / 2 - 2}
        fill={COLORS.ok}
      />
    </Rect>,
  );

  /* --- intro ------------------------------------------------------------ */

  view.opacity(0);
  windowRef().scale(0.982);
  windowRef().y(16);

  yield* all(
    view.opacity(1, 0.5, easeOutQuad),
    windowRef().scale(1, 0.55, easeOutCubic),
    windowRef().y(0, 0.55, easeOutCubic),
  );
  yield* waitFor(INTRO - 0.55);

  /* --- typing (driven purely by the computed signals above) -------------- */

  yield* waitFor(TYPING);

  /* --- outro ------------------------------------------------------------ */

  yield* all(
    view.opacity(0, 0.6, easeInCubic),
    windowRef().scale(1.03, 0.6, easeInCubic),
  );
  yield* waitFor(OUTRO - 0.6);
});
