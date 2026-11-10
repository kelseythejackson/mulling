import { describe, expect, it } from 'vitest';
import { contrast, parseColor, pickEyeColor } from '../src/color';
import { due } from '../src/loop';

describe('color helpers', () => {
  it('parses computed and hex colors', () => {
    expect(parseColor('rgb(59, 91, 219)')).toEqual([59, 91, 219]);
    expect(parseColor('rgba(1, 2, 3, 0.5)')).toEqual([1, 2, 3]);
    expect(parseColor('rgb(1 2 3 / 50%)')).toEqual([1, 2, 3]);
    expect(parseColor('#3b5bdb')).toEqual([59, 91, 219]);
    expect(parseColor('#fff')).toEqual([255, 255, 255]);
    expect(parseColor('currentColor')).toBeNull();
  });

  it('picks dark eyes on light bodies and light eyes on dark bodies', () => {
    expect(pickEyeColor('#ffeb3b')).toBe('#1b1f2e');
    expect(pickEyeColor('rgb(26, 35, 126)')).toBe('#ffffff');
    expect(pickEyeColor('not a color')).toBe('#ffffff');
  });

  it('computes WCAG contrast', () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0);
  });
});

describe('frame-rate cap', () => {
  it('draws every frame with no cap', () => {
    expect(due(0, 0)).toBe(true);
  });
  it('draws every second 60Hz frame at a 30fps cap', () => {
    const frame = 1 / 60,
      cap = 1 / 30;
    expect(due(frame, cap)).toBe(false);
    expect(due(frame * 2, cap)).toBe(true);
  });
});
