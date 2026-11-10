import type { CssLoaderDef } from './types';

/**
 * Layout shared by every loader.
 * - Each loader sits in a `.mulling-layer`; when the state changes, the old layer fades out over the new one.
 * - Forced-colors mode (e.g. Windows High Contrast) switches to system colors so shapes never disappear.
 *
 * CSS comments are kept out of these strings because they would ship to every user.
 */
export const baseCss = `
.mulling-host{display:inline-grid;place-items:center;width:var(--mulling-size,20px);height:var(--mulling-size,20px);color:inherit;vertical-align:middle;flex:none}
.mulling-wrap{width:100%;height:100%;display:grid;place-items:center;--mulling-color:var(--mulling-set-color,currentColor);--tl-c:var(--mulling-color)}
.mulling-host canvas{display:block;width:100%;height:100%}
:host{display:inline-flex;vertical-align:middle}
.mulling-layer{grid-area:1/1;width:100%;height:100%;display:grid;place-items:center;transition:opacity .2s ease}
.mulling-layer.mulling-in,.mulling-layer.mulling-out{opacity:0}

@media (forced-colors: active){
  .mulling-host{forced-color-adjust:none;color:CanvasText}
  .mulling-host .mulling-wrap{--mulling-color:CanvasText}
  .mulling-host .mulling-mark{--mulling-done:CanvasText;--mulling-error:CanvasText}
}
`;

/** The done and error endings: a ring settles in and the mark draws itself on, then both hold still. */
export const markCss = `
.mulling-mark{width:86%;height:86%;fill:none;stroke:var(--mulling-color);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;overflow:visible}
.mulling-done{stroke:var(--mulling-done,var(--tl-done,var(--mulling-color)))}
.mulling-error{stroke:var(--mulling-error,var(--tl-error,var(--mulling-color)))}
.mulling-mark .mulling-ring{opacity:.35;transform-origin:50% 50%;animation:mulling-ring .45s ease-out both}
.mulling-mark .mulling-stroke{stroke-dasharray:1;stroke-dashoffset:1;animation:mulling-draw .4s .15s ease-out forwards}
.mulling-mark .mulling-dot{stroke-width:2.6;animation:mulling-appear .2s .45s ease-out both}
@keyframes mulling-ring{from{transform:scale(.55);opacity:0}}
@keyframes mulling-draw{to{stroke-dashoffset:0}}
@keyframes mulling-appear{from{opacity:0}}
`;

/**
 * Reduced motion: no movement, only a slow change in opacity, for elements marked `mulling-animate` (or `tl-a`, from before 1.0).
 * The fade stops at 80%: any color with 4.5:1 contrast keeps at least 3:1 there (WCAG 1.4.11).
 * Endings appear fully drawn and fade in once. Calm canvases draw one still frame and fade in CSS,
 * so no JavaScript runs per frame.
 */
export const calmCss = `
.mulling-reduced .mulling-animate,.mulling-reduced .tl-a{animation:mulling-calm 2.6s ease-in-out infinite !important;transform:none !important}
.mulling-reduced .mulling-mark .mulling-animate{animation:mulling-appear .3s ease-out both !important;stroke-dashoffset:0 !important}
.mulling-host canvas.mulling-calm{animation:mulling-calm 2.6s ease-in-out infinite}
.mulling-paused,.mulling-paused *{animation-play-state:paused !important}
@keyframes mulling-calm{0%,100%{opacity:.8}50%{opacity:1}}
`;

/** Styles every loader needs: layout, layers, forced colors, the done/error endings and reduced motion. */
export const coreCss = [baseCss, markCss, calmCss].join('\n');

/* ---------- Injection ----------
 * One growing stylesheet: the core styles, plus each CSS loader's styles the first time that loader is shown.
 * Shadow roots share one constructable sheet; documents (and browsers without constructable sheets) get a <style> tag.
 * Both are updated in place when a new loader's styles are added.
 */

let sheetText = coreCss;
const addedLoaders = new Set<string>();
/** What each root was given: the shared sheet (adopted) or a <style> tag. Checked on every mount, so removed styles come back. */
let applied = new WeakMap<Document | ShadowRoot, HTMLStyleElement | CSSStyleSheet>();
const styleTags = new Set<HTMLStyleElement>();
let sharedSheet: CSSStyleSheet | null | undefined;
/** The last nonce seen, so tags added later (another root, or a replacement for a removed tag) carry it too. */
let knownNonce: string | undefined;

/** One constructable stylesheet shared by every shadow root, instead of a <style> copy in each. */
function getSharedSheet(): CSSStyleSheet | null {
  if (sharedSheet !== undefined) return sharedSheet;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(sheetText);
    sharedSheet = sheet;
  } catch {
    sharedSheet = null; // older browsers and some test DOMs
  }
  return sharedSheet;
}

/** The page's nonce from `<meta property="csp-nonce">`, the convention Vite and other tools use. */
function pageNonce(doc: Document): string | undefined {
  const meta = doc.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]');
  // Browsers hide the nonce attribute's value once the page has a policy, but keep the `nonce` property.
  return (meta && (meta.nonce || meta.getAttribute('nonce') || meta.content)) || undefined;
}

/** Whether `root` still has the styles it was given: page-swap tools can remove tags or reset adopted sheets. */
function stillApplied(root: Document | ShadowRoot): boolean {
  const given = applied.get(root);
  if (!given) return false;
  if ('nodeType' in given) return given.getRootNode() === root;
  return (root as ShadowRoot).adoptedStyleSheets.includes(given);
}

/** Adds the stylesheet to a document or shadow root, again if it has been removed since. */
export function ensureStyles(root: Document | ShadowRoot, nonce?: string): void {
  if (nonce) knownNonce = nonce;
  if (stillApplied(root)) return;
  // nodeType checks instead of instanceof, so this works across frames and test DOMs.
  const isDoc = root.nodeType === 9;

  if (!isDoc && 'adoptedStyleSheets' in root) {
    const sheet = getSharedSheet();
    if (sheet) {
      try {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
        applied.set(root, sheet);
        return;
      } catch {
        // A sheet from another document (e.g. an iframe) can't be adopted: fall back to <style>.
      }
    }
  }

  const doc = (isDoc ? root : root.ownerDocument) as Document;
  const el = doc.createElement('style');
  el.setAttribute('data-mulling', '');
  const n = knownNonce ?? pageNonce(doc);
  if (n) el.nonce = n;
  el.textContent = sheetText;
  if (isDoc) ((root as Document).head ?? (root as Document).documentElement).appendChild(el);
  else root.appendChild(el);
  styleTags.add(el);
  applied.set(root, el);
}

/** Adds a CSS loader's styles to every injected stylesheet, once per definition. */
export function ensureLoaderStyles(def: CssLoaderDef): void {
  const key = `${def.type}\u0000${def.css}`;
  if (addedLoaders.has(key)) return;
  addedLoaders.add(key);
  sheetText += `\n${def.css}`;
  if (sharedSheet) sharedSheet.replaceSync(sheetText);
  for (const el of styleTags) {
    if (el.isConnected) el.textContent = sheetText;
    else styleTags.delete(el);
  }
}

/** Everything a set of loaders needs, as one string, for apps whose CSP means they must ship the CSS themselves. */
export function cssFor(defs: readonly { tech: string; css?: string }[]): string {
  return [coreCss, ...defs.map((d) => (d.tech === 'css' ? (d.css ?? '') : ''))].filter(Boolean).join('\n');
}

/** Internal, for tests: forget which roots have styles. Not exported from any entry point. */
export function resetStyles(): void {
  applied = new WeakMap();
  knownNonce = undefined;
  for (const el of styleTags) el.remove();
  styleTags.clear();
}
