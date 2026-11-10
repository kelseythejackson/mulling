// A one-of-many choice as a radio group (the WAI-ARIA pattern): one tab stop for the whole group,
// arrow keys move the choice, Home and End jump to the ends. Markup: role="radiogroup" on the container,
// role="radio" with aria-checked on each button, tabindex="0" on the checked one and "-1" on the rest.

export interface RadioGroup {
  /** Marks `b` checked without calling onSelect (for changes the page makes itself, like autoplay). */
  check(b: HTMLButtonElement): void;
}

export function radioGroup(group: HTMLElement, onSelect: (b: HTMLButtonElement) => void): RadioGroup {
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('[role=radio]')];
  const check = (b: HTMLButtonElement) => {
    for (const o of buttons) {
      o.setAttribute('aria-checked', String(o === b));
      o.tabIndex = o === b ? 0 : -1;
    }
  };
  const choose = (b: HTMLButtonElement, focus: boolean) => {
    check(b);
    if (focus) b.focus();
    onSelect(b);
  };
  for (const b of buttons) {
    b.addEventListener('click', () => choose(b, false));
    b.addEventListener('keydown', (e) => {
      const i = buttons.indexOf(b);
      const last = buttons.length - 1;
      const to: Record<string, number> = {
        ArrowRight: i === last ? 0 : i + 1,
        ArrowDown: i === last ? 0 : i + 1,
        ArrowLeft: i === 0 ? last : i - 1,
        ArrowUp: i === 0 ? last : i - 1,
        Home: 0,
        End: last,
      };
      if (!(e.key in to)) return;
      e.preventDefault();
      choose(buttons[to[e.key]], true);
    });
  }
  return { check };
}
