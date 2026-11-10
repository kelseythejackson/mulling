import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { allLoaders, cssFor, defineElement, mount } from '../src';
import { contrast, parseColor } from '../src/color';
import { resetAnnouncer } from '../src/announcer';
import { blink } from '../src/loaders/blink';
import { coil } from '../src/loaders/coil';
import { orbit } from '../src/loaders/orbit';
import { calmCss, coreCss, resetStyles } from '../src/styles';
import { Mulling as VueLoader } from '../src/vue';

// Regression tests for the second round of audit findings. Each one failed before its fix.

defineElement();

const box = () => document.body.appendChild(document.createElement('div'));
const docTag = () => document.head.querySelector<HTMLStyleElement>('style[data-mulling]');

beforeEach(() => resetStyles());
afterEach(() => {
  vi.useRealTimers();
  resetAnnouncer();
  document.body.innerHTML = '';
  document.head.querySelectorAll('meta[property="csp-nonce"]').forEach((m) => m.remove());
});

describe('1. strict Content Security Policy', () => {
  it('no built-in loader uses inline style attributes, which strict CSPs block', () => {
    for (const def of allLoaders) {
      if (def.tech === 'css') expect(def.html, def.type).not.toMatch(/style\s*=/);
    }
  });

  it('every style tag the library injects carries the nonce, not just the first', () => {
    mount(box(), { nonce: 'n1' });
    expect(docTag()!.nonce).toBe('n1');
    docTag()!.remove(); // e.g. a page-swap tool replaced <head>
    mount(box()); // later mounts usually don't repeat the nonce
    expect(docTag()!.nonce).toBe('n1');
  });

  it('reads the nonce from <mulling-status nonce>', () => {
    const el = document.createElement('mulling-status');
    el.setAttribute('nonce', 'from-element');
    document.body.appendChild(el);
    docTag()?.remove();
    mount(box());
    expect(docTag()!.nonce).toBe('from-element');
  });

  it('reads the nonce from <meta property="csp-nonce">, the convention Vite and others use', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('property', 'csp-nonce');
    meta.setAttribute('nonce', 'from-meta');
    document.head.appendChild(meta);
    mount(box());
    expect(docTag()!.nonce).toBe('from-meta');
  });
});

describe('2. moving <mulling-status> keeps it', () => {
  it('keeps the same rendered loader when moved, and does not announce again', async () => {
    vi.useFakeTimers();
    const a = box();
    const b = box();
    const el = document.createElement('mulling-status');
    el.setAttribute('state', 'thinking');
    a.appendChild(el);
    const before = el.shadowRoot!.querySelector('.mulling-host');
    vi.advanceTimersByTime(400);
    const region = document.querySelector('[data-mulling-announcer]')!;
    region.textContent = '';

    b.appendChild(el); // a keyed list reorder does exactly this
    await Promise.resolve();
    vi.advanceTimersByTime(400);
    expect(el.shadowRoot!.querySelector('.mulling-host')).toBe(before);
    expect(region.textContent).toBe('');
  });

  it('still cleans up when removed for good', async () => {
    const el = document.createElement('mulling-status');
    box().appendChild(el);
    el.remove();
    await Promise.resolve();
    await Promise.resolve();
    expect(el.shadowRoot!.querySelector('.mulling-host')).toBeNull();
  });
});

describe('3. styles that were removed come back', () => {
  it('re-adds the stylesheet, with every loader added so far, when the tag was removed', () => {
    mount(box(), { type: 'orbit' });
    docTag()!.remove();
    mount(box(), { type: 'breath' });
    expect(docTag()).not.toBeNull();
    expect(docTag()!.textContent).toContain('.mulling-orbit');
  });

  it('re-adopts the shared sheet when a shadow root’s sheets were reset', () => {
    const shadow = box().attachShadow({ mode: 'open' });
    if (!('adoptedStyleSheets' in shadow)) return; // test DOM without constructable sheets
    mount(shadow.appendChild(document.createElement('div')));
    shadow.adoptedStyleSheets = [];
    mount(shadow.appendChild(document.createElement('div')));
    expect(shadow.adoptedStyleSheets.length + shadow.querySelectorAll('style').length).toBeGreaterThan(0);
  });
});

describe('4. reduced motion keeps enough contrast', () => {
  const minOpacity = () => {
    const frames = calmCss.match(/@keyframes mulling-calm\{([^}]*\}[^}]*)\}/)![1];
    return Math.min(...[...frames.matchAll(/opacity:([\d.]+)/g)].map((m) => Number(m[1])));
  };

  it('never fades below the opacity that keeps a 4.5:1 color at 3:1 (WCAG 1.4.11)', () => {
    expect(minOpacity()).toBeGreaterThanOrEqual(0.8);
  });

  it('keeps the demo color above 3:1 on white at its faintest', () => {
    const a = minOpacity();
    const fg = parseColor('#3b5bdb')!;
    const blended = fg.map((c) => Math.round(a * c + (1 - a) * 255)) as [number, number, number];
    expect(contrast(blended, [255, 255, 255])).toBeGreaterThanOrEqual(3);
  });

  it('announces errors assertively, so they aren’t queued behind other speech', () => {
    vi.useFakeTimers();
    const handle = mount(box(), { state: 'thinking' });
    vi.advanceTimersByTime(400);
    handle.update({ state: 'error' });
    vi.advanceTimersByTime(400);
    const urgent = document.querySelector('[data-mulling-announcer][aria-live="assertive"]');
    expect(urgent?.textContent).toBe('Something went wrong');
  });

  it('keeps “done” polite', () => {
    vi.useFakeTimers();
    mount(box(), { state: 'done' });
    vi.advanceTimersByTime(400);
    const polite = document.querySelector('[data-mulling-announcer][aria-live="polite"]');
    expect(polite?.textContent).toBe('Done');
  });
});

describe('5. paths that had no tests', () => {
  it('cssFor() gives the core styles plus each CSS loader’s, and nothing for canvas loaders', () => {
    const css = cssFor([orbit, coil]);
    expect(css.startsWith(coreCss)).toBe(true);
    expect(css).toContain(orbit.css);
    expect(cssFor([coil])).toBe(coreCss);
  });

  it('contrastVar picks a readable eye color for the loader’s color', () => {
    const light = mount(box(), { type: 'blink', color: '#ffffff' });
    const eye = () => light.element.querySelector<HTMLElement>('.mulling-wrap')!.style.getPropertyValue(blink.contrastVar!);
    const onLight = eye();
    light.update({ color: '#000000' });
    expect(onLight).not.toBe('');
    expect(eye()).not.toBe(onLight);
  });

  it('the Vue component renders on the server without touching the DOM', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(VueLoader, { size: 32, state: 'thinking' }) }));
    expect(html).toContain('width:32px');
  });
});

describe('runner-up: labels and states merge in update()', () => {
  const label = (h: { element: HTMLElement }) => h.element.getAttribute('aria-label');

  it('changing one label keeps the others', () => {
    const handle = mount(box(), { state: 'thinking', labels: { thinking: 'Reading your files' } });
    handle.update({ labels: { error: 'Upload failed' } });
    expect(label(handle)).toBe('Reading your files');
    handle.update({ state: 'error' });
    expect(label(handle)).toBe('Upload failed');
  });

  it('changing one state’s loader keeps the others', () => {
    const el = box();
    const handle = mount(el, { state: 'writing', states: { writing: 'coil' } });
    handle.update({ states: { searching: 'pond' } });
    expect(el.querySelector('.mulling-layer:not(.mulling-out) canvas')).not.toBeNull(); // still coil (canvas), not tide
  });

  it('a key set to undefined goes back to its default; labels: undefined resets them all', () => {
    const handle = mount(box(), { state: 'thinking', labels: { thinking: 'Reading', done: 'Ready' } });
    handle.update({ labels: { thinking: undefined } });
    expect(label(handle)).toBe('Thinking');
    handle.update({ state: 'done' });
    expect(label(handle)).toBe('Ready');
    handle.update({ labels: undefined });
    expect(label(handle)).toBe('Done');
  });

  it('<mulling-status> still drops a label when its attribute is removed', () => {
    const el = document.createElement('mulling-status');
    el.setAttribute('state', 'thinking');
    el.setAttribute('label-thinking', 'Reading');
    document.body.appendChild(el);
    el.removeAttribute('label-thinking');
    expect(el.shadowRoot!.querySelector('.mulling-host')!.getAttribute('aria-label')).toBe('Thinking');
  });

  it('the Vue component still drops a label when it’s removed from the prop', async () => {
    const { createApp, nextTick, reactive } = await import('vue');
    const props = reactive<Record<string, unknown>>({ state: 'thinking', labels: { thinking: 'Reading' } });
    const root = box();
    const app = createApp({ render: () => h(VueLoader, { ...props }) });
    app.mount(root);
    props.labels = {};
    await nextTick();
    expect(root.querySelector('.mulling-host')!.getAttribute('aria-label')).toBe('Thinking');
    app.unmount();
  });
});
