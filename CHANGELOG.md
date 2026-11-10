# Changelog

This project follows [Semantic Versioning](https://semver.org/).

## 1.0.0 — unreleased

**Renamed to Mulling.** The package is now `mulling`, the element `<mulling-status>` and the React and Vue component `Mulling`. `<thinking-loader>`, `ThinkingLoader` and the old type names still work until 2.0, with a one-time warning. See MIGRATING.md.

The API is now stable: see "Stability" in the README for what that covers. Upgrading from 0.x: see [MIGRATING.md](MIGRATING.md).

### Changed
- **The last of the old "tl" names are gone.** Custom properties are now `--mulling-done`, `--mulling-error` and `--mulling-eye`; custom loaders use `--mulling-color`, `--mulling-duration` and the `mulling-animate` class. The old names (`--tl-done`, `--tl-error`, `--tl-eye`, `--tl-c`, `--tl-dur`, `tl-a`) keep working until 2.0, and a custom loader that uses them warns once. Internal class names are now `mulling-*`. This adds about 0.15 kB compressed
- **`<mulling-status>` reports invalid attributes**, like `mount()` does, instead of silently using the default. The warning names the element and attribute
- **Warnings say what to write instead**: they list the accepted values, suggest the nearest match for a mistyped loader or state ("Did you mean "orbit"?"), and give an example for sizes and speeds. Colors are checked with the browser's CSS parser, so `color: 'blurple'` now warns
- Size budgets raised for these messages, which add about 0.5 kB compressed. Everything is now 9.4 kB; core with one loader 7.2 kB
- **The script-tag build is now `dist/mulling.umd.js`** (was `mulling.umd.cjs`). CDNs serve `.cjs` files with a type browsers won't run, so the documented script tag failed. `unpkg` and `jsdelivr` point at the new file
- **The shared announcer is the default** (`announce: 'polite'`). Loaders are labelled images and changes are spoken through one live region for the page. `announce: 'off'` keeps the old per-loader `role="status"`
- Orbit's dots have minimum sizes, so all three stay visible at 16–24px
- Screenshot tests are taken at device resolution with a pixel-count threshold, so a broken small loader can no longer slip through. The old 1% threshold hid changes to any single 20px loader

### Added
- API reference, generated from the code's documentation, published with the demo at `/api`
- A test that pins every entry point's exports, and a compile-time check that the React and Vue components pass through every option
- A release check that stops `npm publish` while placeholders remain or the version and changelog disagree
- An "Update screenshots" workflow that regenerates screenshots with CI's own browser
- MIGRATING.md

### Removed
- `loaders`, `loaderTypes`, `baseCss`, `markCss` and `calmCss`. See MIGRATING.md for replacements

### Fixed (from the 1.0 code audit)
- A custom loader that throws while drawing no longer stops every other canvas loader on the page. It's reported once and removed
- The animation loop stops completely when no loader can be seen, and restarts when one scrolls into view or the tab comes back. Loaders removed from the page without `destroy()` no longer keep it running, and are forgotten after 30 seconds
- Every option is validated. Invalid values (`speed: NaN`, a negative or huge `size`, `time: Infinity`, an unknown `state`, `maxFps: 0`, an empty label) warn once and use the default, instead of blanking, crashing or leaking. `reducedMotion` and `paused` accept the strings `'true'` and `'false'`
- `update()` and `refresh()` after `destroy()` do nothing, instead of rebuilding a detached loader. `mount()` with no target gives a clear error
- Canvas loaders draw `var(--brand)` and other colors a canvas can't resolve itself, instead of black. Colors are re-read when a color transition on `<html>` or `<body>` ends
- The blink loader's eyes contrast correctly with `oklch()`, `color()` and `color-mix()` colors
- Inside an open modal dialog, announcements go to a live region inside the dialog, where screen readers can hear them
- The live region exists before its first message is written, so screen readers don't miss it; each document and dialog has its own queue
- `done` and `error` are still spoken when the loader is removed straight after
- Switching to decorative cancels a queued announcement
- `announce: 'off'` puts the words inside the status element as hidden text, so changes are actually spoken
- `<thinking-loader decorative="false">` (what React 18 renders for `decorative={false}`) is no longer decorative
- Type declarations work under every TypeScript resolution mode, including `NodeNext`, where they previously failed or silently became `any`
- Every entry point can be `require()`d: there is now a CommonJS build, with its own `.d.cts` types

### Added (from the 1.0 code audit)
- `paused` option (and attribute and prop) to stop and resume the animation, for WCAG 2.2.2
- A type check (Are the Types Wrong?) across every resolution mode, a NodeNext and CommonJS consumer test, Biome linting and formatting, and an `.editorconfig`
- The release workflow runs the browser tests and every check before publishing
- A compile-time check that the Vue component has a prop for every option

### Changed (from the 1.0 code audit)
- Size budgets raised: validation, the sturdier loop and the announcer fixes add about 1.3 kB compressed. Everything is now 8.3 kB; core with one loader 6.1 kB

### Fixed (from the second audit round)
- **Strict CSP:** the tide loader no longer uses inline `style` attributes, which strict policies block (its bars moved in lockstep). The nonce is remembered for every style tag added later, can be set with `<thinking-loader nonce>`, and is read from `<meta property="csp-nonce">` when none is given
- **Moving a `<thinking-loader>`** (a keyed list reorder, `appendChild` elsewhere) keeps the running loader. It no longer restarts or announces its state again; it's only torn down if it's still detached after the current task
- **Page swaps:** styles removed by tools like Turbo or htmx are added back on the next mount, update or refresh, including a shadow root whose adopted sheets were reset. A replaced `<body>` is watched for theme changes. A loader mounted into a detached element gets styles in the document or shadow root it's moved into
- **Reduced motion:** the calm fade stops at 80% opacity instead of 50%, so any color with 4.5:1 contrast keeps at least 3:1 (WCAG 1.4.11). The demo blue went down to 2.2:1 before
- **Errors are announced assertively,** through a second live region, so they aren't queued behind other speech. Other states stay polite
- New tests cover `nonce`, `cssFor()`, `contrastVar`, `refresh()`, element moves, iframes, strict CSP and Vue server rendering
- **`labels` and `states` merge in `update()`.** Changing one label no longer drops the rest; a key set to `undefined` restores its default. The React and Vue components and `<thinking-loader>` still drop an entry when you remove it from the prop or attribute
- **The React component passes `data-*` and `aria-*` props through.** `data-*` go on the wrapper (so `data-testid` works) and `aria-*` on the loader's labelled element (so `aria-describedby` works). They're in the prop types too. The Vue component now puts `aria-*` attributes on the labelled element as well
- **GitHub Actions are pinned to commit SHAs,** with the version in a comment, so a moved or hijacked tag can't change what runs in CI or the release. `npm run check:actions` (in CI and before publishing) fails on an unpinned action, and Dependabot opens monthly pull requests to update the pins
- Size budgets raised by 0.5 kB: these fixes add about 0.3 kB compressed. Everything is now 8.8 kB; core with one loader 6.5 kB

### Docs site
- **Local setup:** `npm run setup` installs both projects; `.nvmrc` pins Node 22.23.4 (the docs site's Astro needs it); `.env.example` lists the optional settings; the README has a "Running locally" section with troubleshooting
- `npm run test:site` serves on a free port, so it no longer collides with `npm run dev` on 4321, and it says what to build when something is missing. CI now builds the library before the browser tests and the site check, which need it
- Fixed: `npm run dev` failed on machines with `@types/node` installed. The API reference type-checked the test files too, and a test had a type error there. It now reads only `src/`
- **A new docs site** (`site/`, built with Astro Starlight) replaces the demo page and the separate TypeDoc pages. It has a landing page with a live state demo, guides split out of the README, React/JS/HTML/Vue code tabs that remember your choice, a loader playground whose snippet always matches what you see, search, and the API reference generated into the same design
- Every demo on the site uses the library's own source, so the docs can't show something the code doesn't do
- A pause control for every loader on the site (WCAG 2.2.2), in the mobile menu too. The landing demo doesn't play by itself under reduced motion
- `npm run test:site` runs axe (WCAG 2.1 AA) on every page in light and dark mode, and checks the pause button, state demo and playground; CI runs it on every push
- The light/dark switcher works where browser storage is blocked (sandboxed frames, strict privacy settings, some in-app browsers). Starlight's theme script crashed there, so switching did nothing; the choice now just isn't remembered between visits
- The Accessibility page now recommends `aria-busy` on the area being updated, and the custom-loader guide explains how forced-colors mode treats loader colors
- **UX audit fixes** (see the audit backlog):
  - Script tag first for beginners: Installation, the quick start and the landing page's Copy button all give a snippet that works pasted into a blank HTML page, and the site check now proves it
  - The quick start shows how to change state in every framework, with a live demo, and a new "Stream a response" guide wires the states to a real `fetch()` stream
  - Gallery tiles are one link each, to the playground with that loader. The playground's code comes in HTML, JS, React and Vue, it has a color control with a contrast check, and its Loader menu sets the loader for the chosen state
  - One pause control, labelled "Pause motion" / "Resume motion", and a notice with a Resume button when a page opens paused
  - The landing page has a menu on phones; state buttons are radio groups (one tab stop, arrow keys); code wraps on phones; "On this page" appears only on pages with 2+ headings
  - The Options page lists every accepted value and every option has its own link; the API reference says where to start and leaves out deprecated aliases
  - Wide code blocks can be scrolled with the keyboard (WCAG 2.1.1), as wide tables already could
- **Content audit fixes:**
  - The sidebar is grouped by task: Get started, Customize, Frameworks, Before you ship, Reference, API reference. The API reference starts with an Overview and is three levels deep, not four
  - New "Choosing a loader" page for designers: which loader suits which moment, size, color and contrast, motion, and how to word labels
  - Introduction now says when Mulling fits and when something else will serve you better
  - Each idea has one home: the streaming code lives in "Stream a response", and endings are explained in "AI states"
  - One name per page ("Loaders and playground", "Content Security Policy", "Upgrade to 1.0"), American spelling throughout, and technical terms explained where a page first uses them
  - Bundle sizes are measured, not typed: `npm run sizes` writes them, the site and README read them, and `npm run check:sizes` (in CI) fails on a hand-typed or outdated figure. Four had gone stale
  - `npm run test:site` checks every internal link and anchor, and that every page is linked from somewhere
  - The README is a short front door that points into the docs site. The site's upgrade page is generated from MIGRATING.md
  - VOICE.md: the voice, style rules, page names and a glossary for anyone writing the docs
  - Fixed: the release check rejected the README's `mulling@1` CDN link

## 0.4.0

Custom loaders, and smaller bundles. `import 'thinking-loaders'` works as before.

### Added
- `use()` registers loaders. A loader is one plain object (`LoaderDef`): a paint function for canvas, or markup, styles and a cycle length for CSS. Registering an existing name replaces it, and mounted loaders switch straight away
- `thinking-loaders/core`: everything except the loaders. With one loader an app ships 4.7 kB compressed, against 6.9 kB for everything
- `thinking-loaders/loaders`: each built-in loader as a separate export, plus `allLoaders` and `stateLoaders` (breath, murmur, tide)
- `getLoader()`, `registeredLoaders()`, `cssFor()` and `coreCss`
- Unregistered loaders warn once and show the first registered loader instead of nothing
- React component: `import { ThinkingLoader } from 'thinking-loaders/react'`. Every option is a prop; a ref exposes `update()`, `refresh()` and `element`; renders a sized placeholder on the server; works in StrictMode
- Vue component: `import { ThinkingLoader } from 'thinking-loaders/vue'`, with template-ref access to the same methods
- `thinking-loaders/react/core` and `thinking-loaders/vue/core`: the components without loaders, for apps that register their own
- React and Vue are optional peer dependencies and are never bundled in
- A bundle check in CI that confirms unused loaders are left out, and that the React entry keeps its loaders; a check that installs the packed package in a fresh project and type-checks and bundles every entry point; size budgets for each way of importing

### Changed
- Each loader's styles are added to the page the first time it's shown, instead of all at once
- Each built-in loader lives in its own file in `src/loaders/`, which is also what the demo's code panel shows
- `LoaderType` now accepts any name, so custom loaders type-check; built-in names still autocomplete (`BuiltInLoaderType` is the strict list). Code with an exhaustive `switch` over `LoaderType` will need a default case
- `<thinking-loader>` accepts any well-formed loader name
- Shorter error messages, since they ship in the bundle
- Type declarations moved to `dist/types/`. Nothing changes for normal imports; it fixes a clash that broke types for the main entry point
- Passing `undefined` for an option that has a default (`type`, `size`, `color`, `speed`, `reducedMotion`, `announce`) now uses the default instead of breaking the loader. Framework props often arrive as `undefined`

### Removed
- `loaderCss`, `isCssLoader` and the internal fixed lists of loaders and painters. Use `getLoader(type).css`, or import the loader object

## 0.3.0

AI states. No breaking changes: code that only uses `type` works as before.

### Added
- `state` option: `thinking`, `searching`, `writing`, `done` and `error`. Each working state shows a loader; changing state cross-fades over 0.2 s
- `done` and `error` endings: a ring settles in and a check or exclamation mark draws itself on, then holds still. With reduced motion they appear fully drawn
- `states` option to choose the loader for each working state, and `labels` to choose what screen readers hear in each state
- `announce: 'polite'`: one shared, debounced live region for the whole page, instead of each loader being its own status element. Opt-in for now; it becomes the default in 1.0
- Web component attributes: `state`, `announce`, `loader-thinking`/`-searching`/`-writing`, `label-thinking`/`-searching`/`-writing`/`-done`/`-error`
- `markCss`, `loaderStates`, `defaultStateLoaders` and `defaultStateLabels` exports
- Tests for states, cross-fades, endings and the announcer, plus screenshots of every state in all four display modes

### Changed
- Bundle size budget raised from 6 kB to 7 kB (brotli). States, endings, cross-fades and the announcer add about 1.2 kB; the full library is now 6.3 kB. Per-loader imports, planned for 1.0, will let apps ship only what they use

### Fixed
- Removing an attribute from `<thinking-loader>` now resets that option to its default, instead of keeping the last value

## 0.2.0

Faster, sturdier, better tested. No breaking changes.

### Added
- `maxFps` option: canvas loaders 32px and smaller now draw at most 30 frames a second by default
- `time` option: freeze a loader at a set moment, for screenshot tests and static previews
- `refresh()` on the handle and the web component, to re-read colors after unusual theme changes
- JSX types for `<thinking-loader>`: `import type {} from 'thinking-loaders/jsx'`
- `getStats()` now reports `frameMs`, the time spent drawing the last frame
- Browser test suite: screenshots in light, dark, reduced-motion and forced-colors modes; frame-rate, off-screen, theme and performance checks

### Changed
- Web components share one stylesheet instead of each adding its own `<style>` tag
- With reduced motion, canvas loaders draw one still frame and fade with CSS, instead of redrawing every frame
- Canvas colors update when the theme changes, instead of being re-read every second
- Canvas loaders redraw sharply when a window moves to a screen with a different pixel density

### Fixed
- Loaders no longer disappear in Windows High Contrast and other forced-colors modes
- The `blink` loader's eyes now contrast with any body color, instead of always being white

## 0.1.0

First public version.

- Eight loaders: `breath`, `orbit`, `tide` and `blink` (CSS); `coil`, `murmur`, `scribble` and `pond` (canvas)
- `mount()` function and `<thinking-loader>` web component
- Reduced-motion support that follows the system setting, with a calm version of every loader
- Shared canvas loop that pauses off-screen loaders and hidden tabs
- Screen-reader labels, plus a `decorative` mode
