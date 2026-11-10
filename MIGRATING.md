# Upgrade to 1.0

1.0 freezes the API, and renames the library. Check the five points below.

## 1. The library is now called Mulling

| Before | Now |
| --- | --- |
| `npm install thinking-loaders` | `npm install mulling` |
| `import … from 'thinking-loaders'` (and `/core`, `/loaders`, `/react`, `/vue`, `/jsx`) | `import … from 'mulling'` (and the same subpaths) |
| `<thinking-loader>` | `<mulling-status>` |
| `ThinkingLoader` (React and Vue) | `Mulling` |
| `ThinkingLoaderProps`, `ThinkingLoaderRef`, `ThinkingLoaderElement` | `MullingProps`, `MullingRef`, `MullingElement` |
| `ThinkingLoaders.defineElement()` (script tag) | `Mulling.defineElement()` |

The package name and imports must change. The old tag, component and type names keep working until 2.0: `<thinking-loader>` renders exactly like `<mulling-status>` and logs one warning. CSS names change too, and the old ones keep working until 2.0:

| Before | Now |
| --- | --- |
| `--tl-done`, `--tl-error`, `--tl-eye` (set on your page) | `--mulling-done`, `--mulling-error`, `--mulling-eye` |
| `var(--tl-c)`, `var(--tl-dur)` (in custom loaders) | `var(--mulling-color)`, `var(--mulling-duration)` |
| class `tl-a` (in custom loaders) | class `mulling-animate` |

A custom loader that uses the old names logs one warning. Other class names inside loaders (once `tl-*`, now `mulling-*`) are internal; don't style them.

## 2. Screen readers now use the shared announcer by default

`announce` defaults to `'polite'` (it was `'off'`). Changes are spoken through one hidden live region for the page, and each loader is a labelled image (`role="img"`) instead of its own `role="status"` element.

- **Most apps:** nothing to do. Remove any `announce: 'polite'` you added; it's now the default.
- **If your app already announces progress itself**, add `announce: 'off'` (attribute `announce="off"`). The loader is then its own `role="status"` element with its words as hidden text inside. Before 1.0 the words were only in `aria-label`, which most screen readers don't announce when it changes, so in practice 0.x was silent here.
- **Tests that query `role="status"`** on the loader should query `role="img"`, or the shared region: `[data-mulling-announcer]`.

## 3. Removed exports

| Removed | Use instead |
| --- | --- |
| `loaders` | `allLoaders` (the definitions, which include name and description), or `registeredLoaders()` |
| `loaderTypes` | `allLoaders.map((l) => l.type)` |
| `baseCss`, `markCss`, `calmCss` | `coreCss`, or `cssFor([...loaders])` for exactly what some loaders need |

## 4. From 0.3 or earlier: loaders are registered

If you're coming from 0.3, `import 'mulling'` still registers every loader, so nothing changes. To ship less, see [Bundle size](https://kelseythejackson.github.io/mulling/guides/bundle-size/). `LoaderType` accepts any name now, so custom loaders type-check; use `BuiltInLoaderType` where you want the strict list.

## 5. Orbit looks slightly different at small sizes

Its dots now have minimum sizes, so all three stay visible at 16–24px. If you have screenshot tests of your own app that include orbit at those sizes, update them.
