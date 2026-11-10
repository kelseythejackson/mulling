import { type AriaAttributes, type CSSProperties, createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { mount, type LoaderHandle, type MountOptions } from '../mount';
import { isPassedAria, optionsKey, pickOptions, reserveSize, syncAttributes } from '../wrapper-shared';

export interface MullingProps extends MountOptions, Omit<AriaAttributes, 'aria-label' | 'aria-hidden'> {
  className?: string;
  style?: CSSProperties;
  id?: string;
  /** `data-*` attributes go on the wrapper element, e.g. `data-testid`. */
  [data: `data-${string}`]: string | number | boolean | undefined;
}

/** What a ref to <Mulling> gives you. */
export interface MullingRef {
  /** The rendered loader element, once mounted. */
  readonly element: HTMLElement | null;
  /** Change options imperatively (usually you'd just change props). */
  update(options: Partial<MountOptions>): void;
  /** Re-read colors after a theme change the library can't see. */
  refresh(): void;
}

/**
 * React component for a thinking loader. Every `mount()` option is a prop.
 *
 * ```tsx
 * <Mulling state={status} announce="polite" />
 * ```
 *
 * It renders an empty, correctly sized span on the server and mounts in the browser, so there's no layout shift.
 */
export const Mulling = forwardRef<MullingRef, MullingProps>(function Mulling(props, ref) {
  const { className, style, id } = props;
  const options = pickOptions(props);
  const key = optionsKey(options);

  // data-* go on the wrapper; aria-* (such as aria-describedby) on the loader's labelled element, where
  // assistive technology reads them. aria-label and aria-hidden are left to the library: use `label`.
  const data: Record<string, unknown> = {};
  const aria: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('data-')) data[k] = v;
    else if (isPassedAria(k)) aria[k] = v;
  }

  const host = useRef<HTMLSpanElement>(null);
  const ariaSet = useRef<string[]>([]);
  const handle = useRef<LoaderHandle | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const mountedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!host.current) return; // the span is always rendered, so this only guards against misuse
    handle.current = mount(host.current, latest.current);
    mountedKey.current = optionsKey(latest.current);
    return () => {
      handle.current?.destroy();
      handle.current = null;
    };
  }, []);

  useEffect(() => {
    if (!handle.current || mountedKey.current === key) return;
    mountedKey.current = key;
    handle.current.update(latest.current);
  }, [key]);

  // Every render, after the effects above, so a remount (StrictMode) gets them too. Cheap: a few attributes.
  useEffect(() => {
    const el = handle.current?.element;
    if (el) ariaSet.current = syncAttributes(el, aria, ariaSet.current);
  });

  useImperativeHandle(
    ref,
    () => ({
      get element() {
        return handle.current?.element ?? null;
      },
      update: (o) => handle.current?.update(o),
      refresh: () => handle.current?.refresh(),
    }),
    [],
  );

  return createElement('span', { ...data, ref: host, className, id, style: { ...reserveSize(options.size), ...style } });
});

/**
 * @deprecated Renamed to `Mulling`; removed in 2.0.
 * @hidden
 */
export const ThinkingLoader = Mulling;
/**
 * @deprecated Renamed to `MullingProps`; removed in 2.0.
 * @hidden
 */
export type ThinkingLoaderProps = MullingProps;
/**
 * @deprecated Renamed to `MullingRef`; removed in 2.0.
 * @hidden
 */
export type ThinkingLoaderRef = MullingRef;
