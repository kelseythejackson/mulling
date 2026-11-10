// Docs site for mulling: design direction A, "Quiet Instrument".
// Monochrome, one accent colour, so the loaders are the only moving, coloured things on the page.
import { fileURLToPath } from 'node:url';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';

const lib = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));

export default defineConfig({
  // GitHub Pages serves a project site from /<repo>/; set SITE_BASE='/' for a custom domain.
  site: process.env.SITE_URL ?? 'https://kelseythejackson.github.io',
  base: process.env.SITE_BASE ?? '/mulling',
  integrations: [
    starlight({
      title: 'Mulling',
      description:
        'Thinking, searching, writing, done. Eight small loaders with reduced-motion versions and screen-reader announcements built in.',
      logo: { light: './src/assets/logo.svg', dark: './src/assets/logo-dark.svg', replacesTitle: false },
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/kelseythejackson/mulling' }],
      editLink: { baseUrl: 'https://github.com/kelseythejackson/mulling/edit/main/site/' },
      customCss: ['./src/styles/theme.css'],
      head: [
        {
          // Runs before Starlight's theme script. Where storage is blocked (sandboxed frames, strict privacy
          // settings, some in-app browsers) even reading `localStorage` throws, which stopped the light/dark
          // switcher working at all. Swap in an in-memory store, so switching works and just isn't remembered.
          tag: 'script',
          content: `(()=>{try{const s=window.localStorage,k='__mulling_probe__';s.setItem(k,k);s.removeItem(k)}catch{const m=new Map();const mem={getItem:(k)=>(m.has(k)?m.get(k):null),setItem:(k,v)=>{m.set(k,String(v))},removeItem:(k)=>{m.delete(k)},clear:()=>m.clear(),key:(i)=>[...m.keys()][i]??null,get length(){return m.size}};try{Object.defineProperty(window,'localStorage',{value:mem,configurable:true})}catch{}}})();`,
        },
      ],
      expressiveCode: {
        themes: ['github-dark', 'github-light'],
        styleOverrides: {
          borderRadius: '12px',
          codeBackground: 'var(--site-code-bg)',
          borderColor: 'var(--sl-color-hairline-light)',
          codeFontFamily: "'Geist Mono', ui-monospace, monospace",
          uiFontFamily: 'Geist, system-ui, sans-serif',
          codeFontSize: '0.84rem',
          frames: {
            shadowColor: 'transparent',
            editorTabBarBackground: 'var(--sl-color-black)',
            terminalTitlebarBackground: 'var(--sl-color-black)',
          },
        },
      },
      routeMiddleware: './src/routeData.ts',
      components: {
        // Shows the version and a pause control for every loader on the page (WCAG 2.2.2).
        ThemeSelect: './src/components/HeaderControls.astro',
        // The landing page's hero: a live loader stepping through the AI states.
        Hero: './src/components/LandingHero.astro',
      },
      plugins: [
        starlightTypeDoc({
          entryPoints: [
            lib('src/index.ts'),
            lib('src/core.ts'),
            lib('src/loaders/index.ts'),
            lib('src/react/index.ts'),
            lib('src/vue/index.ts'),
          ],
          // The library's source only: the reference documents src/, and test files must never stop the site
          // from starting (a test type error once did, on machines with @types/node installed).
          tsconfig: lib('tsconfig.build.json'),
          output: 'api',
          sidebar: { label: 'API reference', collapsed: true },
          typeDoc: {
            excludePrivate: true,
            excludeInternal: true,
            // An intro saying which module to open, merged above the module list, which shows each module's summary.
            readme: lib('site/api-intro.md'),
            mergeReadme: true,
            indexFormat: 'table',
            parametersFormat: 'table',
            interfacePropertiesFormat: 'list',
          },
        }),
      ],
      sidebar: [
        // Grouped by what readers are doing (content audit): get it working, make it theirs, check before shipping, look things up.
        { label: 'Get started', items: ['start/introduction', 'start/installation', 'start/quick-start', 'guides/streaming'] },
        {
          label: 'Customize',
          items: ['guides/choosing', 'guides/ai-states', 'guides/loaders', 'guides/theming', 'guides/custom-loaders'],
        },
        { label: 'Frameworks', items: ['frameworks/web-component', 'frameworks/react', 'frameworks/vue', 'frameworks/typescript'] },
        { label: 'Before you ship', items: ['accessibility', 'guides/bundle-size', 'guides/csp'] },
        { label: 'Reference', items: ['reference/options', 'reference/stability', 'reference/migrating'] },
        typeDocSidebarGroup,
      ],
    }),
  ],
  vite: {
    // The site uses the library's source, so every demo shows exactly what's in the repo.
    resolve: { alias: { mulling: lib('src/index.ts') } },
    server: { fs: { allow: [lib('')] } },
  },
});
