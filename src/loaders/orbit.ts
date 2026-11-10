import type { CssLoaderDef } from '../types';

export const orbit: CssLoaderDef = {
  type: 'orbit',
  name: 'Orbit',
  tech: 'css',
  description: 'Three dots of different sizes circling and pulsing. Busier, for active work.',
  // Dots have minimum sizes so they stay visible at 16–20px, where percentages alone shrink them below 2px.
  reducedMotion: 'Dots stay still and fade together.',
  base: 1.7,
  html: '<div class="mulling-orbit mulling-animate"><i class="mulling-animate"></i><i class="mulling-animate"></i><i class="mulling-animate"></i></div>',
  css: `
.mulling-orbit{position:relative;width:74%;height:74%;animation:mulling-spin var(--mulling-duration) cubic-bezier(.45,.05,.55,.95) infinite}
.mulling-orbit i{position:absolute;border-radius:50%;background:var(--mulling-color);animation:mulling-pulse var(--mulling-duration) ease-in-out infinite}
.mulling-orbit i:nth-child(1){top:0;left:calc(50% - max(12%,2px));width:max(24%,4px);height:max(24%,4px)}
.mulling-orbit i:nth-child(2){bottom:6%;left:4%;width:max(17%,3.2px);height:max(17%,3.2px);opacity:.8;animation-delay:calc(var(--mulling-duration) * -.33)}
.mulling-orbit i:nth-child(3){bottom:10%;right:6%;width:max(12%,2.6px);height:max(12%,2.6px);opacity:.6;animation-delay:calc(var(--mulling-duration) * -.66)}
@keyframes mulling-spin{to{transform:rotate(360deg)}}
@keyframes mulling-pulse{0%,100%{transform:scale(.78)}50%{transform:scale(1.15)}}
`,
};
