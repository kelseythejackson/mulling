/** Small color helpers, used to pick the blink loader's eye color so it always contrasts with the body. */

export type RGB = [number, number, number];

/** Parses the formats getComputedStyle returns (`rgb()`, `rgba()`) plus hex. Returns null for anything else. */
export function parseColor(value: string): RGB | null {
  const v = value.trim().toLowerCase();
  const rgb = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const hex = v.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4)
      h = h
        .slice(0, 3)
        .split('')
        .map((c) => c + c)
        .join('');
    if (h.length < 6) return null;
    return [Number.parseInt(h.slice(0, 2), 16), Number.parseInt(h.slice(2, 4), 16), Number.parseInt(h.slice(4, 6), 16)];
  }
  return null;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT: RGB = [255, 255, 255];
const DARK: RGB = [27, 31, 46];

/** White or near-black, whichever contrasts more with `body`. Unknown colors get white. */
export function pickEyeColor(body: string): string {
  const c = parseColor(body);
  if (!c) return '#ffffff';
  return contrast(c, LIGHT) >= contrast(c, DARK) ? '#ffffff' : '#1b1f2e';
}

let probe: CanvasRenderingContext2D | null | undefined;

/**
 * Converts any color the browser understands (oklch, color(), color-mix(), named colors...) to `rgb(r, g, b)`
 * by painting one pixel. Falls back to the input where canvas isn't available (some test DOMs).
 */
export function toRgb(value: string, doc: Document): string {
  if (parseColor(value)) return value;
  if (probe === undefined) {
    try {
      const c = doc.createElement('canvas');
      c.width = c.height = 1;
      probe = c.getContext('2d', { willReadFrequently: true });
    } catch {
      probe = null;
    }
  }
  if (!probe) return value;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000';
  probe.fillStyle = value; // ignored if the browser can't parse it, leaving black
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}
