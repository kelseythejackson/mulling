import type { CanvasLoaderDef } from '../types';

const TAU = Math.PI * 2;

export const murmur: CanvasLoaderDef = {
  type: 'murmur',
  name: 'Murmur',
  tech: 'canvas',
  description: 'A small flock of dots swirling together with short trails.',
  reducedMotion: 'Flock freezes in place and fades.',
  /** w: size in CSS pixels · t: seconds · c: color */
  paint: (ctx, w, t, c) => {
    const N = 16,
      cx = w / 2,
      cy = w / 2;
    ctx.fillStyle = c;
    for (let i = 0; i < N; i++) {
      for (let k = 3; k >= 0; k--) {
        const tt = t - k * 0.045;
        const ph = (i / N) * TAU;
        const ang = tt * 1.6 + ph + Math.sin(tt * 0.9 + i) * 0.45;
        const rad = w * (0.2 + 0.13 * Math.sin(tt * 1.3 + i * 1.7));
        const s = w * (0.022 + (0.016 * (i % 3)) / 2) * (1 - k * 0.2);
        ctx.globalAlpha = (1 - k * 0.24) * (0.55 + 0.45 * ((i % 4) / 3));
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.85, s, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },
};
