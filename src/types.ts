/** Draws one frame at `seconds` into a square of side `size` CSS pixels. Called by the shared loop. */
export type Painter = (ctx: CanvasRenderingContext2D, size: number, seconds: number, color: string) => void;

/** Names of the loaders that ship with the library. */
export type BuiltInLoaderType = 'breath' | 'orbit' | 'tide' | 'blink' | 'coil' | 'murmur' | 'scribble' | 'pond';
export type CssLoaderType = 'breath' | 'orbit' | 'tide' | 'blink';
export type CanvasLoaderType = 'coil' | 'murmur' | 'scribble' | 'pond';

/**
 * Any registered loader. Built-in names autocomplete; any other string works once a loader
 * with that `type` has been passed to `use()`.
 */
export type LoaderType = BuiltInLoaderType | (string & {});

interface LoaderBase {
  /** Unique name, used as `type` in `mount()` and on `<mulling-status>`. Lowercase letters, digits and hyphens. */
  type: string;
  /** Display name for docs and pickers. */
  name: string;
  /** One sentence on what it looks like and what it suits. */
  description: string;
  /** What the reduced-motion version looks like. Every loader must have one. */
  reducedMotion: string;
}

/**
 * A loader drawn with markup and CSS.
 * - Mark every animated element with the class `mulling-animate` (`tl-a` still works until 2.0), so reduced motion swaps its animation for a fade.
 * - Use `var(--mulling-color)` for color and `var(--mulling-duration)` for the cycle length, so `color` and `speed` work. (`--tl-c` and `--tl-dur` still work until 2.0.)
 * - Prefix classes and keyframes with something unique to the loader.
 */
export interface CssLoaderDef extends LoaderBase {
  tech: 'css';
  /** Markup placed inside the loader's wrapper. */
  html: string;
  /** Rules and keyframes. Added to the page the first time the loader is used. */
  css: string;
  /** Length of one cycle in seconds at speed 1. */
  base: number;
  /**
   * Optional: a CSS custom property set to white or near-black, whichever contrasts more with the loader color.
   * The blink loader uses it for its eyes.
   */
  contrastVar?: string;
}

/** A loader drawn on canvas by a painter function. The shared loop handles timing, sizing, color and pausing. */
export interface CanvasLoaderDef extends LoaderBase {
  tech: 'canvas';
  paint: Painter;
}

export type LoaderDef = CssLoaderDef | CanvasLoaderDef;

/** Details about a registered loader, for docs and pickers. */
export interface LoaderInfo {
  type: LoaderType;
  name: string;
  tech: 'css' | 'canvas';
  description: string;
  reducedMotion: string;
}
