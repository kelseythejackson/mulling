import { mount, type LoaderHandle, type MountOptions } from './mount';
import { fromElement, warnOnce } from './options';
import { loaderStates } from './states';

const ATTRS = [
  'type',
  'state',
  'size',
  'color',
  'speed',
  'label',
  'decorative',
  'announce',
  'reduced-motion',
  'paused',
  'max-fps',
  'time',
  ...loaderStates.map((s) => `label-${s}`),
  'loader-thinking',
  'loader-searching',
  'loader-writing',
];

/** A number when the attribute is one; otherwise the text as written, so validation can report it. */
const num = (v: string | null) => (v === null || v.trim() === '' ? undefined : Number.isFinite(Number(v)) ? Number(v) : v);

/**
 * Reads every option from attributes. Missing attributes give the defaults, so removing one resets it.
 * Values are passed on as written: mount() validates them, warning once (naming the element and attribute)
 * and using the default for anything invalid, exactly as it does for options passed from JavaScript.
 */
function readOptions(el: HTMLElement): MountOptions {
  const get = (name: string) => el.getAttribute(name) || undefined;
  // decorative="false" is what React 18 renders for decorative={false}, so it must mean "not decorative".
  const decorative = el.getAttribute('decorative');
  const paused = el.getAttribute('paused');
  const fps = el.getAttribute('max-fps');
  const labels: Record<string, string | undefined> = {};
  const states: Record<string, string | undefined> = {};
  // Every key is listed, undefined when its attribute is absent, because update() merges labels and states:
  // a removed attribute has to reset its entry, not leave the old value.
  for (const s of loaderStates) labels[s] = get(`label-${s}`);
  for (const s of ['thinking', 'searching', 'writing']) states[s] = get(`loader-${s}`);
  return {
    type: get('type'),
    state: get('state'),
    size: num(el.getAttribute('size')),
    color: get('color'),
    speed: num(el.getAttribute('speed')),
    label: decorative !== null && decorative !== 'false' ? null : (el.getAttribute('label') ?? undefined),
    paused: paused !== null && paused !== 'false',
    labels,
    states,
    announce: get('announce'),
    reducedMotion: el.getAttribute('reduced-motion') ?? 'auto',
    maxFps: fps === 'none' ? Number.POSITIVE_INFINITY : num(fps),
    time: num(el.getAttribute('time')),
    // Browsers hide a nonce attribute's value once the page has a policy; the property keeps it.
    nonce: el.nonce || el.getAttribute('nonce') || undefined,
  } as MountOptions;
}

/**
 * @deprecated Renamed to `MullingElement`; removed in 2.0.
 * @hidden
 */
export type ThinkingLoaderElement = MullingElement;

/** The `<mulling-status>` element. Registered by `defineElement()`. */
export interface MullingElement extends HTMLElement {
  /** Re-read colors from the page; see `LoaderHandle.refresh`. */
  refresh(): void;
}

/** The tag `<mulling-status>` had before the library was renamed. Still registered, with a warning, until 2.0. */
const OLD_TAG = 'thinking-loader';

/**
 * Registers `<mulling-status>` (or a tag name you choose). Works in plain HTML and in any framework.
 *
 * ```html
 * <mulling-status state="thinking"></mulling-status>
 * ```
 *
 * With the default name it also registers the old `<thinking-loader>` tag, which works the same but warns once.
 */
export function defineElement(tagName = 'mulling-status'): void {
  if (typeof customElements === 'undefined' || customElements.get(tagName)) return;

  class MullingStatus extends HTMLElement implements MullingElement {
    static observedAttributes = [...ATTRS];
    private handle: LoaderHandle | null = null;
    private leaving = false;

    connectedCallback(): void {
      this.leaving = false; // moved, not removed: keep the running loader
      // Styles, including the :host rule, come from one stylesheet shared by every instance.
      const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
      // Reconnected after a move: the new place may have different colors, or need its own styles.
      if (this.handle) this.handle.refresh();
      else this.handle = fromElement(this.localName, () => mount(shadow, readOptions(this)));
    }

    disconnectedCallback(): void {
      // Moving an element (a keyed list reorder, appendChild elsewhere) disconnects and reconnects it in the
      // same task. Wait until the current task's microtasks have run, so a move doesn't restart the
      // animation or announce the state again.
      this.leaving = true;
      queueMicrotask(() => {
        if (!this.leaving || this.isConnected) return;
        this.leaving = false;
        this.handle?.destroy();
        this.handle = null;
      });
    }

    attributeChangedCallback(): void {
      const handle = this.handle;
      if (handle) fromElement(this.localName, () => handle.update(readOptions(this)));
    }

    refresh(): void {
      this.handle?.refresh();
    }
  }

  customElements.define(tagName, MullingStatus);

  if (tagName === 'mulling-status' && !customElements.get(OLD_TAG)) {
    // A subclass: one constructor can't be registered under two names.
    customElements.define(
      OLD_TAG,
      class extends MullingStatus {
        connectedCallback(): void {
          warnOnce('<thinking-loader> has been renamed <mulling-status>. The old tag will be removed in 2.0.');
          super.connectedCallback();
        }
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mulling-status': MullingElement;
    /** @deprecated Renamed to `<mulling-status>`; removed in 2.0. */
    'thinking-loader': MullingElement;
  }
}
