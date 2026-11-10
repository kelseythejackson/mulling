import { announce, cancelAnnouncement } from './announcer';
import { pickEyeColor, toRgb } from './color';
import { forcedColors, onEnvChange, pixelRatio, prefersReducedMotion, type EnvChange } from './env';
import { DEFAULTS, merge, warnOnce, type Resolved } from './options';
import { addToLoop, removeFromLoop, type LoopJob } from './loop';
import { onRegister, resolveLoader } from './registry';
import {
  defaultStateLabels,
  defaultStateLoaders,
  endMarks,
  isEndState,
  type EndState,
  type LoaderState,
  type WorkingState,
} from './states';
import { ensureLoaderStyles, ensureStyles } from './styles';
import type { CanvasLoaderDef, CssLoaderDef, LoaderDef, LoaderType } from './types';

export { getStats } from './loop';
export type { Stats } from './loop';

export interface MountOptions {
  /** Which loader to show when no `state` is set. Default `'breath'`. */
  type?: LoaderType;
  /**
   * What the AI is doing: `'thinking'`, `'searching'`, `'writing'`, `'done'` or `'error'`.
   * Each working state shows a loader (see `states`); `done` and `error` play a short ending and hold still.
   * Changing state cross-fades from the old loader to the new one. Overrides `type` while set.
   */
  state?: LoaderState;
  /** Choose the loader for each working state. Defaults: thinking → breath, searching → murmur, writing → tide. */
  states?: Partial<Record<WorkingState, LoaderType>>;
  /** Width and height in CSS pixels, from just above 0 up to 1024. Default `20`. */
  size?: number;
  /**
   * Any CSS color, including `var(--brand)`, `oklch()` and `color-mix()`. Default `'currentColor'`, so it
   * matches the surrounding text. Ignored in forced-colors mode, where system colors are used.
   */
  color?: string;
  /** Speed multiplier, above 0. `1` is normal, `2` is twice as fast. Default `1`. To stop, use `paused`. */
  speed?: number;
  /**
   * Stop the animation where it is (`true`), or let it run (`false`, the default). Lets apps offer a
   * pause control, which WCAG 2.2.2 expects for animation that runs longer than 5 seconds.
   */
  paused?: boolean;
  /**
   * What screen readers hear when no `state` is set. Default `'Loading'`.
   * Pass `null` when visible text next to the loader already says what is happening;
   * the loader is then hidden from assistive technology, whatever its state.
   */
  label?: string | null;
  /** What screen readers hear in each state. Defaults: Thinking, Searching, Writing, Done, Something went wrong. */
  labels?: Partial<Record<LoaderState, string>>;
  /**
   * How changes reach screen readers.
   * - `'polite'` (default): spoken through one shared, debounced live region for the page (or for the open
   *   modal dialog the loader is in), so several loaders, or fast state changes, don't talk over each other.
   *   The loader itself is a labelled image.
   * - `'off'`: the shared region isn't used. The loader is its own `role="status"` element containing its
   *   words as hidden text, so screen readers speak them when they change.
   */
  announce?: 'off' | 'polite';
  /**
   * `'auto'` (default) follows the user's system setting and reacts when it changes.
   * `true` forces the calm, motion-free version; `false` always animates.
   */
  reducedMotion?: 'auto' | boolean;
  /**
   * Most frames per second a canvas loader draws. Default `30` for loaders 32px or smaller,
   * where extra frames aren't visible, and unlimited above that. Pass `Infinity` to remove the cap.
   */
  maxFps?: number;
  /**
   * Freeze the loader at this many seconds into its animation. Gives the same picture every time,
   * for screenshot tests, static previews and server-rendered placeholders. Leave unset to animate.
   */
  time?: number;
  /**
   * Nonce for injected `<style>` tags, for pages with a strict Content Security Policy. Remembered for every
   * tag added later. If no loader is given one, the nonce of `<meta property="csp-nonce">` is used.
   */
  nonce?: string;
}

export interface LoaderHandle {
  /** The element the loader was rendered into. */
  readonly element: HTMLElement;
  /**
   * Change any option without remounting. Changing `state` or `type` cross-fades to the new loader.
   * `labels` and `states` merge key by key; set a key to `undefined` to restore its default.
   */
  update(options: Partial<MountOptions>): void;
  /**
   * Re-read colors from the page. Theme changes on `<html>` or `<body>`, color-scheme changes and
   * forced-colors changes are picked up automatically; call this after other changes that affect `currentColor`.
   */
  refresh(): void;
  /** Stop the loader and remove everything it added. */
  destroy(): void;
}

/** How long the old loader takes to fade out when the state changes. Matches `.mulling-layer` in the styles. */
const CROSSFADE_MS = 200;

/** What is drawn: a looping loader or one of the endings. */
type Visual = { kind: 'loader'; type: LoaderType } | { kind: 'mark'; state: EndState };

/** Exported for tests: the visual a set of options produces. */
export function resolveVisual(opts: Pick<MountOptions, 'type' | 'state' | 'states'>): Visual {
  const state = opts.state;
  if (state && isEndState(state)) return { kind: 'mark', state };
  if (state) return { kind: 'loader', type: opts.states?.[state] ?? defaultStateLoaders[state] };
  return { kind: 'loader', type: opts.type ?? 'breath' };
}

/** Exported for tests: what screen readers should hear, or null for a decorative loader. */
export function resolveLabel(opts: Pick<MountOptions, 'label' | 'labels' | 'state'>): string | null {
  if (opts.label === null) return null;
  if (opts.state) return opts.labels?.[opts.state] ?? defaultStateLabels[opts.state];
  return opts.label ?? 'Loading';
}

const sameVisual = (a: Visual, b: Visual) =>
  a.kind === b.kind && (a.kind === 'loader' ? a.type === (b as typeof a).type : a.state === (b as typeof a).state);

/** Frame-rate cap: small loaders gain nothing from more than 30 frames a second. */
function frameInterval(opts: Resolved): number {
  const fps = opts.maxFps ?? (opts.size <= 32 ? 30 : Number.POSITIVE_INFINITY);
  return fps > 0 && Number.isFinite(fps) ? 1 / fps : 0;
}

/** Pause every CSS animation under `el` at `seconds`, or resume them when `seconds` is undefined. */
function freezeAnimations(el: Element, seconds: number | undefined): void {
  if (typeof el.getAnimations !== 'function') return;
  for (const a of el.getAnimations({ subtree: true })) {
    if (seconds === undefined) {
      if (a.playState === 'paused') a.play();
    } else {
      a.pause();
      a.currentTime = seconds * 1000;
    }
  }
}

/** The document timeline's current time in ms, or null where there is none (old browsers, test DOMs). */
function timelineNow(doc: Document): number | null {
  const t = doc.timeline?.currentTime;
  return typeof t === 'number' ? t : null;
}

/** One drawn loader or ending. Replaced, with a cross-fade, when the state or type changes. */
interface Layer {
  el: HTMLElement;
  visual: Visual;
  /** The registered definition actually drawn (may be a fallback), or null for endings and empty layers. */
  def: LoaderDef | null;
  apply(change?: EnvChange): void;
  teardown(): void;
}

/**
 * Render a loader into `target`.
 *
 * ```js
 * const loader = mount(document.querySelector('#status'), { state: 'thinking' });
 * loader.update({ state: 'searching' });
 * loader.update({ state: 'done' });
 * ```
 */
export function mount(target: HTMLElement | ShadowRoot, options: MountOptions = {}): LoaderHandle {
  if (!target || typeof (target as Node).appendChild !== 'function') {
    throw new TypeError(`mulling: mount() needs an element to render into, but got ${target === null ? 'null' : typeof target}.`);
  }
  let opts: Resolved = merge(DEFAULTS, options);
  const doc = target.ownerDocument as Document;

  const host = doc.createElement('span');
  host.className = 'mulling-host';
  // Words for screen readers when announce is 'off': live regions speak content changes, not aria-label changes.
  const words = doc.createElement('span');
  words.style.cssText =
    'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap';
  host.appendChild(words);
  target.appendChild(host);

  /**
   * Makes sure the loader's document or shadow root has the stylesheet. Run on mount, update and refresh,
   * so styles removed by a page-swap tool come back. Returns false while the loader isn't on a page yet.
   */
  const syncStyles = (): boolean => {
    const root = host.getRootNode();
    // A shadow root (nodeType 11) gets the shared stylesheet; a document gets a <style> tag.
    if (root.nodeType === 11 || root.nodeType === 9) ensureStyles(root as ShadowRoot | Document, opts.nonce);
    else ensureStyles(doc, opts.nonce); // detached for now: style the document, and check again once attached
    return root.nodeType === 11 || root.nodeType === 9;
  };

  const owner = {}; // identifies this loader to the shared announcer
  let current: Layer | null = null;
  const leaving = new Set<{ layer: Layer; timer: ReturnType<typeof setTimeout> }>();
  let spoken: string | null = null;
  let destroyed = false;

  const reduced = () => (opts.reducedMotion === 'auto' ? prefersReducedMotion() : opts.reducedMotion);

  function applyCommon(): void {
    host.style.setProperty('--mulling-size', `${opts.size}px`);
    host.style.setProperty('--mulling-set-color', opts.color);
    // The host carries the color, so canvas loaders can read it back resolved: var(), oklch() and the rest work.
    // In forced-colors mode the stylesheet's system color must win, so no inline color is set.
    if (opts.color === 'currentColor' || forcedColors()) host.style.removeProperty('color');
    else host.style.color = opts.color;
    host.classList.toggle('mulling-paused', opts.paused);
    const label = resolveLabel(opts);

    if (label === null) {
      host.removeAttribute('role');
      host.removeAttribute('aria-label');
      host.setAttribute('aria-hidden', 'true');
      words.textContent = '';
    } else if (opts.announce === 'polite') {
      // Spoken through the shared announcer; the element itself is a static, labelled image.
      host.setAttribute('role', 'img');
      host.setAttribute('aria-label', label);
      host.removeAttribute('aria-hidden');
      words.textContent = '';
    } else {
      // Its own live region, with real text inside so changes are spoken.
      host.setAttribute('role', 'status');
      host.removeAttribute('aria-label');
      host.removeAttribute('aria-hidden');
      words.textContent = label;
    }

    if (opts.announce === 'polite' && label !== null && label !== spoken) announce(owner, label, host, opts.state === 'error');
    if (label === null || opts.announce === 'off') cancelAnnouncement(owner);
    spoken = opts.announce === 'polite' ? label : null;
  }

  /** Freezes or resumes CSS animations in a layer, following the `time` option. */
  function freezer(el: HTMLElement) {
    let frozenAt: number | undefined;
    return () => {
      if (opts.time !== undefined || frozenAt !== undefined) {
        freezeAnimations(el, opts.time);
        frozenAt = opts.time;
      }
    };
  }

  function cssLayer(el: HTMLElement, html: string, base: number, contrastVar?: string): Omit<Layer, 'el' | 'visual' | 'def'> {
    el.setAttribute('aria-hidden', 'true');
    const wrap = doc.createElement('span');
    wrap.className = 'mulling-wrap';
    wrap.innerHTML = html;
    el.appendChild(wrap);
    const syncFreeze = freezer(el);
    const born = timelineNow(doc);

    /**
     * Browsers restart CSS animations when an element is moved. Put any that restarted back on the clock
     * they started with, so a moved loader carries on where it was instead of jumping back to the start.
     */
    const keepClock = () => {
      const now = timelineNow(doc);
      if (born === null || now === null || opts.time !== undefined || typeof el.getAnimations !== 'function') return;
      const elapsed = now - born;
      for (const a of el.getAnimations({ subtree: true })) {
        if ('transitionProperty' in a || a.playState === 'paused') continue; // the cross-fade, or paused on purpose
        // A restarted animation hasn't started playing yet, so set its current time rather than its start time.
        if (Number(a.currentTime ?? 0) < elapsed - 50) a.currentTime = elapsed;
      }
    };

    const setContrast = (name: string) => {
      // Read the color the loader actually renders with (the host carries it), normalize it to rgb,
      // then pick white or near-black to contrast with it.
      wrap.style.setProperty(name, pickEyeColor(toRgb(getComputedStyle(host).color, doc)));
    };

    return {
      apply(change) {
        if (change === 'dpr') return; // CSS is resolution-independent
        const duration = `${base / opts.speed}s`;
        wrap.style.setProperty('--mulling-duration', duration);
        wrap.style.setProperty('--tl-dur', duration); // read by custom loaders written before 1.0
        wrap.classList.toggle('mulling-reduced', reduced());
        if (contrastVar) setContrast(contrastVar);
        syncFreeze();
        if (change === 'theme') keepClock();
      },
      teardown() {},
    };
  }

  function canvasLayer(el: HTMLElement, def: CanvasLoaderDef): Omit<Layer, 'el' | 'visual' | 'def'> {
    const paint = def.paint;
    el.setAttribute('aria-hidden', 'true');
    const canvas = doc.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    el.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const syncFreeze = freezer(el);
    let dpr = 1;
    let color = '';
    let t = 0;

    const resize = () => {
      dpr = pixelRatio();
      const px = Math.round(opts.size * dpr);
      if (canvas.width !== px) canvas.width = px; // setting width clears the canvas, so only when it changes
      if (canvas.height !== px) canvas.height = px;
    };
    // Always read the resolved color from the host: a canvas can't resolve var() or currentColor itself.
    const resolveColor = () => {
      color = getComputedStyle(host).color || '#000';
    };
    const draw = (at: number) => {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, opts.size, opts.size);
      ctx.globalAlpha = 1;
      paint(ctx, opts.size, at, color);
    };
    const job: LoopJob = {
      interval: 0,
      name: def.type,
      step(elapsed) {
        t += elapsed * opts.speed;
        draw(t);
      },
    };

    return {
      apply(change) {
        if (change === undefined || change === 'dpr') resize();
        if (change !== 'dpr') resolveColor();
        job.interval = frameInterval(opts);
        const calm = reduced();
        canvas.classList.toggle('mulling-calm', calm);
        if (calm || opts.time !== undefined || opts.paused) {
          // Still picture: draw once and leave the loop. A calm loader fades through CSS instead;
          // a paused one stays exactly where it stopped.
          removeFromLoop(job, canvas);
          try {
            draw(opts.time ?? (opts.paused && !calm ? t : 0.9));
          } catch (err) {
            console.error(`mulling: the "${def.type}" loader threw while drawing.`, err);
          }
        } else {
          addToLoop(job, canvas);
          if (change === 'theme' || change === 'dpr') draw(t);
        }
        syncFreeze();
      },
      teardown: () => removeFromLoop(job, canvas),
    };
  }

  function createLayer(visual: Visual): Layer {
    const el = doc.createElement('span');
    el.className = 'mulling-layer';
    if (visual.kind === 'mark') return { el, visual, def: null, ...cssLayer(el, endMarks[visual.state], 1) };

    const def = resolveLoader(visual.type);
    if (!def) return { el, visual, def: null, apply() {}, teardown() {} }; // nothing registered yet
    if (def.tech === 'canvas') return { el, visual, def, ...canvasLayer(el, def) };
    const css = def as CssLoaderDef;
    ensureLoaderStyles(css);
    return { el, visual, def, ...cssLayer(el, css.html, css.base, css.contrastVar) };
  }

  function removeLayer(layer: Layer): void {
    layer.teardown();
    layer.el.remove();
  }

  /** Shows `visual`, cross-fading from whatever was there. Frozen (`time`) loaders swap instantly. */
  function show(visual: Visual): void {
    const next = createLayer(visual);
    const prev = current;
    current = next;
    const fade = prev !== null && opts.time === undefined && typeof requestAnimationFrame !== 'undefined';

    if (fade) next.el.classList.add('mulling-in');
    host.appendChild(next.el);
    next.apply();

    if (!prev) return;
    if (!fade) {
      removeLayer(prev);
      return;
    }
    requestAnimationFrame(() => next.el.classList.remove('mulling-in'));
    prev.el.classList.add('mulling-out');
    const entry = {
      layer: prev,
      timer: setTimeout(() => {
        removeLayer(prev);
        leaving.delete(entry);
      }, CROSSFADE_MS + 50),
    };
    leaving.add(entry);
  }

  const unsubscribe = onEnvChange((change) => {
    if (change === 'theme') applyCommon(); // forced-colors mode changes whether the host carries the color
    current?.apply(change);
  });
  // If the loader we want is registered (or replaced) after mounting, switch to it.
  const unregister = onRegister((def) => {
    if (
      current?.visual.kind === 'loader' &&
      current.def !== resolveLoader(current.visual.type) &&
      resolveLoader(current.visual.type) === def
    ) {
      show(current.visual);
    }
  });

  // Styles first: the `time` option freezes animations as the first layer appears, so they must exist by then.
  const attached = syncStyles();
  applyCommon();
  show(resolveVisual(opts));
  if (!attached) waitUntilAttached();

  /**
   * A loader mounted into a detached element (common when building UI before inserting it) can't know which
   * document or shadow root it will end up in. Check once a frame, for up to about ten seconds, then style
   * that root and read colors again. update() and refresh() also check, after that.
   */
  function waitUntilAttached(): void {
    if (typeof requestAnimationFrame === 'undefined') return;
    let frames = 0;
    const check = () => {
      if (destroyed) return;
      if (host.isConnected) {
        syncStyles();
        applyCommon();
        current?.apply('theme');
      } else if (++frames < 600) requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }

  const afterDestroy = (what: string) => warnOnce(`${what}() was called on a loader after destroy(); ignoring it.`);

  return {
    element: host,
    update(next) {
      if (destroyed) return afterDestroy('update');
      opts = merge(opts, next);
      syncStyles();
      applyCommon();
      const visual = resolveVisual(opts);
      if (current && sameVisual(current.visual, visual)) current.apply();
      else show(visual);
    },
    refresh() {
      if (destroyed) return afterDestroy('refresh');
      syncStyles();
      applyCommon();
      current?.apply('theme');
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const entry of leaving) {
        clearTimeout(entry.timer);
        removeLayer(entry.layer);
      }
      leaving.clear();
      if (current) removeLayer(current);
      current = null;
      // An ending ("Done", "Something went wrong") is still spoken if the loader is removed right after it:
      // swapping the loader for the answer is the common pattern. Anything else is dropped.
      if (!(opts.state && isEndState(opts.state))) cancelAnnouncement(owner);
      unsubscribe();
      unregister();
      host.remove();
    },
  };
}
