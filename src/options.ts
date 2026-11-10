import { loaderStates } from './states';
import type { MountOptions } from './mount';

/** Options after defaults and validation. */
export type Resolved = Required<Pick<MountOptions, 'type' | 'size' | 'color' | 'speed' | 'reducedMotion' | 'announce' | 'paused'>> &
  Omit<MountOptions, 'type' | 'size' | 'color' | 'speed' | 'reducedMotion' | 'announce' | 'paused'>;

export const DEFAULTS: Resolved = {
  type: 'breath',
  size: 20,
  color: 'currentColor',
  speed: 1,
  reducedMotion: 'auto',
  announce: 'polite',
  paused: false,
};

/** Largest size accepted, in CSS pixels. A loader is an icon; this stops a typo allocating a giant canvas. */
export const MAX_SIZE = 1024;

const NAME = /^[a-z][a-z0-9-]*$/;
const warned = new Set<string>();

/** Warns once per distinct message, so a bad value in a re-rendering component doesn't flood the console. */
export function warnOnce(message: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`mulling: ${message}`);
}

const show = (v: unknown) => (typeof v === 'string' ? `"${v}"` : String(v));

/** "a, b or c". */
export const either = (list: readonly string[]) => `${list.slice(0, -1).join(', ')} or ${list[list.length - 1]}`;

/** Edit distance, for "did you mean". Inputs are short option values, so the simple version is fine. */
function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

/** ` Did you mean "x"?` for a near miss (a typo or wrong case), or ''. */
export function didYouMean(value: unknown, options: readonly string[]): string {
  if (typeof value !== 'string') return '';
  const v = value.toLowerCase();
  const near = options.find((o) => o === v) ?? options.find((o) => distance(v, o) <= 2);
  return near ? ` Did you mean "${near}"?` : '';
}

/** Set while an element's attributes are read, so messages name the element and attribute the user wrote. */
let source: string | undefined;

/** Runs `fn` with messages phrased for the element `tag`'s attributes. */
export function fromElement<T>(tag: string, fn: () => T): T {
  source = tag;
  try {
    return fn();
  } finally {
    source = undefined;
  }
}

/** The attribute for an option: reducedMotion → reduced-motion, labels.done → label-done, states.writing → loader-writing. */
const attribute = (name: string) =>
  name
    .replace(/^labels\./, 'label-')
    .replace(/^states\./, 'loader-')
    .replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * One consistent warning for every invalid option: what was wrong, what to write instead, and what is shown.
 * Messages ship in the bundle, so they stay short.
 */
const bad = (name: string, value: unknown, fallback: string, hint = '') => {
  const what = source ? `<${source} ${attribute(name)}=${show(String(value))}> is invalid` : `invalid ${name} ${show(value)}`;
  const text = hint ? `${what}: ${hint}` : what;
  warnOnce(`${text}${text.endsWith('?') ? '' : '.'} Using ${fallback}.`);
};

/** True if browsers accept `v` as a color. Without CSS.supports (some test DOMs), any text is accepted. */
const isColor = (v: string) => v === 'currentColor' || typeof CSS === 'undefined' || !CSS.supports || CSS.supports('color', v);

const positive = (v: unknown): v is number => typeof v === 'number' && v > 0;

/** Accepts true/false/'auto', and the strings 'true', 'false' and '' that HTML attributes and templates produce. */
function readBoolish(v: unknown): boolean | 'auto' | undefined {
  if (v === true || v === false || v === 'auto') return v;
  if (v === 'true' || v === '') return true;
  if (v === 'false') return false;
  return undefined;
}

/** Keeps the entries of a labels/states object whose key and value are valid; warns about the rest. */
function cleanMap(v: unknown, keys: readonly string[], ok: (x: unknown) => boolean, name: string): Record<string, string> | undefined {
  if (v == null || typeof v !== 'object') {
    if (v != null) bad(name, v, 'the defaults', 'use an object');
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [k, x] of Object.entries(v)) {
    if (x === undefined) continue; // undefined means "back to the default"
    if (keys.includes(k) && ok(x)) out[k] = x as string;
    else bad(`${name}.${k}`, x, 'the default', keys.includes(k) ? '' : `keys are ${either(keys)}`);
  }
  return out;
}

/**
 * Merges and validates options. Rules:
 * - `labels` and `states` merge key by key; every other option is replaced.
 * - `undefined` means "use the default" for options that have one, and "unset" for the rest.
 * - An invalid value warns once and is replaced by the default (or unset), so a bad prop never breaks
 *   or blanks a loader.
 */
export function merge(base: Resolved, next: Partial<MountOptions>): Resolved {
  const o = { ...base, ...next } as Resolved;
  const raw = o as Record<string, unknown>;
  // labels and states merge key by key, so update({ labels: { error: '…' } }) keeps the other labels.
  // A key set to undefined goes back to its default; the whole option set to undefined resets them all.
  for (const key of ['labels', 'states'] as const) {
    const n = next[key];
    if (n && typeof n === 'object' && base[key]) raw[key] = { ...base[key], ...n };
  }
  const check = <K extends keyof Resolved>(key: K, valid: boolean, fallback: Resolved[K], hint = '', label = String(fallback)) => {
    if (valid) return;
    if (raw[key] !== undefined) bad(key, raw[key], label, hint);
    o[key] = fallback;
  };
  const pixels = 'use a number of pixels, like 24';

  check('type', typeof raw.type === 'string' && NAME.test(raw.type), DEFAULTS.type, 'use a loader name, like orbit');
  check(
    'state',
    raw.state === undefined || (loaderStates as readonly unknown[]).includes(raw.state),
    undefined,
    `use ${either(loaderStates)}.${didYouMean(raw.state, loaderStates)}`.replace(/\.$/, ''),
    'no state',
  );
  check('size', positive(raw.size) && Number.isFinite(raw.size), DEFAULTS.size, pixels);
  if (o.size > MAX_SIZE) check('size', false, MAX_SIZE, `the largest is ${MAX_SIZE}`);
  check('speed', positive(raw.speed) && Number.isFinite(raw.speed), DEFAULTS.speed, 'use a positive number, like 1.5');
  check(
    'color',
    typeof raw.color === 'string' && raw.color.trim() !== '' && isColor(raw.color),
    DEFAULTS.color,
    'use a CSS color, like #6366f1 or var(--brand)',
  );
  check('announce', raw.announce === 'polite' || raw.announce === 'off', DEFAULTS.announce, 'use polite or off');
  check('maxFps', raw.maxFps === undefined || positive(raw.maxFps), undefined, 'use a positive number', 'the default cap');
  check(
    'time',
    raw.time === undefined || (typeof raw.time === 'number' && Number.isFinite(raw.time)),
    undefined,
    'use a number of seconds',
    'no freeze',
  );

  const rm = readBoolish(raw.reducedMotion);
  check('reducedMotion', rm !== undefined, 'auto', 'use auto, true or false');
  if (rm !== undefined) o.reducedMotion = rm;
  o.paused = readBoolish(raw.paused) === true;

  // An empty label is never useful as an accessible name: use the default words instead.
  check('label', raw.label == null || (typeof raw.label === 'string' && raw.label !== ''), undefined, '', 'the default');
  if (raw.label === '') o.label = undefined;

  o.labels = cleanMap(raw.labels, loaderStates, (x) => typeof x === 'string' && x !== '', 'labels');
  o.states = cleanMap(
    raw.states,
    ['thinking', 'searching', 'writing'],
    (x) => typeof x === 'string' && NAME.test(x),
    'states',
  ) as Resolved['states'];
  return o;
}
