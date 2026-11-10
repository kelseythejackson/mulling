import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Core from '../src/core';
import type { CanvasLoaderDef, CssLoaderDef } from '../src/types';

// Each test gets a fresh copy of core with nothing registered, as if an app imported only 'mulling/core'.
let core: typeof Core;
let loaders: typeof import('../src/loaders');
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  vi.resetModules();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  core = await import('../src/core');
  loaders = await import('../src/loaders');
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

const box = () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
};
const styleText = () => [...document.querySelectorAll('style[data-mulling]')].map((s) => s.textContent).join('');

const sparkle: CssLoaderDef = {
  type: 'sparkle',
  name: 'Sparkle',
  tech: 'css',
  description: 'A test loader.',
  reducedMotion: 'Fades.',
  base: 1,
  html: '<i class="mulling-sparkle mulling-animate"></i>',
  css: '.mulling-sparkle{display:block;width:50%;height:50%;background:var(--mulling-color)}',
};
const dot: CanvasLoaderDef = {
  type: 'dot',
  name: 'Dot',
  tech: 'canvas',
  description: 'A test loader.',
  reducedMotion: 'Holds still.',
  paint: () => {},
};

describe('use()', () => {
  it('starts empty in core, and lists what is registered', () => {
    expect(core.registeredLoaders()).toEqual([]);
    core.use(loaders.coil, loaders.tide);
    expect(core.registeredLoaders().map((l) => l.type)).toEqual(['coil', 'tide']);
    expect(core.getLoader('coil')).toBe(loaders.coil);
  });

  it('is safe to call twice with the same loader', () => {
    core.use(loaders.breath);
    core.use(loaders.breath);
    expect(core.registeredLoaders().length).toBe(1);
  });

  it('rejects malformed definitions with a clear error', () => {
    expect(() => core.use({ ...sparkle, type: 'Bad Name' })).toThrow(/invalid loader "Bad Name"/);
    expect(() => core.use({ ...sparkle, base: 0 })).toThrow(/invalid loader/);
    expect(() => core.use({ ...dot, paint: undefined as never })).toThrow(/invalid loader "dot"/);
  });
});

describe('custom loaders', () => {
  it('shows a custom CSS loader, with its styles added only once it is used', () => {
    core.use(sparkle);
    core.mount(box(), { type: 'breath' }); // not registered: falls back to sparkle
    expect(styleText()).toContain('.mulling-sparkle');
    expect(styleText()).not.toContain('.mulling-breath');
    expect(document.querySelector('.mulling-sparkle')).not.toBeNull();
  });

  it('shows a custom canvas loader', () => {
    core.use(dot);
    core.mount(box(), { type: 'dot' });
    expect(document.querySelector('canvas')).not.toBeNull();
  });

  it('adds a CSS loader’s styles the first time it appears, not at registration', () => {
    core.use(loaders.orbit, loaders.tide);
    const h = core.mount(box(), { type: 'orbit', time: 0 });
    expect(styleText()).toContain('.mulling-orbit');
    expect(styleText()).not.toContain('.mulling-tide');
    h.update({ type: 'tide' });
    expect(styleText()).toContain('.mulling-tide');
  });

  it('lets a built-in be overridden by registering the same type again', () => {
    core.use(loaders.breath);
    const el = box();
    core.mount(el, { type: 'breath', time: 0 });
    core.use({ ...sparkle, type: 'breath' });
    expect(el.querySelector('.mulling-sparkle')).not.toBeNull();
  });
});

describe('missing loaders', () => {
  it('warns once and falls back to the first registered loader', () => {
    core.use(loaders.pond);
    core.mount(box(), { type: 'coil' });
    core.mount(box(), { type: 'coil' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/"coil" isn't registered.*Showing "pond"/);
    expect(document.querySelectorAll('canvas').length).toBe(2);
  });

  it('states fall back too, when their default loader is not imported', () => {
    core.use(loaders.orbit);
    const el = box();
    core.mount(el, { state: 'searching', time: 0 }); // default would be murmur
    expect(el.querySelector('.mulling-orbit')).not.toBeNull();
    expect(el.querySelector('[aria-label]')!.getAttribute('aria-label')).toBe('Searching');
  });

  it('endings work with no loaders registered at all', () => {
    const el = box();
    core.mount(el, { state: 'done', time: 1 });
    expect(el.querySelector('.mulling-done')).not.toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('switches to the right loader as soon as it is registered', () => {
    core.use(loaders.tide);
    const el = box();
    core.mount(el, { type: 'blink', time: 0 });
    expect(el.querySelector('.mulling-tide')).not.toBeNull();
    core.use(loaders.blink);
    expect(el.querySelector('.mulling-blink')).not.toBeNull();
  });

  it('shows nothing, without throwing, when nothing is registered', () => {
    const el = box();
    expect(() => core.mount(el, { type: 'coil' })).not.toThrow();
    expect(el.querySelector('.mulling-layer')!.children.length).toBe(0);
  });
});

describe('<mulling-status> with custom loaders', () => {
  it('accepts any registered name', () => {
    core.use(sparkle);
    core.defineElement('test-loader');
    const el = document.createElement('test-loader');
    el.setAttribute('type', 'sparkle');
    document.body.appendChild(el);
    expect(el.shadowRoot!.querySelector('.mulling-sparkle')).not.toBeNull();
  });
});
