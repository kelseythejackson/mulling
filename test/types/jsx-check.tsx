// Type-only test: compiles if the JSX typings work, fails if they don't. Run with `npm run test:types`.
import type {} from 'mulling/jsx';

export const ok = (
  <div>
    <mulling-status type="coil" size={20} label="Thinking" />
    <mulling-status type="tide" decorative reduced-motion="true" max-fps="none" time={1.2} class="x" />
  </div>
);

export const withState = <mulling-status state="searching" announce="polite" label-done="Answer ready" />;

// @ts-expect-error unknown states are rejected
export const badState = <mulling-status state="pondering" />;

// Custom loaders registered with use() can be named too.
export const custom = <mulling-status type="sparkle" loader-writing="my-writer" />;

export const el: HTMLElementTagNameMap['mulling-status'] = document.createElement('mulling-status');
el.refresh();

// Built-in names still autocomplete: this is the literal union, not just string.
import type { BuiltInLoaderType, LoaderDef } from 'mulling';
export const builtIn: BuiltInLoaderType = 'coil';
// @ts-expect-error not a built-in
export const notBuiltIn: BuiltInLoaderType = 'sparkle';

// Custom loader definitions are type-checked.
export const def: LoaderDef = { type: 'x', name: 'X', tech: 'canvas', description: '', reducedMotion: '', paint: () => {} };
// @ts-expect-error a CSS loader needs html, css and base
export const badDef: LoaderDef = { type: 'x', name: 'X', tech: 'css', description: '', reducedMotion: '' };
