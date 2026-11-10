import type { CanvasLoaderDef } from '../types';

export const scribble: CanvasLoaderDef = {
  type: 'scribble',
  name: 'Scribble',
  tech: 'canvas',
  description: 'A pen tracing a looping figure, with a tail that thins as it fades.',
  reducedMotion: 'Shows one still stroke that fades.',
  /** w: size in CSS pixels · t: seconds · c: color */
  paint: (ctx, w, t, c) => {
    const cx = w / 2,
      cy = w / 2,
      A = w * 0.34,
      L = 44;
    ctx.strokeStyle = c;
    ctx.lineCap = 'round';
    const pt = (u: number): [number, number] => [
      cx + A * Math.sin(3 * u + 0.5) + Math.sin(u * 13) * w * 0.01,
      cy + A * Math.sin(2 * u) + Math.cos(u * 11) * w * 0.01,
    ];
    const u0 = t * 1.7;
    let prev = pt(u0);
    for (let k = 1; k < L; k++) {
      const cur = pt(u0 - k * 0.035);
      ctx.globalAlpha = 1 - k / L;
      ctx.lineWidth = w * 0.07 * (1 - k / L) + w * 0.01;
      ctx.beginPath();
      ctx.moveTo(prev[0], prev[1]);
      ctx.lineTo(cur[0], cur[1]);
      ctx.stroke();
      prev = cur;
    }
    ctx.globalAlpha = 1;
  },
};
