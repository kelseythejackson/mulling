import type { CssLoaderDef } from '../types';

/** The eyes use --mulling-eye if the page sets it, else --mulling-eye-auto, which the library sets to contrast with the body. */
export const blink: CssLoaderDef = {
  type: 'blink',
  name: 'Blink',
  tech: 'css',
  description: 'A small character that glances left and right and blinks.',
  reducedMotion: 'Eyes stay forward and fade gently.',
  base: 4.2,
  contrastVar: '--mulling-eye-auto',
  html: '<div class="mulling-blink"><div class="mulling-eyes mulling-animate"><i class="mulling-animate"></i><i class="mulling-animate"></i></div></div>',
  css: `
.mulling-blink{width:74%;height:70%;border-radius:46% 54% 50% 50%/55% 50% 50% 45%;background:var(--mulling-color);display:grid;place-items:center}
.mulling-blink .mulling-eyes{display:flex;gap:20%;width:56%;justify-content:center;animation:mulling-look var(--mulling-duration) ease-in-out infinite}
.mulling-blink i{width:18%;aspect-ratio:1/1.5;background:var(--mulling-eye,var(--tl-eye,var(--mulling-eye-auto,#fff)));border-radius:50%;animation:mulling-blinking var(--mulling-duration) infinite}
@keyframes mulling-look{0%,18%,82%,100%{transform:translateX(0)}28%,44%{transform:translateX(-16%)}56%,72%{transform:translateX(16%)}}
@keyframes mulling-blinking{0%,46%,52%,88%,92%,100%{transform:scaleY(1)}49%,90%{transform:scaleY(.1)}}
@media (forced-colors: active){.mulling-host .mulling-blink i{background:Canvas}}
`,
};
