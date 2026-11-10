import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { allLoaders, coreCss, mount, use } from '../src';
import { resetAnnouncer } from '../src/announcer';
import { endMarks } from '../src/states';
import { resetStyles } from '../src/styles';

// The "tl" prefix came from the old name, thinking-loaders. The public names are now --mulling-* and the
// mulling-animate class; the old public names keep working until 2.0.

let warn: ReturnType<typeof vi.spyOn>;
const box = () => document.body.appendChild(document.createElement('div'));
beforeEach(() => {
  resetStyles();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  resetAnnouncer();
  document.body.innerHTML = '';
});

describe('no "tl-" in what Mulling renders', () => {
  it('built-in loaders and endings use no tl- names', () => {
    for (const def of allLoaders) {
      if (def.tech !== 'css') continue;
      expect(def.html, def.type).not.toMatch(/\btl-/);
      // The only "tl-" allowed: fallbacks to the old public names, so pages that set them keep working.
      expect(def.css.replace(/var\(--tl-(eye|done|error),/g, ''), def.type).not.toMatch(/\btl-/);
    }
    for (const mark of Object.values(endMarks)) expect(mark).not.toMatch(/\btl-/);
  });

  it('a mounted loader has no tl- classes', () => {
    const el = box();
    mount(el, { type: 'orbit', state: 'thinking' });
    const classes = [...el.querySelectorAll('*')].flatMap((n) => [...n.classList]);
    expect(classes.length).toBeGreaterThan(0);
    expect(classes.filter((c) => c.startsWith('tl-'))).toEqual([]);
  });
});

describe('public names', () => {
  it('endings and eyes read --mulling-* first, then the old --tl-* names', () => {
    expect(coreCss).toMatch(/var\(--mulling-done,var\(--tl-done,/);
    expect(coreCss).toMatch(/var\(--mulling-error,var\(--tl-error,/);
    const blink = allLoaders.find((l) => l.type === 'blink');
    expect(blink?.tech === 'css' && blink.css).toMatch(/var\(--mulling-eye,var\(--tl-eye,/);
  });

  it('a CSS loader gets --mulling-duration, and --tl-dur for loaders written before 1.0', () => {
    const el = box();
    mount(el, { type: 'breath', speed: 2 });
    const wrap = el.querySelector<HTMLElement>('[style*="duration"]');
    expect(wrap?.style.getPropertyValue('--mulling-duration')).toMatch(/s$/);
    expect(wrap?.style.getPropertyValue('--tl-dur')).toBe(wrap?.style.getPropertyValue('--mulling-duration'));
  });

  it('reduced motion applies to mulling-animate, and to tl-a for loaders written before 1.0', () => {
    expect(coreCss).toMatch(/\.mulling-animate/);
    expect(coreCss).toMatch(/\.tl-a\b/);
  });
});

describe('custom loaders written with the old names', () => {
  const old = { type: 'oldstyle', name: 'Old', tech: 'css' as const, description: '', reducedMotion: '', base: 1 };

  it('warn once, naming the new names', () => {
    use({ ...old, html: '<i class="tl-a"></i>', css: 'i{background:var(--tl-c)}' });
    use({ ...old, type: 'oldstyle2', html: '<i class="tl-a"></i>', css: 'i{background:var(--tl-c)}' });
    const msgs = warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('mulling-animate'));
    expect(msgs.length).toBe(1);
    expect(msgs[0]).toMatch(/--mulling-color/);
    expect(msgs[0]).toMatch(/2\.0/);
  });

  it('a loader using the new names does not warn', () => {
    use({ ...old, type: 'newstyle', html: '<i class="mulling-animate"></i>', css: 'i{background:var(--mulling-color)}' });
    expect(warn).not.toHaveBeenCalled();
  });
});
