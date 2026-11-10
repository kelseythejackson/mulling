/**
 * One requestAnimationFrame loop for every animating canvas loader.
 *
 * - Skips loaders that are off-screen or in a hidden tab, and caps each loader's frame rate.
 * - Runs only while at least one loader can be seen: when none can, it stops completely and is restarted
 *   by the IntersectionObserver (a loader scrolls into view), visibilitychange (the tab comes back) or a new loader.
 * - A painter that throws is reported once and removed; it never stops the other loaders.
 * - Loaders removed from the page without destroy() are dropped after a while, and revived if they come back.
 */
export interface LoopJob {
  /** Seconds between draws. 0 means every frame. */
  interval: number;
  /** Called with the seconds elapsed since this job last drew. */
  step(elapsed: number): void;
  /** Loader name, for error messages. */
  name: string;
}

interface Entry {
  job: LoopJob;
  canvas: HTMLCanvasElement;
  visible: boolean;
  acc: number;
  /** Seconds spent out of the page (removed from the DOM without destroy()). */
  detached: number;
}

const entries = new Map<LoopJob, Entry>();
/** Every entry ever observed, including ones dropped for being detached, so they can be revived. */
const byCanvas = new WeakMap<Element, Entry>();
const broken = new WeakSet<LoopJob>();
let rafId = 0;
let lastTime = 0;
let lastDrawn = 0;
let lastFrameMs = 0;
let observer: IntersectionObserver | null = null;
let sweepTimer: ReturnType<typeof setTimeout> | null = null;
let watchingVisibility = false;

/** Allow a little slack so a 30fps cap on a 60Hz screen draws every second frame, not every third. */
const SLACK = 0.004;
/** How long a loader can be out of the page before the loop forgets it. */
const DETACHED_LIMIT = 30;

/** True when enough time has built up for a job with this interval to draw again. Exported for tests. */
export function due(acc: number, interval: number): boolean {
  return interval <= 0 || acc + SLACK >= interval;
}

const canDraw = (e: Entry) => e.visible && e.canvas.isConnected;
const anyDrawable = () => {
  if (typeof document !== 'undefined' && document.hidden) return false;
  for (const e of entries.values()) if (canDraw(e)) return true;
  return false;
};

function ensureRunning(): void {
  if (rafId || typeof requestAnimationFrame === 'undefined') return;
  if (!anyDrawable()) {
    lastDrawn = 0;
    scheduleSweep();
    return;
  }
  rafId = requestAnimationFrame(tick);
}

/** While the loop is idle, still forget loaders that were removed from the page, so they don't pile up. */
function scheduleSweep(): void {
  if (sweepTimer !== null || entries.size === 0) return;
  sweepTimer = setTimeout(() => {
    sweepTimer = null;
    for (const e of entries.values()) {
      if (!e.canvas.isConnected) entries.delete(e.job);
    }
    if (entries.size) scheduleSweep();
  }, DETACHED_LIMIT * 1000);
}

function tick(now: number): void {
  rafId = 0;
  const dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0;
  lastTime = now;
  let drawn = 0;
  const start = performance.now();

  for (const e of entries.values()) {
    if (!e.canvas.isConnected) {
      e.detached += dt;
      if (e.detached > DETACHED_LIMIT) entries.delete(e.job);
      continue;
    }
    e.detached = 0;
    if (!e.visible) continue;
    e.acc += dt;
    if (!due(e.acc, e.job.interval)) continue;
    try {
      e.job.step(Math.min(e.acc, 0.1)); // first draw starts with acc = Infinity
    } catch (err) {
      broken.add(e.job);
      entries.delete(e.job);
      console.error(`mulling: the "${e.job.name}" loader threw while drawing and was stopped. Other loaders keep running.`, err);
    }
    e.acc = 0;
    drawn++;
  }

  lastDrawn = drawn;
  if (drawn) lastFrameMs = performance.now() - start;
  if (anyDrawable()) rafId = requestAnimationFrame(tick);
  else {
    lastTime = 0;
    lastDrawn = 0;
    scheduleSweep();
  }
}

function watchVisibility(): void {
  if (watchingVisibility || typeof document === 'undefined') return;
  watchingVisibility = true;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ensureRunning();
  });
}

export function addToLoop(job: LoopJob, canvas: HTMLCanvasElement): void {
  if (entries.has(job) || broken.has(job)) return;
  const existing = byCanvas.get(canvas);
  const entry: Entry =
    existing && existing.job === job ? existing : { job, canvas, visible: false, acc: Number.POSITIVE_INFINITY, detached: 0 };
  entry.detached = 0;
  entries.set(job, entry);
  watchVisibility();

  if (typeof IntersectionObserver !== 'undefined') {
    observer ??= new IntersectionObserver((list) => {
      for (const o of list) {
        const found = byCanvas.get(o.target);
        if (!found) continue;
        found.visible = o.isIntersecting;
        // A loader dropped while detached is revived when it shows up again.
        if (o.isIntersecting && !entries.has(found.job) && !broken.has(found.job)) entries.set(found.job, found);
      }
      ensureRunning();
    });
    if (!existing) observer.observe(canvas);
    byCanvas.set(canvas, entry);
  } else {
    entry.visible = true;
  }
  ensureRunning();
}

export function removeFromLoop(job: LoopJob, canvas: HTMLCanvasElement): void {
  entries.delete(job);
  const e = byCanvas.get(canvas);
  if (e && e.job === job) {
    observer?.unobserve(canvas);
    byCanvas.delete(canvas);
  }
}

export interface Stats {
  /** Canvas loaders currently animating (calm, paused and frozen loaders draw once and are not counted). */
  canvasLoaders: number;
  /** How many of them drew on the last frame. Off-screen loaders, hidden tabs and frame-rate caps lower this. */
  drawing: number;
  /** Milliseconds spent drawing on the last frame that drew anything. */
  frameMs: number;
}

/** Live numbers from the shared loop. Useful for demos, debugging and performance tests. */
export function getStats(): Stats {
  return { canvasLoaders: entries.size, drawing: lastDrawn, frameMs: lastFrameMs };
}
