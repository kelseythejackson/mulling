import { didYouMean, either, warnOnce } from './options';
import type { LoaderDef, LoaderInfo } from './types';

const registry = new Map<string, LoaderDef>();
const listeners = new Set<(def: LoaderDef) => void>();
const warned = new Set<string>();

const VALID_TYPE = /^[a-z][a-z0-9-]*$/;

/** Throws a clear error for a malformed definition. Messages stay short because they ship in the bundle. */
function check(def: LoaderDef): void {
  const ok =
    def &&
    VALID_TYPE.test(def.type) &&
    (def.tech === 'css'
      ? typeof def.html === 'string' && typeof def.css === 'string' && def.base > 0
      : def.tech === 'canvas' && typeof def.paint === 'function');
  if (!ok) throw new TypeError(`mulling: invalid loader "${def?.type}". See the LoaderDef type for the fields it needs.`);
}

/**
 * Register loaders so `mount()` and `<mulling-status>` can show them. Safe to call more than once;
 * registering a type again replaces the earlier definition, so you can override a built-in.
 *
 * ```js
 * import { use } from 'mulling/core';
 * import { coil } from 'mulling/loaders';
 * use(coil, myCustomLoader);
 * ```
 */
export function use(...defs: LoaderDef[]): void {
  for (const def of defs) {
    check(def);
    // Loaders written before 1.0 used the old "tl" names. They still work until 2.0.
    if (def.tech === 'css' && (/\btl-a\b/.test(def.html) || /--tl-(c|dur)\b/.test(def.css)))
      warnOnce(
        'custom loaders now use the mulling-animate class, --mulling-color and --mulling-duration. tl-a, --tl-c and --tl-dur work until 2.0.',
      );
    if (registry.get(def.type) === def) continue;
    registry.set(def.type, def);
    warned.delete(def.type);
    listeners.forEach((fn) => fn(def));
  }
}

/** The definition registered for `type`, if any. */
export function getLoader(type: string): LoaderDef | undefined {
  return registry.get(type);
}

/** Every registered loader, in the order they were registered. */
export function registeredLoaders(): LoaderInfo[] {
  return [...registry.values()].map(({ type, name, tech, description, reducedMotion }) => ({
    type,
    name,
    tech,
    description,
    reducedMotion,
  }));
}

/** Internal: called when a loader is registered (mounted loaders waiting for it can then switch to it). */
export function onRegister(fn: (def: LoaderDef) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Internal: the loader to draw for `type`. If it isn't registered, warns once and falls back to the first
 * registered loader, so a missing import shows something instead of nothing. Undefined if none are registered.
 */
export function resolveLoader(type: string): LoaderDef | undefined {
  const found = registry.get(type);
  if (found) return found;
  const fallback = registry.values().next().value as LoaderDef | undefined;
  if (!warned.has(type)) {
    warned.add(type);
    const known = [...registry.keys()];
    // A typo gets "did you mean"; a real loader that wasn't imported gets the fix and the loaders available.
    const hint =
      didYouMean(type, known) ||
      ` Import it and pass it to use()${known.length ? `, or use one that's registered: ${either(known)}` : ''}.`;
    console.warn(`mulling: "${type}" isn't registered.${hint}${fallback ? ` Showing "${fallback.type}".` : ''}`);
  }
  return fallback;
}
