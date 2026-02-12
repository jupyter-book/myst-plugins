// GitHub Handle Links Plugin
// Automatically converts @username mentions into links to GitHub profiles

import { createCache, walk, githubApiHeaders } from "../../github-shared/utils.mjs";

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
    if (!parent) return;
    // If the parent is already a link, flag it so we enhance instead of wrap
    const parentLink = parent.type === "link" ? parent : null;
    const label = node.label || node.identifier || "";
    const handle = (node.identifier || label || "").replace(/^@/, "");
    const lower = handle.toLowerCase();
    if (!handle) return;
    // Quick check to make sure it's a valid GitHub handle syntax
    if (!SIMPLE_HANDLE.test(handle)) return;
    mentions.push({ node, parent, parentLink, handle, lower, label: label || handle });
  });
  return mentions;
}

// ============================================================================
// Mention Replacement
// ============================================================================

function avatarSpan(profile) {
  return {
    type: "span",
    style: {
      display: "inline-block",
      width: "16px",
      height: "16px",
      borderRadius: "50%",
      backgroundSize: "cover",
      verticalAlign: "text-bottom",
      marginRight: "2px",
      backgroundImage: `url('${profile.avatarUrl}&s=40')`,
    },
    children: [],
  };
}

function handleLinkProps(profile) {
  return {
    title: `GitHub profile for ${profile.login}`,
    class: "github-handle-link",
    data: {
      hProperties: {
        class: "github-handle-link",
        "data-github-user": profile.login,
      },
    },
  };
}

function handleContent(profile, label) {
  return {
    type: "span",
    style: { whiteSpace: "nowrap" },
    children: [avatarSpan(profile), { type: "text", value: `@${label}` }],
  };
}

function replaceCiteNode({ node, parent, parentLink, lower, label }, profiles) {
  const profile = profiles.get(lower);
  if (!profile) return;
  const index = parent.children.indexOf(node);

  if (parentLink) {
    if (!parentLink.url.includes("github.com")) return;
    Object.assign(parentLink, handleLinkProps(profile));
    parent.children.splice(index, 1, handleContent(profile, label));
    return;
  }

  parent.children.splice(index, 1, {
    type: "link",
    url: profile.url,
    children: [handleContent(profile, label)],
    ...handleLinkProps(profile),
  });
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
        };
      },
    },
  ],
};

export default plugin;
