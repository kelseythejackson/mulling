import type { CanvasLoaderDef } from '../types';

const TAU = Math.PI * 2;

export const coil: CanvasLoaderDef = {
  type: 'coil',
  name: 'Coil',
  tech: 'canvas',
  description: 'A tapered line that draws itself into a spiral, then unwinds.',
  reducedMotion: 'Shows the full spiral and fades.',
  /** w: size in CSS pixels · t: seconds · c: color */
  paint: (ctx, w, t, c) => {
    const p = (t % 3) / 3;
    const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
    const grow = p < 0.62 ? ease(p / 0.62) : 1 - ease((p - 0.62) / 0.38);
    const maxTheta = 3 * Math.PI * Math.max(0.04, grow);
    const R = w * 0.38,
      cx = w / 2,
      cy = w / 2;
    ctx.strokeStyle = c;
    ctx.fillStyle = c;
    ctx.lineCap = 'round';
    let px = 0,
      py = 0;
    const steps = 70;
    for (let i = 0; i <= steps; i++) {
      const th = (maxTheta * i) / steps;
      const r = R * (1 - th / (3.4 * Math.PI)) + Math.sin(th * 6 + t * 2) * w * 0.008;
      const x = cx + Math.cos(th - Math.PI / 2) * r;
      const y = cy + Math.sin(th - Math.PI / 2) * r;
      if (i > 0) {
        ctx.lineWidth = w * (0.075 - (0.045 * i) / steps);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      px = x;
      py = y;
    }
    ctx.beginPath();
    ctx.arc(px, py, w * 0.045, 0, TAU);
    ctx.fill();
  },
};
