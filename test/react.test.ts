import { createElement, createRef, StrictMode } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Mulling, type MullingProps, type MullingRef } from '../src/react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
});

const render = (props: MullingProps & { ref?: React.Ref<MullingRef> }, strict = false) =>
  act(() => {
    const el = createElement(Mulling, props);
    root.render(strict ? createElement(StrictMode, null, el) : el);
  });
const host = () => container.querySelector('.mulling-host') as HTMLElement | null;

describe('<Mulling> (React)', () => {
  it('mounts a loader in the browser', () => {
    render({ type: 'orbit', label: 'Thinking' });
    expect(host()!.getAttribute('aria-label')).toBe('Thinking');
    expect(container.querySelector('.mulling-orbit')).not.toBeNull();
  });

  it('follows prop changes, including state', () => {
    render({ state: 'thinking' });
    expect(host()!.getAttribute('aria-label')).toBe('Thinking');
    render({ state: 'searching', size: 32 });
    expect(host()!.getAttribute('aria-label')).toBe('Searching');
    expect(host()!.style.getPropertyValue('--mulling-size')).toBe('32px');
  });

  it('unsets an option when its prop is removed', () => {
    render({ state: 'writing', type: 'pond' });
    expect(host()!.getAttribute('aria-label')).toBe('Writing');
    render({ type: 'pond' });
    expect(host()!.getAttribute('aria-label')).toBe('Loading');
    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('does not re-apply options when a re-render changes nothing', () => {
    render({ type: 'tide', states: { writing: 'coil' } });
    const layer = container.querySelector('.mulling-layer');
    render({ type: 'tide', states: { writing: 'coil' } }); // new object, same values
    expect(container.querySelector('.mulling-layer')).toBe(layer);
  });

  it('cleans up on unmount, and survives StrictMode’s double mount', () => {
    render({ type: 'breath' }, true);
    expect(container.querySelectorAll('.mulling-host').length).toBe(1);
    act(() => root.render(null));
    expect(container.querySelectorAll('.mulling-host').length).toBe(0);
  });

  it('exposes update, refresh and the element through a ref', () => {
    const ref = createRef<MullingRef>();
    render({ type: 'breath', ref });
    expect(ref.current!.element).toBe(host());
    act(() => ref.current!.update({ label: 'Working' }));
    expect(host()!.getAttribute('aria-label')).toBe('Working');
    expect(() => ref.current!.refresh()).not.toThrow();
  });

  it('passes className and style to its wrapper, which reserves the loader’s space', () => {
    render({ size: 24, className: 'status-icon', style: { marginRight: 8 } });
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toBe('status-icon');
    expect(wrapper.style.width).toBe('24px');
    expect(wrapper.style.marginRight).toBe('8px');
  });

  it('renders an empty, sized placeholder on the server', () => {
    const html = renderToString(createElement(Mulling, { size: 24, state: 'thinking' }));
    expect(html).toMatch(/^<span style="[^"]*width:24px[^"]*"><\/span>$/);
  });
});

describe('<Mulling> (React): pass-through attributes', () => {
  it('puts data-* attributes on its wrapper, for tests and analytics', () => {
    render({ type: 'orbit', 'data-testid': 'answer-loader' });
    expect(container.querySelector('[data-testid="answer-loader"]')).not.toBeNull();
  });

  it('puts aria-* attributes on the labelled loader element, and removes them when the prop goes', () => {
    render({ state: 'thinking', 'aria-describedby': 'status-help' });
    expect(host()!.getAttribute('aria-describedby')).toBe('status-help');
    render({ state: 'thinking' });
    expect(host()!.hasAttribute('aria-describedby')).toBe(false);
  });

  it('keeps aria-label and aria-hidden under the library’s control (use label instead)', () => {
    render({ state: 'thinking', 'aria-label': 'ignored' } as MullingProps);
    expect(host()!.getAttribute('aria-label')).toBe('Thinking');
  });

  it('still drops a label when it’s removed from the labels prop', () => {
    render({ state: 'thinking', labels: { thinking: 'Reading' } });
    render({ state: 'thinking', labels: {} });
    expect(host()!.getAttribute('aria-label')).toBe('Thinking');
  });
});
