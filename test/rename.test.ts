import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineElement } from '../src';
import { resetAnnouncer } from '../src/announcer';
import { Mulling as ReactMulling, ThinkingLoader as ReactOld } from '../src/react';
import { Mulling as VueMulling, ThinkingLoader as VueOld } from '../src/vue';

// The library was renamed from thinking-loaders to Mulling before 1.0. The old names keep working until 2.0.

defineElement();

afterEach(() => {
  resetAnnouncer();
  document.body.innerHTML = '';
});

describe('renamed to Mulling', () => {
  it('registers <mulling-status>', () => {
    const el = document.body.appendChild(document.createElement('mulling-status'));
    el.setAttribute('state', 'searching');
    expect(el.shadowRoot!.querySelector('.mulling-host')!.getAttribute('aria-label')).toBe('Searching');
  });

  it('still renders the old <thinking-loader> tag, and warns once that it was renamed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (let i = 0; i < 2; i++) {
      const el = document.body.appendChild(document.createElement('thinking-loader'));
      el.setAttribute('state', 'writing');
      expect(el.shadowRoot!.querySelector('.mulling-host')!.getAttribute('aria-label')).toBe('Writing');
    }
    const renameWarnings = warn.mock.calls.filter((c) => String(c[0]).includes('<mulling-status>'));
    expect(renameWarnings).toHaveLength(1);
    warn.mockRestore();
  });

  it('keeps ThinkingLoader as an alias of the React and Vue components', () => {
    expect(ReactOld).toBe(ReactMulling);
    expect(VueOld).toBe(VueMulling);
  });
});
