/**
 * mulling: the complete library, with every built-in loader registered.
 * For a smaller bundle, import from 'mulling/core' and 'mulling/loaders' instead.
 *
 * @module mulling
 */
import { allLoaders } from './loaders';
import { use } from './registry';
import { cssFor } from './styles';

use(...allLoaders);

export * from './core';
export * from './loaders';

/** All styles for every built-in loader, for apps with a strict CSP that ship the CSS themselves. */
export const styles = cssFor(allLoaders);
