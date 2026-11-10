/** Copies text and confirms on the button for a moment. The button's new text is announced (aria-live). */
export async function copyText(button: HTMLElement, text: string): Promise<void> {
  const label = button.textContent;
  button.setAttribute('aria-live', 'polite');
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied';
  } catch {
    button.textContent = 'Copy failed'; // clipboard blocked, e.g. in a sandboxed frame
  }
  setTimeout(() => {
    button.textContent = label;
    button.removeAttribute('aria-live');
  }, 1500);
}
