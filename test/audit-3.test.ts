import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineElement, mount } from '../src';
import { resetAnnouncer } from '../src/announcer';
import { reserveSize } from '../src/wrapper-shared';

// Regression tests for the third audit (bugs B4, B9 and copy C1, C9). Each one failed before its fix.

defineElement();

let warn: ReturnType<typeof vi.spyOn>;
const warnings = () => warn.mock.calls.map((c) => String(c[0]));
const box = () => document.body.appendChild(document.createElement('div'));
const region = () => document.querySelector('[data-mulling-announcer][aria-live="polite"]');

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  vi.useRealTimers();
  resetAnnouncer();
  document.body.innerHTML = '';
});

describe('B4. wrappers reserve the size the loader will actually draw', () => {
  it('uses the default for invalid sizes and caps large ones', () => {
    expect(reserveSize(undefined).width).toBe('20px');
    expect(reserveSize(0).width).toBe('20px');
    expect(reserveSize(-5).width).toBe('20px');
    expect(reserveSize(Number.NaN).width).toBe('20px');
    expect(reserveSize(5000).width).toBe('1024px');
    expect(reserveSize(48).height).toBe('48px');
  });
});

describe('B9. a loader that is not on the page yet stays quiet', () => {
  it('announces only once it is attached', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'] });
    const detached = document.createElement('div');
    mount(detached, { state: 'thinking' });
    vi.advanceTimersByTime(300);
    expect(region()?.textContent ?? '').toBe('');
    document.body.appendChild(detached);
    vi.advanceTimersByTime(50); // waitUntilAttached checks once a frame
    vi.advanceTimersByTime(300);
    expect(region()!.textContent).toBe('Thinking');
  });
});

describe('C1. label with a state warns, instead of silently doing nothing', () => {
  it('from mount()', () => {
    mount(box(), { state: 'searching', label: 'Reading files' });
    expect(warnings().find((m) => m.includes('ignored while state is set'))).toMatch(/use labels: \{ searching: '…' \}/);
  });

  it('from <mulling-status>, naming the attribute to use', () => {
    box().innerHTML = '<mulling-status state="writing" label="Typing"></mulling-status>';
    expect(warnings().find((m) => m.includes('<mulling-status label>'))).toMatch(/label-writing/);
  });

  it('not for decorative loaders or loaders without a state', () => {
    mount(box(), { state: 'done', label: null });
    mount(box(), { label: 'Fetching' });
    expect(warnings().some((m) => m.includes('ignored while state is set'))).toBe(false);
  });
});

describe('C9. fallback wording in warnings reads naturally', () => {
  it('names what is used instead', () => {
    mount(box(), { state: 'pondering' as never });
    mount(box(), { time: 'soon' as never });
    expect(warnings().find((m) => m.includes('"pondering"'))).toMatch(/Using the type option instead\.$/);
    expect(warnings().find((m) => m.includes('"soon"'))).toMatch(/Using the live animation\.$/);
  });
});
