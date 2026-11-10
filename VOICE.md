# Voice and style

How Mulling's docs, README and console messages are written. The readers are designers and developers, so every page should make sense to both.

## Voice

| Attribute | Means | Not |
| --- | --- | --- |
| Calm | Steady, unhurried, no hype. A problem comes with its fix | Breezy, jokey or alarmed |
| Direct | The action first, then the reason. Second person, present tense | Bossy or curt; no "simply" or "just" |
| Precise | Real numbers, names and versions a reader can check | Dense: precision without explanation |
| Clear to designers and developers | Code terms explained for designers, design terms (contrast, easing) for developers, the first time a page uses them | Talking down, or explaining at length what both already know |

### Do

- Lead each page and section with what the reader can do or will get.
- Name the outcome before the mechanism: "loaders never talk over each other", then "because they share one announcer".
- Keep sentences under 25 words and paragraphs to three sentences or fewer.
- Link to the page that explains something instead of explaining it again.

### Don't

- Don't use a technical term without a plain explanation the first time a page uses it (see the glossary below).
- Don't hedge in brackets. Say who it applies to and what to do.
- Don't describe internals unless the reader has to act on them.
- Don't type a bundle size. Pages read sizes from `site/src/data/sizes.json`; `npm run check:sizes` fails otherwise.

### Example

Before: *Registration is explicit on purpose: nothing depends on an import's side effects, so bundlers can safely drop the loaders you don't use.*

After: *You choose which loaders to include. Any you don't import are left out of your bundle.*

## Style

- **Spelling:** American English (color, behavior, customize), in prose, code comments and console messages.
- **The name:** "Mulling" for the library. `mulling` only for the package name in code.
- **Quotation marks:** curly (“ ”) in prose; straight quotes only inside code.
- **Lists:** a bold lead-in only when each item defines something ("**Props:** every option is a prop"). Otherwise plain items.
- **Numbers:** numerals for every number with a unit (20px, 5 seconds, 3:1).
- **Headings:** sentence case. Page titles are nouns ("Bundle size"); a page that walks through one job may start with a verb ("Stream a response").

## Page names

Use the same name wherever a page is mentioned, linked or listed:

| Page | Name |
| --- | --- |
| `guides/loaders` | Loaders and playground |
| `guides/csp` | Content Security Policy |
| `reference/migrating` | Upgrade to 1.0 |
| `guides/choosing` | Choosing a loader |

## Glossary

Explain a term in these words the first time a page uses it.

| Term | Plain explanation |
| --- | --- |
| live region | a hidden part of the page that screen readers read aloud when it changes |
| announcer | Mulling's one live region for the whole page, so loaders never talk over each other |
| polite / assertive | polite waits until the screen reader finishes speaking; assertive interrupts it |
| registry, register | the list of loaders Mulling can show; `use()` adds to it |
| entry point | a path you can import from, such as `mulling/core` |
| bundler | the build tool that packages your app's code, such as Vite or webpack |
| tree-shaking | a bundler leaving out code your app never imports |
| reduced motion | the system setting people turn on when movement on screen is uncomfortable for them |
| forced colors | modes such as Windows High Contrast, where the system replaces a page's colors |
| shadow root | the element's private inside, which your page's CSS can't reach |
| nonce | a one-time code your security policy uses to allow a `<style>` tag |
