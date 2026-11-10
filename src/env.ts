/**
 * Shared watchers for the things that change how loaders draw: the reduced-motion setting,
 * the theme (light/dark, forced colors, theme classes on <html> or <body>) and the screen's pixel density.
 * Each watcher is created once, on first use, however many loaders are on the page.
 */
export type EnvChange = 'motion' | 'theme' | 'dpr';
type Listener = (change: EnvChange) => void;

const listeners = new Set<Listener>();
let started = false;
let motionQuery: MediaQueryList | null = null;
let forcedQuery: MediaQueryList | null = null;

const emit = (change: EnvChange) => listeners.forEach((fn) => fn(change));
const hasWindow = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

function watchDpr(): void {
  // A resolution query only matches one density, so re-arm it each time the density changes.
  const q = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  const onChange = () => {
    q.removeEventListener?.('change', onChange);
    emit('dpr');
    watchDpr();
  };
  q.addEventListener?.('change', onChange);
}

function start(): void {
  if (started || !hasWindow()) return;
  started = true;
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener?.('change', () => emit('motion'));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => emit('theme'));
  forcedQuery = window.matchMedia('(forced-colors: active)');
  forcedQuery.addEventListener?.('change', () => emit('theme'));
  watchDpr();

  // Most apps switch themes by changing a class or data attribute on <html> or <body>. Page-swap tools
  // (Turbo, htmx boosting and others) replace <body>, and a script in <head> runs before it exists, so
  // <html>'s children are watched too and whichever <body> is current gets observed.
  if (typeof MutationObserver !== 'undefined') {
    const opts = { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-mode', 'data-color-scheme'] };
    let watchedBody: HTMLElement | null = null;
    const watchBody = () => {
      const body = document.body;
      if (body === watchedBody) return false;
      bodyObserver.disconnect();
      watchedBody = body;
      if (body) bodyObserver.observe(body, opts);
      return true;
    };
    const bodyObserver = new MutationObserver(() => emit('theme'));
    new MutationObserver((records) => {
      const bodySwapped = records.some((r) => r.type === 'childList') && watchBody();
      if (bodySwapped || records.some((r) => r.type === 'attributes')) emit('theme');
    }).observe(document.documentElement, { ...opts, childList: true });
    watchBody();
  }

  // A theme that fades its text color reports the change at the start of the fade. Read colors again when
  // a color transition on <html> or <body> ends, so canvas loaders don't keep the old color.
  const onTransitionEnd = (e: TransitionEvent) => {
    const t = e.target;
    if ((t === document.documentElement || t === document.body) && e.propertyName === 'color') emit('theme');
  };
  document.addEventListener('transitionend', onTransitionEnd);
  document.addEventListener('transitioncancel', onTransitionEnd);
}

export function onEnvChange(fn: Listener): () => void {
  start();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function prefersReducedMotion(): boolean {
  start();
  return motionQuery?.matches ?? false;
}

export function forcedColors(): boolean {
  start();
  return forcedQuery?.matches ?? false;
}

export function pixelRatio(): number {
  return typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
}
