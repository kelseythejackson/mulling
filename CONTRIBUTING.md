# Contributing

Thanks for helping. Bug reports, loader ideas and pull requests are all welcome.

## Set up

Follow [Running locally](README.md#running-locally) in the README: Node 22.23.4 or later, then

```sh
npm run setup
npm run dev   # http://localhost:4321/mulling/
```

The docs site opens with hot reload. Its demos import straight from `src/`, so you see your changes as you make them. The pages are in `site/src/content/docs/`; the API reference is generated from the source's doc comments on every build.

## Add a loader

Every loader must:

1. **Be original.** No copies of other products' or brands' animations.
2. **Have a reduced-motion version** that doesn't move. Fading opacity is fine.
3. **Read well at 16–20px**, the size it'll mostly be used at, as well as at 64px.
4. **Use only `transform` and `opacity`** (CSS loaders), so animation stays smooth.

Steps:

1. Add one file to `src/loaders/`, named after the loader. It exports one object: copy `breath.ts` for a CSS loader or `coil.ts` for a canvas loader. The object is the whole loader: name, description, reduced-motion note, and its markup and styles or its paint function.
   - **CSS:** add the class `tl-a` to every animated element, so the calm version applies. Use `var(--tl-c)` for color and `var(--tl-dur)` for timing, and prefix classes and keyframes with `tl-<name>`.
   - **Canvas:** the paint function draws one frame from `(ctx, size, seconds, color)`. Don't call `requestAnimationFrame` yourself; the shared loop handles timing and pausing.
2. Export it from `src/loaders/index.ts` and add it to `allLoaders`.
3. Add it to the table in `README.md`. The docs site's gallery, playground and loader list read `allLoaders`, so they pick it up by themselves.

A loader built for your own app doesn't need to be in this repo: pass the same object to `use()`.

## Writing docs

Follow [VOICE.md](VOICE.md): the voice, spelling (American), page names and a glossary of plain explanations. After a change that affects bundle size, run `npm run build && npm run sizes` to update the figures the docs print.

## Before opening a pull request

```sh
npm run typecheck
npm test
npm run test:browser
npm run build && npm run test:bundle && npm run test:package && npm run size && npm run check:sizes
npm run build:site && npm run test:site   # if you changed the docs or a loader
```

A new loader changes the screenshots, so the browser tests will fail on purpose. Check the new pictures in `test-results/`, then run `npm run test:browser:update` and commit the updated files in `test/browser/__screenshots__/`.

Turn on reduced motion in your operating system and check the docs site. Include a short screen recording of the new loader at 20px and 64px.

## Workflows

Every action in `.github/workflows` is pinned to a full commit SHA, with its version in a comment:

```yaml
- uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
```

To add one, look up the commit for the release you want (`git ls-remote https://github.com/OWNER/ACTION refs/tags/vX.Y.Z`) and use that. `npm run check:actions` fails on an unpinned action, and CI runs it. Dependabot keeps the pins up to date, so don't update them by hand.

## Code of conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Be kind; assume good intent.
