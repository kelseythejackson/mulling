import { describe, expect, it } from 'vitest';

/**
 * The public API of every entry point, frozen at 1.0.
 *
 * If this test fails, an export was added, removed or renamed. Under semver:
 * - removing or renaming an export is a breaking change, and needs a major version;
 * - adding one is fine in a minor version: add it to the list below in the same pull request.
 */
const API: Record<string, string[]> = {
  mulling: [
    'allLoaders',
    'blink',
    'breath',
    'coil',
    'coreCss',
    'cssFor',
    'defaultStateLabels',
    'defaultStateLoaders',
    'defineElement',
    'getLoader',
    'getStats',
    'loaderStates',
    'mount',
    'murmur',
    'orbit',
    'pond',
    'registeredLoaders',
    'scribble',
    'stateLoaders',
    'styles',
    'tide',
    'use',
  ],
  'mulling/core': [
    'coreCss',
    'cssFor',
    'defaultStateLabels',
    'defaultStateLoaders',
    'defineElement',
    'getLoader',
    'getStats',
    'loaderStates',
    'mount',
    'registeredLoaders',
    'use',
  ],
  'mulling/loaders': ['allLoaders', 'blink', 'breath', 'coil', 'murmur', 'orbit', 'pond', 'scribble', 'stateLoaders', 'tide'],
  'mulling/react': ['Mulling', 'ThinkingLoader'],
  'mulling/react/core': ['Mulling', 'ThinkingLoader'],
  'mulling/vue': ['Mulling', 'ThinkingLoader'],
  'mulling/vue/core': ['Mulling', 'ThinkingLoader'],
};

const sources: Record<string, () => Promise<Record<string, unknown>>> = {
  mulling: () => import('../src/index'),
  'mulling/core': () => import('../src/core'),
  'mulling/loaders': () => import('../src/loaders/index'),
  'mulling/react': () => import('../src/react/index'),
  'mulling/react/core': () => import('../src/react/core'),
  'mulling/vue': () => import('../src/vue/index'),
  'mulling/vue/core': () => import('../src/vue/core'),
};

describe('public API (frozen at 1.0)', () => {
  for (const [entry, expected] of Object.entries(API)) {
    it(`${entry} exports exactly what 1.0 promises`, async () => {
      const mod = await sources[entry]();
      expect(Object.keys(mod).sort()).toEqual([...expected].sort());
    });
  }

  it('every entry point in package.json is covered here', async () => {
    const pkg = (await import('../package.json')).default as { exports: Record<string, unknown> };
    const entries = Object.keys(pkg.exports)
      .filter((k) => k !== './package.json' && k !== './jsx') // jsx is types only
      .map((k) => (k === '.' ? 'mulling' : `mulling/${k.slice(2)}`));
    expect(entries.sort()).toEqual(Object.keys(API).sort());
  });

  it('mount() options are the 1.0 set', async () => {
    const { OPTION_KEYS } = await import('../src/wrapper-shared');
    expect([...OPTION_KEYS].sort()).toEqual(
      [
        'announce',
        'color',
        'label',
        'labels',
        'maxFps',
        'nonce',
        'paused',
        'reducedMotion',
        'size',
        'speed',
        'state',
        'states',
        'time',
        'type',
      ].sort(),
    );
  });
});
