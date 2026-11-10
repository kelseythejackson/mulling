/**
 * Shared live regions for loaders with `announce: 'polite'` (the default).
 *
 * - One visually hidden region per container. The container is normally the page's <body>, but inside an
 *   open modal dialog (`<dialog>` opened with showModal(), or `[aria-modal="true"]`) it's that dialog,
 *   because everything outside a modal is hidden from screen readers.
 * - The region is created as soon as a message is queued and filled a moment later, because screen readers
 *   often ignore a live region that appears with its text already in it.
 * - Messages are gathered for a short moment and spoken once, so several loaders, or fast state changes,
 *   don't talk over each other. Each container (and so each document) has its own queue.
 * - Errors are urgent: a batch containing one goes to a second, assertive region, so it interrupts
 *   other speech instead of waiting behind it.
 */
const DELAY = 250;

const HIDDEN =
  'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap';
const MODAL = 'dialog[open], [aria-modal="true"]';

type Message = { text: string; urgent: boolean };
const queues = new Map<Element, Map<object, Message>>();
const timers = new Map<Element, ReturnType<typeof setTimeout>>();
/** Weak, so a dialog that's removed from the page takes its region with it. */
const regions = { polite: new WeakMap<Element, HTMLElement>(), assertive: new WeakMap<Element, HTMLElement>() };

/** The element a loader's announcements belong in: its nearest open modal, crossing shadow roots, else <body>. */
export function containerFor(el: Element): Element | null {
  let node: Element | null = el;
  while (node) {
    const modal = node.closest(MODAL);
    if (modal) return modal;
    const root = node.getRootNode() as Node & { host?: Element };
    node = root.nodeType === 11 && root.host ? root.host : null; // step out of a shadow root
  }
  return el.ownerDocument.body;
}

function regionIn(container: Element, level: 'polite' | 'assertive' = 'polite'): HTMLElement {
  const existing = regions[level].get(container);
  if (existing && existing.parentNode === container) return existing;
  const region = container.ownerDocument.createElement('div');
  if (level === 'polite') region.setAttribute('role', 'status');
  region.setAttribute('aria-live', level);
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('data-mulling-announcer', '');
  region.style.cssText = HIDDEN;
  container.appendChild(region);
  regions[level].set(container, region);
  return region;
}

function flush(container: Element): void {
  timers.delete(container);
  const queue = queues.get(container);
  queues.delete(container);
  const messages = queue ? [...queue.values()] : [];
  const message = [...new Set(messages.map((m) => m.text))].join('. ');
  if (!message || !container.isConnected) return;
  const region = regionIn(container, messages.some((m) => m.urgent) ? 'assertive' : 'polite');
  if (region.textContent === message) {
    // Screen readers skip a region whose text didn't change, so clear it first to repeat a message.
    region.textContent = '';
    setTimeout(() => {
      region.textContent = message;
    }, 30);
  } else {
    region.textContent = message;
  }
}

/** Queue `text` to be spoken for `owner`, a loader whose host element is `el`. A later call from the same owner replaces it. */
export function announce(owner: object, text: string, el: Element, urgent = false): void {
  const container = containerFor(el);
  if (!container) return;
  cancelAnnouncement(owner); // a loader that moved into or out of a modal speaks only in its new place
  regionIn(container, urgent ? 'assertive' : 'polite'); // exists, empty, before the message is written
  let queue = queues.get(container);
  if (!queue) {
    queue = new Map();
    queues.set(container, queue);
  }
  queue.set(owner, { text, urgent });
  if (!timers.has(container))
    timers.set(
      container,
      setTimeout(() => flush(container), DELAY),
    );
}

/** Drop anything `owner` queued but hasn't been spoken yet. */
export function cancelAnnouncement(owner: object): void {
  for (const queue of queues.values()) queue.delete(owner);
}

/** Internal, for tests: forget every queue, timer and region. Not exported from any entry point. */
export function resetAnnouncer(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  queues.clear();
  if (typeof document !== 'undefined') document.querySelectorAll('[data-mulling-announcer]').forEach((r) => r.remove());
}
