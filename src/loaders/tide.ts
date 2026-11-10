import type { CssLoaderDef } from '../types';

export const tide: CssLoaderDef = {
  type: 'tide',
  name: 'Tide',
  tech: 'css',
  description: 'Five rounded bars rising unevenly, like a voice level. Suits streaming output.',
  reducedMotion: 'Bars hold still and fade.',
  base: 1.3,
  // Each bar's offset comes from the stylesheet, not a style attribute, which strict CSPs block.
  html: '<div class="mulling-tide"><i class="mulling-animate"></i><i class="mulling-animate"></i><i class="mulling-animate"></i><i class="mulling-animate"></i><i class="mulling-animate"></i></div>',
  css: `
.mulling-tide{display:flex;gap:9%;align-items:center;width:70%;height:62%}
.mulling-tide i{flex:1;height:100%;border-radius:99px;background:var(--mulling-color);animation:mulling-tide var(--mulling-duration) ease-in-out infinite;animation-delay:calc(var(--mulling-duration) * var(--mulling-d,0))}
.mulling-tide i:nth-child(2){--mulling-d:-.14}.mulling-tide i:nth-child(3){--mulling-d:-.31}.mulling-tide i:nth-child(4){--mulling-d:-.2}.mulling-tide i:nth-child(5){--mulling-d:-.42}
@keyframes mulling-tide{0%,100%{transform:scaleY(.25)}40%{transform:scaleY(1)}70%{transform:scaleY(.45)}}
`,
};
