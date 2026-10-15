import {Circle, Gradient, Node, Rect, Txt, SVG, makeScene2D} from '@revideo/2d';
import {
  createComputed,
  easeOutBack,
  easeOutCubic,
  useThread,
  waitFor,
} from '@revideo/core';

// Generated per job by the workflow:
// [{type, text, icon, start, duration}] with exact start times.
// (src/assets is git-ignored; the workflow writes this before rendering.)
import storyboardRaw from '../assets/storyboard.json';

interface BoardScene {
  type: 'title' | 'step' | 'stat' | 'cta';
  text: string;
  icon: string;
  start: number;
  duration: number;
}

const VALID = new Set(['title', 'step', 'stat', 'cta']);

function asScenes(raw: unknown): BoardScene[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: BoardScene[] = [];
  for (const item of arr) {
    const r = item as Record<string, unknown>;
    const type = String(r.type ?? '').toLowerCase();
    if (!VALID.has(type)) continue;
    const text = String(r.text ?? '').trim();
    const icon = String(r.icon ?? 'zap').trim() || 'zap';
    const start = Number(r.start ?? 0);
    const duration = Number(r.duration ?? 0);
    if (!text || !(duration > 0)) continue;
    out.push({
      type: type as BoardScene['type'],
      text,
      icon,
      start: start > 0 ? start : 0,
      duration,
    });
  }
  // Fallback so a missing/empty json never renders black.
  if (out.length === 0) {
    out.push(
      {type: 'title', text: 'Hello', icon: 'zap', start: 0, duration: 2},
      {type: 'cta', text: 'Try again', icon: 'zap', start: 2.35, duration: 2},
    );
  }
  return out;
}

const SCENES = asScenes(storyboardRaw as unknown);
const TOTAL = SCENES.reduce((m, s) => Math.max(m, s.start + s.duration), 0);
const TRANSITION = 0.3;

/** Step numbering among step-type scenes only. */
const STEP_TOTAL = SCENES.filter(s => s.type === 'step').length;
const STEP_NUM = new Map<number, number>();
{
  let n = 0;
  SCENES.forEach((s, i) => {
    if (s.type === 'step') {
      n += 1;
      STEP_NUM.set(i, n);
    }
  });
}

function parseStat(text: string): {label: string; value: number} {
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) {
    const value = Math.min(100, Math.max(0, Number(pct[1])));
    const label = text.replace(pct[0], '').replace(/[:\-–—]\s*$/, '').trim() || text;
    return {label, value};
  }
  const num = text.match(/(\d+(?:\.\d+)?)/);
  if (num) {
    return {label: text, value: Math.min(100, Math.max(0, Number(num[1])))};
  }
  return {label: text, value: 75};
}

/* ------------------------------------------------------------------ *
 * Lucide icons (npm package lucide-static, read from node_modules).
 * The workflow installs lucide-static via npm and copies the used SVGs
 * from node_modules/lucide-static/icons/ to src/assets/icons/ before
 * rendering; the scene loads the copied files (6 SVGs, fast) instead of
 * globbing all of node_modules (1500+ SVGs, too slow for headless render).
 * ------------------------------------------------------------------ */

const assetIcons = import.meta.glob('../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function iconSvg(name: string, accent: string): string {
  const key = (name || 'zap').toLowerCase();
  let raw: string | undefined;
  for (const [path, content] of Object.entries(assetIcons)) {
    if (path.endsWith(`/${key}.svg`)) {
      raw = content;
      break;
    }
  }
  if (!raw) raw = assetIcons['../assets/icons/zap.svg'];
  if (!raw) {
    for (const [, content] of Object.entries(assetIcons)) {
      if (content) {
        raw = content;
        break;
      }
    }
  }
  if (!raw) return '';
  // Lucide uses stroke="currentColor": bake the accent color in.
  return raw.split('currentColor').join(accent);
}

const ACCENTS = ['#58a6ff', '#7c5cff', '#3fb950', '#ffbd2e', '#ff7b72', '#39c5cf'];
const FONT = '"DejaVu Sans", "Liberation Sans", sans-serif';

function clamp01(v: number): number {
  return v <= 0 ? 0 : v >= 1 ? 1 : v;
}

/**
 * Which storyboard entry is on screen at time t.
 * The switch happens TRANSITION seconds before the next narration starts,
 * so the 0.3s crossfade/slide lives fully inside the 0.35s silence gap and
 * never cuts into narration.
 */
function displayAt(t: number): number {
  if (t <= 0) return 0;
  for (let i = 0; i < SCENES.length; i++) {
    const next = SCENES[i + 1];
    if (!next) return SCENES.length - 1;
    // Show the next scene TRANSITION early (still silence).
    if (t < next.start - TRANSITION) return i;
    if (t < next.start) {
      // Gap: first half fades the old out, second half fades the new in.
      const switchAt = next.start - TRANSITION / 2;
      return t < switchAt ? i : i + 1;
    }
    continue;
  }
  return SCENES.length - 1;
}

/** Opacity of the content block at time t (1 during narration, dips in gaps). */
function contentOpacity(t: number): number {
  const i = displayAt(t);
  const s = SCENES[i];
  const lt = t - s.start;
  // Entrance fade over the first 0.35s (overlaps narration start, not a cut).
  const entrance = clamp01(lt / 0.35);
  // If we are showing a scene early (during the previous gap), fade it in
  // over the TRANSITION window before its narration starts.
  if (lt < 0) {
    return clamp01(1 + lt / TRANSITION);
  }
  // Exit fade during the silence gap after this scene.
  const next = SCENES[i + 1];
  if (next) {
    const gapPos = lt - s.duration; // >=0 means we are in the gap
    if (gapPos >= 0) {
      const half = TRANSITION / 2;
      if (gapPos < half) return 1 - gapPos / half;
      return 0; // handed over to the next scene's early fade-in
    }
  }
  return entrance < 1 ? entrance : 1;
}

export default makeScene2D('storyboard', function* (view) {
  const time = useThread().time;

  const display = createComputed(() => displayAt(time()));
  const scene = createComputed(() => SCENES[display()]);
  const accent = createComputed(() => ACCENTS[display() % ACCENTS.length]);
  const hue = createComputed(() => (218 + display() * 32) % 360);

  /** Seconds since the displayed scene's narration starts (negative = early). */
  const local = createComputed(() => time() - scene().start);
  /** 0..1 entrance driven by the narration clock (spring-like). */
  const enter = createComputed(() => clamp01(local() / 0.55));
  const enterBack = createComputed(() => easeOutBack(enter()));
  const enterCubic = createComputed(() => easeOutCubic(enter()));

  const opacity = createComputed(() => contentOpacity(time()));
  const slideX = createComputed(() => (1 - enterCubic()) * 140);
  const scale = createComputed(() => 0.82 + 0.18 * enterBack());

  const headlineSize = createComputed(() => {
    const len = scene().text.length;
    if (len > 42) return 62;
    if (len > 26) return 78;
    return 96;
  });

  const iconBob = createComputed(() => Math.sin(time() * 2.1) * 12);
  const iconPop = createComputed(() => {
    const e = clamp01(local() / 0.5);
    return 0.4 + 0.6 * easeOutBack(e);
  });

  const svgText = createComputed(() => iconSvg(scene().icon, accent()));

  // Stat helpers for the currently displayed scene.
  const stat = createComputed(() => parseStat(scene().text));
  const statFrac = createComputed(() =>
    scene().type === 'stat' ? (stat().value / 100) * enterCubic() : 0,
  );
  const statNum = createComputed(() =>
    scene().type === 'stat' ? String(Math.round(stat().value * enterCubic())) : '',
  );

  // Step helpers.
  const stepN = createComputed(() => STEP_NUM.get(display()) ?? 1);
  const stepShown = createComputed(() =>
    scene().type === 'step' ? Math.max(1, Math.round(stepN() * enterCubic())) : 1,
  );

  // CTA pulse + fake cursor.
  const pulse = createComputed(() => 1 + 0.045 * Math.sin(time() * 5.2));
  const cursorT = createComputed(() => clamp01(local() / 0.9));
  const cursorE = createComputed(() => easeOutCubic(cursorT()));
  const cursorX = createComputed(() => 620 - 620 * cursorE());
  const cursorY = createComputed(() => 380 - 300 * cursorE());
  const clickDip = createComputed(() => {
    const c = cursorT();
    if (c < 0.85 || c >= 1) return 1;
    return 1 - 0.18 * Math.sin(((c - 0.85) / 0.15) * Math.PI);
  });

  const isType = (t: string) => createComputed(() => (scene().type === t ? 1 : 0));

  const showTitle = isType('title');
  const showStep = isType('step');
  const showStat = isType('stat');
  const showCta = isType('cta');

  /* --- background: dark gradient shifting hue per scene ---------------- */
  view.add(
    <Rect
      width={1920}
      height={1080}
      fill={createComputed(
        () =>
          new Gradient({
            type: 'linear',
            from: [-960, -540],
            to: [960, 540],
            stops: [
              {offset: 0, color: `hsl(${hue()}, 48%, 16%)`},
              {offset: 0.55, color: `hsl(${(hue() + 24) % 360}, 42%, 8%)`},
              {offset: 1, color: '#04060b'},
            ],
          }),
      )}
    />,
  );

  /* --- subtle floating shapes (3 nodes, sine drift) -------------------- */
  const drift = (baseX: number, speed: number, amp: number, phase: number) =>
    createComputed(() => baseX + Math.sin(time() * speed + phase) * amp);

  view.add(<Circle x={drift(-700, 0.4, 40, 0)} y={-320} size={420} fill={'#ffffff'} opacity={0.045} />);
  view.add(<Circle x={drift(720, 0.33, 50, 2)} y={330} size={520} fill={'#ffffff'} opacity={0.035} />);
  view.add(
    <Circle
      x={createComputed(() => 480 + Math.sin(time() * 0.5 + 4) * 36)}
      y={createComputed(() => -380 + Math.cos(time() * 0.45 + 1) * 30)}
      size={180}
      fill={accent}
      opacity={0.08}
    />,
  );

  /* --- icon: large, accent color, pop + gentle bob ---------------------- */
  view.add(
    <Node x={-620} y={createComputed(() => -40 + iconBob())} scale={iconPop} opacity={opacity}>
      <SVG svg={svgText} width={240} height={240} />
    </Node>,
  );

  /* --- kinetic headline: spring scale + slide --------------------------- */
  view.add(
    <Node x={slideX} scale={scale} opacity={opacity}>
      <Txt
        text={createComputed(() => scene().text)}
        fill={'#f2f6fd'}
        fontFamily={FONT}
        fontWeight={800}
        fontSize={headlineSize}
        x={120}
        y={-60}
        width={1150}
        textWrap={true}
      />
    </Node>,
  );

  /* --- title: underline wipe -------------------------------------------- */
  view.add(
    <Rect
      width={createComputed(() => 560 * enterCubic())}
      height={10}
      radius={5}
      offset={[-1, 0]}
      x={-440}
      y={110}
      fill={accent}
      opacity={createComputed(() => showTitle() * opacity())}
    />,
  );

  /* --- step: numbered card + progress dots, number counts up ------------ */
  view.add(
    <Node opacity={createComputed(() => showStep() * opacity())}>
      <Rect x={120} y={130} width={980} height={150} radius={24} fill={'rgba(255,255,255,0.07)'} />
      <Rect
        x={120}
        y={130}
        width={980}
        height={150}
        radius={24}
        stroke={accent}
        lineWidth={3}
        fill={'transparent'}
        opacity={0.7}
      />
      <Txt
        text={createComputed(() => `STEP ${stepShown()} / ${STEP_TOTAL}`)}
        fill={accent}
        fontFamily={FONT}
        fontWeight={700}
        fontSize={40}
        x={120}
        y={130}
      />
      <Node x={120} y={225}>
        {Array.from({length: Math.max(1, STEP_TOTAL)}, (_, d) => (
          <Circle
            key={`dot-${d}`}
            x={(d - (Math.max(1, STEP_TOTAL) - 1) / 2) * 56}
            size={22}
            fill={createComputed(() => (d < stepN() ? accent() : 'rgba(255,255,255,0.22)'))}
          />
        ))}
      </Node>
    </Node>,
  );

  /* --- stat: bar that fills + number that counts up --------------------- */
  view.add(
    <Node opacity={createComputed(() => showStat() * opacity())}>
      <Txt
        text={createComputed(() => stat().label)}
        fill={'#c9d4e6'}
        fontFamily={FONT}
        fontWeight={600}
        fontSize={40}
        x={120}
        y={60}
        width={1000}
        textWrap={true}
      />
      <Rect x={-330} y={170} width={900} height={30} radius={15} fill={'rgba(255,255,255,0.12)'} offset={[-1, 0]} />
      <Rect
        width={createComputed(() => 900 * statFrac())}
        height={30}
        radius={15}
        offset={[-1, 0]}
        x={-330}
        y={170}
        fill={accent}
      />
      <Txt text={createComputed(() => `${statNum()}%`)} fill={'#ffffff'} fontFamily={FONT} fontWeight={800} fontSize={84} x={700} y={160} />
    </Node>,
  );

  /* --- cta: pulsing button + fake cursor click -------------------------- */
  view.add(
    <Node opacity={createComputed(() => showCta() * opacity())}>
      <Rect
        x={120}
        y={170}
        width={760}
        height={140}
        radius={70}
        fill={accent}
        scale={createComputed(() => pulse() * clickDip())}
      />
      <Txt
        text={createComputed(() => scene().text)}
        fill={'#0b0f17'}
        fontFamily={FONT}
        fontWeight={800}
        fontSize={52}
        x={120}
        y={170}
        width={700}
        textAlign={'center'}
      />
      <Circle x={cursorX} y={cursorY} size={34} fill={'#ffffff'} stroke={'#0b0f17'} lineWidth={4} />
    </Node>,
  );

  /* --- timeline: one sequence, total == audio length --------------------- */
  yield* waitFor(Math.max(0.5, TOTAL));
});
