import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineElement, mount } from '../src';
import { resolveLabel, resolveVisual } from '../src/mount';
import { resetAnnouncer } from '../src/announcer';

afterEach(() => {
  resetAnnouncer();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

const box = () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
};

describe('state resolution', () => {
  it('maps working states to their default loaders', () => {
    expect(resolveVisual({ state: 'thinking' })).toEqual({ kind: 'loader', type: 'breath' });
    expect(resolveVisual({ state: 'searching' })).toEqual({ kind: 'loader', type: 'murmur' });
    expect(resolveVisual({ state: 'writing' })).toEqual({ kind: 'loader', type: 'tide' });
  });

  it('lets the states option choose loaders, and ends with marks', () => {
    expect(resolveVisual({ state: 'writing', states: { writing: 'scribble' } })).toEqual({ kind: 'loader', type: 'scribble' });
    expect(resolveVisual({ state: 'done' })).toEqual({ kind: 'mark', state: 'done' });
    expect(resolveVisual({ state: 'error' })).toEqual({ kind: 'mark', state: 'error' });
  });

  it('falls back to type when no state is set', () => {
    expect(resolveVisual({ type: 'pond' })).toEqual({ kind: 'loader', type: 'pond' });
    expect(resolveVisual({})).toEqual({ kind: 'loader', type: 'breath' });
  });

  it('picks labels per state, and null always means decorative', () => {
    expect(resolveLabel({})).toBe('Loading');
    expect(resolveLabel({ label: 'Working' })).toBe('Working');
    expect(resolveLabel({ state: 'searching', label: 'Working' })).toBe('Searching');
    expect(resolveLabel({ state: 'done', labels: { done: 'Answer ready' } })).toBe('Answer ready');
    expect(resolveLabel({ state: 'error', label: null })).toBeNull();
  });
});

describe('transitions', () => {
  it('cross-fades: the old loader stays briefly, then is removed', async () => {
    const el = box();
    const h = mount(el, { state: 'thinking' });
    h.update({ state: 'writing' });
    expect(el.querySelectorAll('.mulling-layer').length).toBe(2);
    expect(el.querySelector('.mulling-layer.mulling-out .mulling-breath')).not.toBeNull();
    await new Promise((r) => setTimeout(r, 320));
    expect(el.querySelectorAll('.mulling-layer').length).toBe(1);
    expect(el.querySelector('.mulling-tide')).not.toBeNull();
  });

  it('swaps instantly when frozen with time', () => {
    const el = box();
    const h = mount(el, { state: 'thinking', time: 1 });
    h.update({ state: 'done' });
    expect(el.querySelectorAll('.mulling-layer').length).toBe(1);
    expect(el.querySelector('.mulling-done')).not.toBeNull();
  });

  it('does not rebuild when the state changes but the loader stays the same', () => {
    const el = box();
    const h = mount(el, { state: 'thinking', states: { thinking: 'orbit', writing: 'orbit' } });
    const before = el.querySelector('.mulling-layer');
    h.update({ state: 'writing' });
    expect(el.querySelector('.mulling-layer')).toBe(before);
    expect(h.element.getAttribute('aria-label')).toBe('Writing');
  });

  it('cleans up layers that are still fading when destroyed', () => {
    const el = box();
    const h = mount(el, { state: 'thinking' });
    h.update({ state: 'searching' });
    h.destroy();
    expect(el.innerHTML).toBe('');
  });
});

describe('shared announcer', () => {
  const region = () => document.querySelector('[data-mulling-announcer]');

  it('is on by default', () => {
    vi.useFakeTimers();
    const h = mount(box(), { state: 'thinking' });
    expect(h.element.getAttribute('role')).toBe('img');
    vi.advanceTimersByTime(300);
    expect(region()!.textContent).toBe('Thinking');
  });

  it("'off' makes each loader its own status element and speaks nothing through the shared region", () => {
    vi.useFakeTimers();
    const h = mount(box(), { state: 'thinking', announce: 'off' });
    expect(h.element.getAttribute('role')).toBe('status');
    // Live regions speak content changes, not aria-label changes, so the words are real (hidden) text.
    expect(h.element.textContent).toBe('Thinking');
    expect(h.element.hasAttribute('aria-label')).toBe(false);
    vi.advanceTimersByTime(300);
    expect(region()).toBeNull();
  });

  it('speaks a change once, after a short pause, through one live region', () => {
    vi.useFakeTimers();
    const h = mount(box(), { state: 'thinking', announce: 'polite' });
    expect(h.element.getAttribute('role')).toBe('img');
    vi.advanceTimersByTime(300);
    expect(region()!.textContent).toBe('Thinking');
    expect(region()!.getAttribute('aria-live')).toBe('polite');

    // Rapid changes collapse into the latest one.
    h.update({ state: 'searching' });
    h.update({ state: 'writing' });
    vi.advanceTimersByTime(300);
    expect(region()!.textContent).toBe('Writing');
    expect(document.querySelectorAll('[data-mulling-announcer]').length).toBe(1);
  });

  it('combines several loaders changing together, without repeats', () => {
    vi.useFakeTimers();
    mount(box(), { state: 'searching', announce: 'polite' });
    mount(box(), { state: 'searching', announce: 'polite' });
    mount(box(), { state: 'writing', announce: 'polite' });
    vi.advanceTimersByTime(300);
    expect(region()!.textContent).toBe('Searching. Writing');
  });

  it('only speaks when the words change, and never for decorative loaders', () => {
    vi.useFakeTimers();
    const h = mount(box(), { state: 'writing', announce: 'polite' });
    vi.advanceTimersByTime(300);
    region()!.textContent = 'marker';
    h.update({ speed: 2 });
    vi.advanceTimersByTime(300);
    expect(region()!.textContent).toBe('marker');

    mount(box(), { state: 'done', announce: 'polite', label: null });
    vi.advanceTimersByTime(300);
    expect(region()!.textContent).toBe('marker');
  });
});

describe('<mulling-status> states', () => {
  it('follows the state attribute and resets options when attributes are removed', () => {
    defineElement();
    const el = document.createElement('mulling-status');
    el.setAttribute('state', 'writing');
    el.setAttribute('loader-writing', 'scribble');
    el.setAttribute('label-writing', 'Drafting');
    el.setAttribute('size', '40');
    document.body.appendChild(el);
    const host = el.shadowRoot!.querySelector('.mulling-host') as HTMLElement;
    expect(host.getAttribute('aria-label')).toBe('Drafting');
    expect(el.shadowRoot!.querySelector('canvas')).not.toBeNull();

    el.removeAttribute('size');
    expect(host.style.getPropertyValue('--mulling-size')).toBe('20px');
    el.setAttribute('state', 'done');
    expect(host.getAttribute('aria-label')).toBe('Done');
  });
});
