# Mulling

**Show what the AI is working on, not just that it's busy.**

Calm, accessible loaders for AI interfaces. Tell Mulling what the AI is doing (thinking, searching, writing, done or error) and it cross-fades to match, while screen readers hear each change once. Eight loaders, each with a calm version for reduced motion. React, Vue, or anywhere as `<mulling-status>`. <!-- size:everything -->9.6 kB<!-- /size -->, no dependencies.

**[Read the docs →](https://kelseythejackson.github.io/mulling/)** · [Try the playground](https://kelseythejackson.github.io/mulling/guides/loaders/#playground)

<!-- Add a GIF of the gallery here: it's the first thing people look at. -->

Formerly `thinking-loaders`. Upgrading? See [MIGRATING.md](MIGRATING.md).

## Install

Paste this into any HTML page, with no build step:

```html
<script src="https://cdn.jsdelivr.net/npm/mulling@1/dist/mulling.umd.js"></script>
<script>
  Mulling.defineElement();
</script>

<mulling-status state="thinking"></mulling-status>
```

Or, in a project with a bundler such as Vite:

```sh
npm install mulling
```

## Follow the AI

Change the state as the AI works. Each change cross-fades, and screen readers hear it once.

```js
const status = document.querySelector("mulling-status");

status.setAttribute("state", "searching"); // the AI is using a tool
status.setAttribute("state", "writing"); // the first words arrived
status.setAttribute("state", "done"); // a check mark draws on, then holds still
```

In React, `<Mulling state={status} />` from `mulling/react`; in Vue, `<Mulling :state="status" />` from `mulling/vue`.

## Learn more

| To…                                              | Read                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Get a loader on screen                           | [Quick start](https://kelseythejackson.github.io/mulling/start/quick-start/)         |
| Wire it to a streaming response                  | [Stream a response](https://kelseythejackson.github.io/mulling/guides/streaming/)    |
| Pick a loader, size, color and words             | [Choosing a loader](https://kelseythejackson.github.io/mulling/guides/choosing/)     |
| See all eight and try every option               | [Loaders and playground](https://kelseythejackson.github.io/mulling/guides/loaders/) |
| Use React, Vue or TypeScript                     | [Frameworks](https://kelseythejackson.github.io/mulling/frameworks/react/)           |
| Look up an option                                | [Options](https://kelseythejackson.github.io/mulling/reference/options/)             |
| Check accessibility, bundle size or a strict CSP | [Before you ship](https://kelseythejackson.github.io/mulling/accessibility/)         |
| Know what can change between versions            | [Stability](https://kelseythejackson.github.io/mulling/reference/stability/)         |

## Running locally

### Prerequisites

| Tool               | Version                                        | Why                                                                                      |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Node.js            | 22.23.4 or later (pinned in `.nvmrc`)          | The docs site's Astro 7.4.7 refuses older versions; several dev tools need Node 20 or 22 |
| npm                | 10 or later (comes with Node 22)               | Installs from the committed lockfiles                                                    |
| Git                | any recent version                             | To clone the repository                                                                  |
| Chromium or Chrome | only for the browser tests and the site check  | See step 6                                                                               |
| Network access     | for installing, and for `npm run test:package` | That check installs the packed library from npm into a temporary project                 |

The published library supports Node 18 and later (`"engines"` in `package.json`). The higher version is only for working on this repository.

### Set up

1. Clone the repository and enter it:

   ```sh
   git clone https://github.com/kelseythejackson/mulling.git
   cd mulling
   ```

2. Use the pinned Node version. With [nvm](https://github.com/nvm-sh/nvm):

   ```sh
   nvm install   # reads .nvmrc
   node -v       # v22.23.4 or later
   ```

3. Install the dependencies of both the library and the docs site, which has its own `package.json`:

   ```sh
   npm run setup   # npm ci, then npm ci --prefix site
   ```

4. Environment variables: none are required. `.env.example` lists the optional ones and what they do. They're read from your shell, not from a `.env` file.

5. Start the docs site, with live demos that import straight from `src/`:

   ```sh
   npm run dev
   ```

6. To run the browser tests and the site check, install browsers. The two use different Playwright versions, so each needs its own:

   ```sh
   npx playwright install chromium                     # for npm run test:browser
   npx --prefix site playwright-core install chromium  # for npm run test:site
   ```

   Or skip both downloads and use an installed Chrome: `export CHROME_PATH=/path/to/chrome`.

### Check it works

- **Docs site:** open **http://localhost:4321/mulling/**. The page title is "Mulling: calm, accessible loaders for AI interfaces". The site lives under `/mulling/`, so `http://localhost:4321/` on its own shows a 404.
- **Unit tests:** `npm test` ends with `Tests  114 passed`.
- **Library build:** `npm run build` writes `dist/`, including `dist/mulling.umd.js`, the script-tag file.
- **Everything else** (after `npm run build` and `npm run build:site`):

  ```sh
  npm run test:browser   # 55 browser tests: screenshots, behavior, the CDN snippet
  npm run test:site      # every page in light and dark: accessibility, links, controls
  ```

### All scripts

```sh
npm run dev          # docs site with live demos and hot reload, at http://localhost:4321/mulling/
npm test             # unit tests
npm run test:types   # JSX typing tests
npm run test:browser # browser tests: screenshots, frame rate, performance budget (after build)
npm run test:browser:update  # accept intentional visual changes
npm run build        # library build into dist/
npm run test:bundle  # unused loaders are left out of a bundle (after build)
npm run test:package # installs the packed package in a fresh project and uses every entry point (after build; needs network)
npm run size         # bundle-size budgets for each way of importing (after build)
npm run sizes        # writes the measured sizes the docs print (after build); check:sizes verifies them
npm run build:site   # docs site into site/dist
npm run test:site    # every page: axe (WCAG 2.1 AA) in light and dark, links, and the site's controls (after build and build:site)
```

### Troubleshooting

| You see                                                                          | Cause                                                                                         | Fix                                                                                                |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `sh: astro: not found` from `npm run dev`                                        | The docs site's dependencies aren't installed; `npm install` at the root doesn't install them | `npm run setup`                                                                                    |
| `npm warn EBADENGINE Unsupported engine` during setup, then errors from Astro    | Node is older than 22.23.4                                                                    | `nvm install`, or install Node 22.23.4 or later                                                    |
| A 404 at `http://localhost:4321/`                                                | The site is served under `/mulling/`                                                          | Open `http://localhost:4321/mulling/`                                                              |
| `Dev server already running at http://localhost:4321`                            | An earlier `npm run dev` is still running in the background                                   | Open `http://localhost:4321/mulling/`, or stop it: `npx --prefix site astro dev stop`              |
| `npm run dev` prints port 4322 or higher                                         | Another program is using port 4321                                                            | Open the printed address plus `/mulling/`                                                          |
| `Executable doesn't exist at …/chromium…`                                        | Playwright's browser isn't installed, or was installed for the other Playwright version       | Run the install command for the script that failed (step 6), or set `CHROME_PATH`                  |
| `dist/mulling.umd.js is missing` or `Build the library: run npm run build first` | The browser tests and the site check load the built library                                   | `npm run build`                                                                                    |
| `Build the docs site: run npm run build:site first`                              | `npm run test:site` checks the built site                                                     | `npm run build:site`                                                                               |
| `npm run test:package` fails while installing                                    | It installs from the npm registry                                                             | Run it with network access                                                                         |
| `npm run check:sizes` says sizes are out of date                                 | A change altered the bundle size                                                              | `npm run build && npm run sizes`, then commit `site/src/data/sizes.json`                           |

See [CONTRIBUTING.md](CONTRIBUTING.md) to add a loader, and [VOICE.md](VOICE.md) for how the docs are written.

## License

[MIT](LICENSE)
