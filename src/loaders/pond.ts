import type { CanvasLoaderDef } from '../types';

const TAU = Math.PI * 2;

export const pond: CanvasLoaderDef = {
  type: 'pond',
  name: 'Pond',
  tech: 'canvas',
  description: 'Wobbly rings spreading out from a pulsing center.',
  reducedMotion: 'Rings freeze in place and fade.',
  /** w: size in CSS pixels · t: seconds · c: color */
  paint: (ctx, w, t, c) => {
    const cx = w / 2,
      cy = w / 2;
    ctx.strokeStyle = c;
    ctx.fillStyle = c;
    for (let k = 0; k < 3; k++) {
      const a = (t * 0.55 + k / 3) % 1;
      const r = w * (0.06 + a * 0.38);
      ctx.globalAlpha = (1 - a) ** 1.3;
      ctx.lineWidth = w * (0.05 - 0.03 * a);
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const ang = (i / 48) * TAU;
        const rr = r * (1 + 0.07 * Math.sin(ang * 5 + t * 3 + k * 2));
        const x = cx + Math.cos(ang) * rr,
          y = cy + Math.sin(ang) * rr;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, w * (0.07 + 0.015 * Math.sin(t * 3)), 0, TAU);
    ctx.fill();
  },
};
