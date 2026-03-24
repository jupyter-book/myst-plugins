// Footer plugin for MyST
//
// Provides a {footer} directive that renders a site footer via anywidget.
// 
// This has a two-step process (directive -> transform) because
// of the need to fetch icons. Here's a quick breakdown:
//
//   1. The directive parses YAML and emits a temporary "footerPlaceholder" node.
//   2. A transform replaces it with an "anywidget" node and does the icon fetching.
// 
//   We need this two-step approach because icons must be fetched from simpleicons.org
//   and I couldn't figure out how to get it working with just a directive's run() function
//   (I think because it doesn't support async operations?)
import yaml from 'js-yaml';
import { createCache, walk, MS_PER_DAY } from '../../github-shared/utils.mjs';

const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org';
const cache = createCache('simple-icon', 30 * MS_PER_DAY);

// Fetch an icon SVG from simpleicons.org by its exact slug (e.g. "github", "x").
async function fetchIcon(name) {
  const cached = cache.readCache(name);
  if (cached) return cached;
  try {
    const res = await fetch(`${SIMPLE_ICONS_CDN}/${name}`);
    if (!res.ok) {
      console.warn(`Footer: icon "${name}" not found on simpleicons.org`);
      return null;
    }
    const svg = (await res.text()).replaceAll(/fill="[^"]*"/g, 'fill="currentColor"');
    cache.writeCache(name, svg);
    return svg;
  } catch {
    return null;
  }
}

const plugin = {
  name: 'Site Footer',

  // Directive emits a placeholder because we need async icon fetching (see header).
  directives: [
    {
      name: 'footer',
      doc: 'Renders a site footer from structured YAML data using anywidget. All fields are optional.',
      body: { type: String },
      run(data) {
        const parsed = data.body ? yaml.load(data.body) : {};
        const model = typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        return [{ type: 'footerPlaceholder', ...model }];
      },
    },
  ],

  // Transform fetches icons and replaces placeholders with anywidget nodes.
  transforms: [
    {
      name: 'footer-resolve',
      stage: 'document',
      plugin: () => async (tree) => {
        const footers = [];
        walk(tree, null, (node) => {
          if (node.type === 'footerPlaceholder') footers.push(node);
        });
        if (!footers.length) return;

        for (const node of footers) {
          // Fetch icons for this footer
          const iconSvgs = {};
          await Promise.all(
            Object.keys(node.icons || {}).map(async (name) => {
              const svg = await fetchIcon(name);
              if (svg) iconSvgs[name] = svg;
            }),
          );

          // Extract YAML fields from the placeholder, discarding AST metadata
          const { type, position, ...fields } = node;

          // Update the node so that it's an anywidget node
          // This will get handled by a subsequent anywidget transform
          Object.keys(node).forEach((k) => delete node[k]);
          Object.assign(node, {
            type: 'anywidget',
            // Replaced with a release URL at build time (see build.mjs)
            esm: __WIDGET_URL__,
            model: { ...fields, iconSvgs },
          });
        }
      },
    },
  ],
};

export default plugin;
