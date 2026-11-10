/**
 * JSX types for <mulling-status>, so React and Preact users don't get
 * "Property 'mulling-status' does not exist on type 'JSX.IntrinsicElements'".
 *
 * Opt in once, in any .d.ts or .ts file in your project:
 *   import type {} from 'mulling/jsx';
 *
 * Requires @types/react.
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { LoaderState, LoaderType, MullingElement } from 'mulling';

export interface MullingStatusAttributes {
  /** Which loader to show when no state is set. Default "breath". */
  type?: LoaderType;
  /** What the AI is doing. Changing it cross-fades to that state's loader; done and error play an ending. */
  state?: LoaderState;
  /** "polite" (default) speaks changes through one shared live region; "off" makes the loader its own status element. */
  announce?: 'off' | 'polite';
  'label-thinking'?: string;
  'label-searching'?: string;
  'label-writing'?: string;
  'label-done'?: string;
  'label-error'?: string;
  /** Loader to show in each working state. Defaults: breath, murmur, tide. */
  'loader-thinking'?: LoaderType;
  'loader-searching'?: LoaderType;
  'loader-writing'?: LoaderType;
  /** Width and height in pixels. Default 20. */
  size?: number | string;
  /** Any CSS color. Default: the surrounding text color. */
  color?: string;
  /** Speed multiplier. Default 1. */
  speed?: number | string;
  /** What screen readers announce. Default "Loading". */
  label?: string;
  /** Hide from screen readers when visible text already explains the loader. */
  decorative?: boolean;
  /** Stop the animation where it is. Offer a pause control for long waits (WCAG 2.2.2). */
  paused?: boolean | 'true' | 'false';
  /** "auto" (default) follows the system setting. */
  'reduced-motion'?: 'auto' | 'true' | 'false' | boolean;
  /** Frame-rate cap for canvas loaders, or "none". Default 30 at 32px and below. */
  'max-fps'?: number | string;
  /** Freeze at this many seconds into the animation. */
  time?: number | string;
}

export type MullingStatusProps = DetailedHTMLProps<HTMLAttributes<MullingElement>, MullingElement> &
  MullingStatusAttributes & { class?: string };

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mulling-status': MullingStatusProps;
      /** @deprecated Renamed to <mulling-status>; removed in 2.0. */
      'thinking-loader': MullingStatusProps;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mulling-status': MullingStatusProps;
      /** @deprecated Renamed to <mulling-status>; removed in 2.0. */
      'thinking-loader': MullingStatusProps;
    }
  }
}
