import { afterEach, describe, expect, it } from 'vitest';
import { createApp, h, nextTick, reactive, ref, type App } from 'vue';
import { Mulling } from '../src/vue';

let app: App | null = null;

afterEach(() => {
  app?.unmount();
  app = null;
  document.body.innerHTML = '';
});

/** Mounts <Mulling v-bind="props" /> with reactive props, and returns the container and a template ref. */
function render(initial: Record<string, unknown>) {
  const props = reactive({ ...initial });
  const loaderRef = ref<InstanceType<typeof Mulling> | null>(null);
  const container = document.createElement('div');
  document.body.appendChild(container);
  app = createApp({ render: () => h(Mulling, { ...props, ref: loaderRef }) });
  app.mount(container);
  return { container, props, loaderRef, host: () => container.querySelector('.mulling-host') as HTMLElement | null };
}

describe('<Mulling> (Vue)', () => {
  it('mounts a loader', () => {
    const { container, host } = render({ type: 'orbit', label: 'Thinking' });
    expect(host()!.getAttribute('aria-label')).toBe('Thinking');
    expect(container.querySelector('.mulling-orbit')).not.toBeNull();
  });

  it('follows prop changes, including state', async () => {
    const { props, host } = render({ state: 'thinking' });
    props.state = 'writing';
    props.size = 32;
    await nextTick();
    expect(host()!.getAttribute('aria-label')).toBe('Writing');
    expect(host()!.style.getPropertyValue('--mulling-size')).toBe('32px');
  });

  it('leaves absent options at the library defaults (reducedMotion is not cast to false)', async () => {
    const { host, loaderRef } = render({ type: 'breath' });
    await nextTick();
    expect(host()!.getAttribute('aria-label')).toBe('Loading');
    expect(host()!.style.getPropertyValue('--mulling-size')).toBe('20px');
    // Vue casts an absent Boolean prop to false, which would mean "always animate" and ignore the user's setting.
    expect((loaderRef.value as unknown as { $props: Record<string, unknown> }).$props.reducedMotion).toBeUndefined();
  });

  it('treats a bare reduced-motion attribute as true', async () => {
    const { loaderRef } = render({ type: 'breath', reducedMotion: '' });
    await nextTick();
    expect((loaderRef.value as unknown as { $props: Record<string, unknown> }).$props.reducedMotion).toBe(true);
  });

  it('keeps label null (decorative) distinct from not passed', () => {
    const { host } = render({ type: 'tide', label: null });
    expect(host()!.getAttribute('aria-hidden')).toBe('true');
  });

  it('cleans up on unmount', () => {
    const { container } = render({ type: 'coil' });
    expect(container.querySelector('canvas')).not.toBeNull();
    app!.unmount();
    app = null;
    expect(container.querySelector('.mulling-host')).toBeNull();
  });

  it('exposes update and the element through a template ref', async () => {
    const { loaderRef, host } = render({ type: 'breath' });
    await nextTick();
    expect((loaderRef.value as unknown as { element: HTMLElement }).element).toBe(host());
    (loaderRef.value as unknown as { update(o: object): void }).update({ label: 'Working' });
    expect(host()!.getAttribute('aria-label')).toBe('Working');
  });

  it('passes class and style through to its wrapper', () => {
    const { container } = render({ size: 24, class: 'status-icon', style: { marginRight: '8px' } });
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toBe('status-icon');
    expect(wrapper.style.width).toBe('24px');
    expect(wrapper.style.marginRight).toBe('8px');
  });
});

describe('<Mulling> (Vue): pass-through attributes', () => {
  it('puts data-* on its wrapper and aria-* on the labelled loader element', () => {
    const { container, host } = render({ state: 'thinking', 'data-testid': 'loader', 'aria-describedby': 'help' });
    expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();
    expect(host()!.getAttribute('aria-describedby')).toBe('help');
  });

  it('removes an aria-* attribute when it goes away', async () => {
    const { props, host } = render({ state: 'thinking', 'aria-describedby': 'help' });
    // biome-ignore lint/performance/noDelete: the test is about the attribute being removed, not set to undefined
    delete props['aria-describedby'];
    await nextTick();
    expect(host()!.hasAttribute('aria-describedby')).toBe(false);
  });
});
