import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineElement, mount } from '../src';
import { resetAnnouncer } from '../src/announcer';

// UX audit M7 and M8: mistakes are reported, and every message says what to write instead.
// Each test uses its own wrong value, because a message is only printed once per page.

defineElement();

let warn: ReturnType<typeof vi.spyOn>;
const warnings = () => warn.mock.calls.map((c) => String(c[0]));
const box = () => document.body.appendChild(document.createElement('div'));
const element = (html: string) => {
  const host = box();
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
};

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  resetAnnouncer();
  document.body.innerHTML = '';
});

describe('M7. <mulling-status> reports invalid attributes, like mount() does', () => {
  it('a wrongly cased state warns, names the element and attribute, and suggests the fix', () => {
    element('<mulling-status state="Thinking"></mulling-status>');
    const msg = warnings().find((m) => m.includes('state="Thinking"'));
    expect(msg).toMatch(/<mulling-status state="Thinking">/);
    expect(msg).toMatch(/thinking, searching, writing, done or error/);
    expect(msg).toMatch(/Did you mean "thinking"\?/);
  });

  it('a size that isn’t a number warns and says to use pixels', () => {
    element('<mulling-status size="large"></mulling-status>');
    expect(warnings().find((m) => m.includes('size="large"'))).toMatch(/number of pixels/);
  });

  it('a size with units warns too', () => {
    element('<mulling-status size="32px"></mulling-status>');
    expect(warnings().find((m) => m.includes('size="32px"'))).toMatch(/number of pixels, like 24/);
  });

  it('invalid announce and reduced-motion values warn instead of silently becoming defaults', () => {
    element('<mulling-status announce="loud" reduced-motion="sometimes"></mulling-status>');
    expect(warnings().find((m) => m.includes('announce="loud"'))).toMatch(/polite or off/);
    expect(warnings().find((m) => m.includes('reduced-motion="sometimes"'))).toMatch(/auto, true or false/);
  });

  it('a later attribute change is checked too', () => {
    const el = element('<mulling-status></mulling-status>');
    el.setAttribute('speed', 'fast');
    expect(warnings().find((m) => m.includes('speed="fast"'))).toMatch(/positive number/);
  });

  it('valid attributes still produce no warnings', () => {
    element(
      '<mulling-status state="writing" size="32" speed="1.5" announce="off" reduced-motion="" max-fps="none" time="2"></mulling-status>',
    );
    expect(warnings()).toEqual([]);
  });
});

describe('M8. messages say what is valid', () => {
  it('a misspelt loader name suggests the registered one', async () => {
    mount(box(), { type: 'orbitt' as never });
    await new Promise((r) => setTimeout(r, 0));
    expect(warnings().find((m) => m.includes('"orbitt"'))).toMatch(/Did you mean "orbit"\?/);
  });

  it('an unknown loader name with no near match lists the registered loaders', async () => {
    mount(box(), { type: 'zzzzzz' as never });
    await new Promise((r) => setTimeout(r, 0));
    expect(warnings().find((m) => m.includes('"zzzzzz"'))).toMatch(/breath.*orbit/);
  });

  // happy-dom's CSS.supports accepts anything, so stand in for a browser's answer. test/browser/ux-messages.spec.ts
  // checks the same thing in real Chrome.
  it('a color the browser doesn’t understand warns and keeps the text color', () => {
    vi.stubGlobal('CSS', { supports: (_property: string, value: string) => value !== 'blurple' });
    mount(box(), { color: 'blurple' });
    vi.unstubAllGlobals();
    expect(warnings().find((m) => m.includes('"blurple"'))).toMatch(/CSS color.*Using currentColor/);
  });

  it('valid colors, including currentColor and CSS variables, don’t warn', () => {
    mount(box(), { color: '#6366f1' });
    mount(box(), { color: 'currentColor' });
    mount(box(), { color: 'var(--brand)' });
    mount(box(), { color: 'rgb(99 102 241 / 0.8)' });
    expect(warnings()).toEqual([]);
  });

  it('size and speed messages give an example', () => {
    mount(box(), { size: -3 });
    mount(box(), { speed: 0 });
    expect(warnings().find((m) => m.includes('size -3'))).toMatch(/number of pixels, like 24\. Using 20\./);
    expect(warnings().find((m) => m.includes('speed 0'))).toMatch(/positive number, like 1\.5\. Using 1\./);
  });

  it('a misspelt state through mount() suggests the fix', () => {
    mount(box(), { state: 'serching' as never });
    expect(warnings().find((m) => m.includes('"serching"'))).toMatch(/Did you mean "searching"\?/);
  });
});
