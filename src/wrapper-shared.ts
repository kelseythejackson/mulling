import type { MountOptions } from './mount';
import { loaderStates } from './states';

/** Every option a wrapper passes through. Listed explicitly so a prop that goes away is passed as undefined, which unsets it. */
export const OPTION_KEYS = [
  'type',
  'state',
  'states',
  'size',
  'color',
  'speed',
  'label',
  'labels',
  'announce',
  'reducedMotion',
  'paused',
  'maxFps',
  'time',
  'nonce',
] as const satisfies readonly (keyof MountOptions)[];

/** Every key of `map`, undefined where it isn't set. update() merges labels and states, so a removed entry must reset. */
function fullMap(map: Record<string, unknown> | undefined, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = map?.[k];
  return out;
}

/** Picks the loader options out of a props object, with every key present. */
export function pickOptions(props: Partial<MountOptions>): MountOptions {
  const out: Record<string, unknown> = {};
  for (const key of OPTION_KEYS) out[key] = props[key];
  out.labels = fullMap(props.labels, loaderStates);
  out.states = fullMap(props.states, ['thinking', 'searching', 'writing']);
  return out as MountOptions;
}

/** aria-* props go on the loader's labelled element. aria-label and aria-hidden stay the library's: use `label`. */
export const isPassedAria = (key: string) => key.startsWith('aria-') && key !== 'aria-label' && key !== 'aria-hidden';

/** Sets `attrs` on `el`, and removes the ones set last time that are gone now. Returns the names set. */
export function syncAttributes(el: Element, attrs: Record<string, unknown>, previous: readonly string[]): string[] {
  const names: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    el.setAttribute(k, String(v));
    names.push(k);
  }
  for (const k of previous) if (!names.includes(k)) el.removeAttribute(k);
  return names;
}

/** A cheap value comparison for options, so wrappers only call update() when something actually changed. */
export function optionsKey(opts: MountOptions): string {
  return JSON.stringify(opts, (_k, v) => (v === undefined ? '\u0000u' : v === Number.POSITIVE_INFINITY ? '\u0000inf' : v));
}

/** Inline style for the wrapper element: reserves the loader's space before it mounts, so nothing shifts. */
export function reserveSize(size: number | undefined) {
  const px = `${size ?? 20}px`;
  return { display: 'inline-flex', width: px, height: px, verticalAlign: 'middle', lineHeight: '0' };
}

/** Compile-time check: fails to build if a mount() option is missing from OPTION_KEYS, so wrappers never drop one. */
type MissingKeys = Exclude<keyof MountOptions, (typeof OPTION_KEYS)[number]>;
const allOptionsCovered: [MissingKeys] extends [never] ? true : MissingKeys = true;
void allOptionsCovered;
