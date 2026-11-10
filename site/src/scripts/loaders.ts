// Registers <mulling-status> from the library's source, and applies the site-wide pause setting.
// Every demo on the site is a <mulling-status>: its shadow root keeps the docs theme's CSS out.
import { defineElement } from 'mulling';

defineElement();

const KEY = 'mulling-site-paused';

export function sitePaused(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false; // storage can be unavailable (private modes, sandboxed frames)
  }
}

/** Pause or resume every loader on the page (WCAG 2.2.2), and remember the choice for later pages. */
export function setSitePaused(paused: boolean): void {
  for (const el of document.querySelectorAll('mulling-status')) el.toggleAttribute('paused', paused);
  document.documentElement.toggleAttribute('data-loaders-paused', paused);
  try {
    localStorage.setItem(KEY, paused ? '1' : '0');
  } catch {
    /* not remembered; still applies to this page */
  }
  // The visible text names the action, so it changes; there's no aria-pressed, which would contradict it.
  for (const t of document.querySelectorAll('[data-pause-text]')) t.textContent = paused ? 'Resume motion' : 'Pause motion';
  if (!paused) notice?.remove();
}

let notice: HTMLElement | undefined;

/**
 * A paused choice carries over to later pages. Without a visible sign, frozen loaders look broken,
 * so a page that opens paused says so, with a way to resume.
 */
function showPausedNotice(): void {
  notice = document.createElement('div');
  notice.className = 'site-paused-notice';
  notice.innerHTML = '<span>Animations are paused.</span> <button type="button">Resume</button>';
  notice.querySelector('button')!.addEventListener('click', () => setSitePaused(false));
  document.body.append(notice);
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-pause-all]')) {
  b.addEventListener('click', () => setSitePaused(!document.documentElement.hasAttribute('data-loaders-paused')));
}

if (sitePaused()) {
  setSitePaused(true);
  showPausedNotice();
}
