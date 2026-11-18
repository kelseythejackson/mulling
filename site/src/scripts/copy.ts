/**
 * Copies text and confirms on the button for a moment. The result is also spoken through one shared,
 * visually hidden live region: a button's own text change isn't reliably announced, and buttons with an
 * aria-label don't change their accessible name when their text does.
 */
const original = new WeakMap<HTMLElement, string>();
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
let region: HTMLElement | undefined;

function say(message: string): void {
  if (!region) {
    region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.className = 'sr-only';
    document.body.append(region);
  }
  region.textContent = '';
  // Written a moment later, so the same message twice in a row is still spoken.
  setTimeout(() => {
    if (region) region.textContent = message;
  }, 50);
}

/**
 * The Clipboard API only exists on secure pages (https or localhost). On a plain-http address, such as
 * a laptop's network IP during a demo, fall back to the older copy command.
 */
async function writeText(text: string): Promise<void> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // blocked (e.g. a sandboxed frame): try the fallback below
    }
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  const focused = document.activeElement as HTMLElement | null;
  document.body.append(area);
  area.select();
  try {
    if (!document.execCommand('copy')) throw new Error('copy command refused');
  } finally {
    area.remove();
    focused?.focus();
  }
}

export async function copyText(button: HTMLElement, text: string): Promise<void> {
  // Remember the text from before the first click, so quick repeat clicks don't make "Copied" permanent.
  if (!original.has(button)) original.set(button, button.textContent ?? '');
  clearTimeout(timers.get(button));
  try {
    await writeText(text);
    button.textContent = 'Copied';
    button.removeAttribute('title');
    say('Copied to the clipboard');
  } catch {
    button.textContent = 'Copy blocked';
    button.title = 'Your browser blocked the clipboard. Select the code and copy it by hand.';
    say('Your browser blocked copying. Select the code and copy it by hand.');
  }
  timers.set(
    button,
    setTimeout(() => {
      button.textContent = original.get(button) ?? '';
    }, 1500),
  );
}
