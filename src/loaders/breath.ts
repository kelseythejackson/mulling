import type { CssLoaderDef } from '../types';

export const breath: CssLoaderDef = {
  type: 'breath',
  name: 'Breath',
  tech: 'css',
  description: 'A soft blob that slowly swells and changes shape. Calm, for long waits.',
  reducedMotion: 'Fades in and out in place.',
  base: 3.2,
  html: '<div class="mulling-breath mulling-animate"></div>',
  css: `
.mulling-breath{width:72%;height:72%;background:var(--mulling-color);border-radius:42% 58% 55% 45%/48% 42% 58% 52%;animation:mulling-breath var(--mulling-duration) ease-in-out infinite}
@keyframes mulling-breath{
  0%,100%{transform:scale(.84) rotate(0deg);border-radius:42% 58% 55% 45%/48% 42% 58% 52%}
  50%{transform:scale(1.04) rotate(50deg);border-radius:58% 42% 45% 55%/55% 58% 42% 45%}
}
`,
};
