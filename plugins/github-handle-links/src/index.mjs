// GitHub Handle Links Plugin
// Automatically converts @username mentions into links to GitHub profiles

import { createCache, walk, githubApiHeaders } from "../../github-shared/utils.mjs";
import { HANDLE_STYLES } from "./styles.mjs";

const { readCache, writeCache } = createCache("github-handle");

const SIMPLE_HANDLE =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

// ============================================================================
// GitHub API
// ============================================================================

async function fetchProfile(handle) {
  const cacheKey = handle.toLowerCase();
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const response = await fetch(`https://api.github.com/users/${handle}`, {
    headers: githubApiHeaders(),
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  const profile = {
    login: data.login || handle,
    url: data.html_url || `https://github.com/${handle}`,
    avatarUrl: data.avatar_url || null,
  };

  writeCache(cacheKey, profile);
  return profile;
}

async function fetchProfiles(handles) {
  const profiles = new Map();
  const results = await Promise.all(
    Array.from(handles).map(async (handle) => {
      const profile = await fetchProfile(handle);
      return { handle, profile };
    })
  );

  results.forEach(({ handle, profile }) => {
    if (profile) {
      profiles.set(handle, profile);
    }
  });

  return profiles;
}

function collectCiteMentions(root) {
  const mentions = [];
  walk(root, null, (node, parent) => {
    if (!node || node.type !== "cite") return;
    if (!parent || !Array.isArray(parent.children)) return;
    // Skip if the parent is already a link (avoid nested links)
    if (parent.type === "link") return;
    const label = node.label || node.identifier || "";
    const handle = (node.identifier || label || "").replace(/^@/, "");
    const lower = handle.toLowerCase();
    if (!handle) return;
    // Quick check to make sure it's a valid GitHub handle syntax
    if (!SIMPLE_HANDLE.test(handle)) return;
    mentions.push({ node, parent, handle, lower, label: label || handle });
  });
  return mentions;
}

// ============================================================================
// Mention Replacement
// ============================================================================

function createLinkNode(profile, text) {
  const children = [];
  if (profile.avatarUrl) {
    // Only background-image is inline since it's per-user; the rest is in HANDLE_STYLES
    children.push({
      type: "span",
      class: "github-handle-avatar",
      style: { backgroundImage: `url('${profile.avatarUrl}&s=40')` },
      children: [],
    });
  }
  children.push({ type: "text", value: text });
  return {
    type: "link",
    url: profile.url,
    title: `GitHub profile for ${profile.login}`,
    class: "github-handle-link",
    children,
    data: {
      hProperties: {
        class: "github-handle-link",
        "data-github-user": profile.login,
      },
    },
  };
}

function replaceCiteNode({ node, parent, lower, label }, profiles) {
  if (!parent || !Array.isArray(parent.children)) return;
  const profile = profiles.get(lower);
  if (!profile) return;
  const index = parent.children.indexOf(node);
  if (index === -1) return;
  parent.children.splice(index, 1, createLinkNode(profile, `@${label}`));
}

const replaceCiteMentions = (mentions, profiles) =>
  mentions.forEach((mention) => replaceCiteNode(mention, profiles));

// ============================================================================
// Plugin
// ============================================================================

const plugin = {
  name: "GitHub Handle Links",
  transforms: [
    {
      name: "github-handle-links",
      stage: "document",
      // Runs after the document has been parsed so we can inspect resolved references
      plugin: () => {
        return async (tree, file) => {
          const citeMentions = collectCiteMentions(tree);
          const handles = new Set();
          citeMentions.forEach((mention) => handles.add(mention.lower));

          if (!handles.size) return;

          const profiles = await fetchProfiles(handles);
          replaceCiteMentions(citeMentions, profiles);

          // Inject plugin styles into the page.
          // HACK: the myst-theme math renderer uses dangerouslySetInnerHTML
          // when a math node has an `html` property, which lets us inject a
          // <style> block. This is the only self-contained way for a plugin
          // to ship its own CSS without requiring an external stylesheet.
          if (Array.isArray(tree.children)) {
            tree.children.unshift({
              type: "math",
              value: "",
              html: `<style>${HANDLE_STYLES}</style>`,
            });
          }
        };
      },
    },
  ],
};

export default plugin;
