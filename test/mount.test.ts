import { afterEach, describe, expect, it } from 'vitest';
import { allLoaders, defineElement, mount } from '../src';
const loaderTypes = allLoaders.map((l) => l.type);
import { resetAnnouncer } from '../src/announcer';

afterEach(() => {
  resetAnnouncer();
  document.body.innerHTML = '';
});

describe('mount', () => {
  it('renders every loader type without throwing', () => {
    for (const type of loaderTypes) {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const handle = mount(el, { type });
      expect(el.querySelector('.mulling-host')).not.toBeNull();
      handle.destroy();
      expect(el.querySelector('.mulling-host')).toBeNull();
    }
  });

  it('is labelled for screen readers by default', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const { element } = mount(el);
    expect(element.getAttribute('role')).toBe('img');
    expect(element.getAttribute('aria-label')).toBe('Loading');
  });

  it('hides decorative loaders from assistive technology', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const { element } = mount(el, { label: null });
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.hasAttribute('role')).toBe(false);
  });

  it('switches CSS loaders to the calm version when reduced motion is forced', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const handle = mount(el, { type: 'orbit', reducedMotion: true });
    expect(el.querySelector('.mulling-wrap')!.classList.contains('mulling-reduced')).toBe(true);
    handle.update({ reducedMotion: false });
    expect(el.querySelector('.mulling-wrap')!.classList.contains('mulling-reduced')).toBe(false);
  });

  it('applies size, color and speed', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const handle = mount(el, { type: 'breath', size: 32, color: 'red', speed: 2 });
    expect(handle.element.style.getPropertyValue('--mulling-size')).toBe('32px');
    expect(handle.element.style.getPropertyValue('--mulling-set-color')).toBe('red');
    expect((el.querySelector('.mulling-wrap') as HTMLElement).style.getPropertyValue('--mulling-duration')).toBe('1.6s');
  });

  it('swaps between CSS and canvas loaders without remounting', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const handle = mount(el, { type: 'tide' });
    handle.update({ type: 'pond' });
    expect(el.querySelector('canvas')).not.toBeNull();
    expect(el.querySelectorAll('.mulling-host').length).toBe(1);
  });

  it('injects its stylesheet only once', () => {
    for (let i = 0; i < 3; i++) {
      const el = document.createElement('div');
      document.body.appendChild(el);
      mount(el);
    }
    expect(document.querySelectorAll('style[data-mulling]').length).toBe(1);
  });
});

describe('<mulling-status>', () => {
  it('renders inside its shadow root and reacts to attribute changes', () => {
    defineElement();
    const el = document.createElement('mulling-status');
    el.setAttribute('type', 'blink');
    el.setAttribute('label', 'Thinking');
    document.body.appendChild(el);
    const host = el.shadowRoot!.querySelector('.mulling-host')!;
    expect(host.getAttribute('aria-label')).toBe('Thinking');
    el.setAttribute('decorative', '');
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('undefined options (as framework props often pass them)', () => {
  it('fall back to defaults instead of breaking', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const handle = mount(el, { type: undefined, size: undefined, color: undefined, speed: undefined, reducedMotion: undefined });
    expect(handle.element.style.getPropertyValue('--mulling-size')).toBe('20px');
    expect(el.querySelector('.mulling-breath')).not.toBeNull();
    handle.update({ size: 40 });
    handle.update({ size: undefined });
    expect(handle.element.style.getPropertyValue('--mulling-size')).toBe('20px');
  });
});
