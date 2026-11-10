import { defineComponent, h, onBeforeUnmount, onMounted, onUpdated, ref, watch, type PropType } from 'vue';
import type { LoaderState, WorkingState } from '../states';
import type { LoaderType } from '../types';
import { mount, type LoaderHandle, type MountOptions } from '../mount';
import { isPassedAria, type OPTION_KEYS, optionsKey, pickOptions, reserveSize, syncAttributes } from '../wrapper-shared';

/** Props with no default of their own: absent means "unset", so the library's defaults apply. */
const optional = <T>(type: PropType<T>) => ({ type, default: undefined });

const vueProps = {
  type: optional(String as PropType<LoaderType>),
  state: optional(String as PropType<LoaderState>),
  states: optional(Object as PropType<Partial<Record<WorkingState, LoaderType>>>),
  size: optional(Number),
  color: optional(String),
  speed: optional(Number),
  // null means decorative, so null must stay distinct from "not passed".
  label: { type: [String, null] as unknown as PropType<string | null>, default: undefined },
  labels: optional(Object as PropType<Partial<Record<LoaderState, string>>>),
  announce: optional(String as PropType<'off' | 'polite'>),
  // Boolean before String, with an explicit default, so an absent prop stays undefined (Vue would otherwise cast it to false).
  reducedMotion: { type: [Boolean, String] as PropType<'auto' | boolean>, default: undefined },
  paused: { type: [Boolean, String] as PropType<boolean>, default: undefined },
  maxFps: optional(Number),
  time: optional(Number),
  nonce: optional(String),
};

/** Compile-time check: fails to build if a mount() option has no Vue prop, so the component never drops one. */
type MissingVueProps = Exclude<(typeof OPTION_KEYS)[number], keyof typeof vueProps>;
const allPropsCovered: [MissingVueProps] extends [never] ? true : MissingVueProps = true;
void allPropsCovered;

/**
 * Vue component for a thinking loader. Every `mount()` option is a prop (kebab-case in templates).
 *
 * ```vue
 * <Mulling :state="status" announce="polite" />
 * ```
 *
 * Template ref: `.update(options)`, `.refresh()` and `.element`.
 */
export const Mulling = defineComponent({
  name: 'Mulling',
  props: vueProps,
  // Attributes are split by hand: aria-* go on the loader's labelled element, where assistive technology
  // reads them; everything else (class, style, data-*, listeners) goes on the wrapper as usual.
  inheritAttrs: false,
  setup(props, { expose, attrs }) {
    const host = ref<HTMLSpanElement | null>(null);
    let handle: LoaderHandle | null = null;
    let ariaSet: string[] = [];
    const options = () => pickOptions(props as MountOptions);
    const split = () => {
      const aria: Record<string, unknown> = {};
      const rest: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(attrs)) (isPassedAria(k) ? aria : rest)[k] = v;
      return { aria, rest };
    };
    const syncAria = () => {
      if (handle) ariaSet = syncAttributes(handle.element, split().aria, ariaSet);
    };

    onMounted(() => {
      if (!host.value) return; // the span is always rendered, so this only guards against misuse
      handle = mount(host.value, options());
      syncAria();
    });
    onUpdated(syncAria);
    watch(
      () => optionsKey(options()),
      () => handle?.update(options()),
    );
    onBeforeUnmount(() => {
      handle?.destroy();
      handle = null;
    });

    expose({
      get element() {
        return handle?.element ?? null;
      },
      update: (o: Partial<MountOptions>) => handle?.update(o),
      refresh: () => handle?.refresh(),
    });

    return () => {
      const { rest } = split();
      return h('span', { ...rest, ref: host, style: [reserveSize(props.size), rest.style as never] });
    };
  },
});

/**
 * @deprecated Renamed to `Mulling`; removed in 2.0.
 * @hidden
 */
export const ThinkingLoader = Mulling;
