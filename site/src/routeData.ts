import { defineRouteMiddleware, type StarlightRouteData } from '@astrojs/starlight/route-data';

// Splash pages (the landing page) have no sidebar, and so no mobile menu: on a phone there was no way to
// reach the docs, the theme switch or the pause control except through the hero buttons. Giving the landing
// page the sidebar brings the standard mobile menu; theme.css hides the sidebar again on wide screens, where
// the header already shows everything, so the desktop layout is unchanged.
// TypeDoc's sidebar groups each module's pages by kind (Functions, Interfaces…), a fourth level that mostly
// holds one to three pages. Listing each module's pages directly keeps the reference to three levels.
const KINDS = new Set(['Functions', 'Interfaces', 'Variables', 'Type Aliases', 'Classes', 'Enumerations', 'Namespaces', 'References']);
type Entry = StarlightRouteData['sidebar'][number];
const flattenKinds = (entries: Entry[]): Entry[] => entries.flatMap((e) => (e.type === 'group' && KINDS.has(e.label) ? e.entries : [e]));

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  if (route.entry.data.template === 'splash') route.hasSidebar = true;
  // "On this page" with only "Overview" in it is noise: show the contents only when there are 2+ headings.
  const headings = route.toc?.items.filter((item) => item.slug !== '_top') ?? [];
  const count = headings.reduce((n, item) => n + 1 + item.children.length, 0);
  if (route.toc && count < 2) route.toc = undefined;

  // The API reference's own landing page ("Start with Options") was in no menu and linked from nowhere.
  // New objects throughout: Starlight reuses the sidebar tree between pages, so it must not be mutated.
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  route.sidebar = route.sidebar.map((group) => {
    if (group.type !== 'group' || group.label !== 'API reference') return group;
    const overview: Entry = {
      type: 'link',
      label: 'Overview',
      href: `${base}/api/readme/`,
      isCurrent: route.id === 'api/readme',
      badge: undefined,
      attrs: {},
    };
    const modules = group.entries.map((m) => (m.type === 'group' ? { ...m, entries: flattenKinds(m.entries) } : m));
    return { ...group, entries: [overview, ...modules] };
  });
});
