/**
 * mulling/core: everything except the loaders themselves.
 * Register the loaders you use with `use()`, so your bundle only contains those.
 *
 * ```js
 * import { mount, use } from 'mulling/core';
 * import { coil } from 'mulling/loaders';
 * use(coil);
 * mount(el, { type: 'coil' });
 * ```
 *
 * `done` and `error` endings are part of core. Working states fall back to the first registered loader
 * if their default (breath, murmur, tide) isn't registered; import `stateLoaders` to get all three.
 *
 * @module mulling/core
 */
export { mount, getStats } from './mount';
export type { MountOptions, LoaderHandle, Stats } from './mount';
export { defineElement } from './element';
export type { MullingElement, ThinkingLoaderElement } from './element';
export { use, getLoader, registeredLoaders } from './registry';
export { loaderStates, defaultStateLoaders, defaultStateLabels } from './states';
export type { LoaderState, WorkingState, EndState } from './states';
export { coreCss, cssFor } from './styles';
export type {
  LoaderType,
  BuiltInLoaderType,
  CssLoaderType,
  CanvasLoaderType,
  LoaderDef,
  CssLoaderDef,
  CanvasLoaderDef,
  LoaderInfo,
  Painter,
} from './types';
