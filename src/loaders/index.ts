/**
 * mulling/loaders: the built-in loaders, one per file. Import only the ones you use and pass them to `use()`.
 *
 * ```js
 * import { mount, use } from 'mulling/core';
 * import { coil, tide } from 'mulling/loaders';
 * use(coil, tide);
 * ```
 *
 * Each export is a plain object, so bundlers drop the ones you don't import.
 *
 * @module mulling/loaders
 */
import type { LoaderDef } from '../types';
import { blink } from './blink';
import { breath } from './breath';
import { coil } from './coil';
import { murmur } from './murmur';
import { orbit } from './orbit';
import { pond } from './pond';
import { scribble } from './scribble';
import { tide } from './tide';

export { blink, breath, coil, murmur, orbit, pond, scribble, tide };

/** Every built-in loader, in gallery order. */
export const allLoaders: readonly LoaderDef[] = [breath, orbit, tide, blink, coil, murmur, scribble, pond];

/** The three loaders the working states show by default: thinking → breath, searching → murmur, writing → tide. */
export const stateLoaders: readonly LoaderDef[] = [breath, murmur, tide];
