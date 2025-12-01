// GitHub Issue Table Plugin for MyST
// Bundled version - see https://github.com/jupyter-book/myst-plugins
// Generated: 2025-11-30T17:10:08.168Z


// src/github-api.mjs
var PAGINATION_SIZE = 100;
var MAX_FIELD_VALUES = 20;
var MAX_ORGANIZATIONS = 3;
var MAX_LABELS = 10;
var MAX_TIMELINE_ITEMS = 20;
function parseProjectUrl(input) {
  if (input.includes("github.com") && input.includes("/projects/")) {
    try {
      const url = new URL(input);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const projectIndex = pathParts.indexOf("projects");
      if (projectIndex >= 0 && pathParts.length > projectIndex + 1) {
        const projectNumber = parseInt(pathParts[projectIndex + 1], 10);
        const viewIndex = pathParts.indexOf("views");
        const viewNumber = viewIndex >= 0 && pathParts.length > viewIndex + 1 ? parseInt(pathParts[viewIndex + 1], 10) : null;
        const viewQuery = url.searchParams.get("query") || url.searchParams.get("filterQuery");
        if (!isNaN(projectNumber)) {
          if (pathParts[0] === "orgs" && pathParts.length > 1) {
            return { type: "org", owner: pathParts[1], number: projectNumber, viewNumber, viewQuery };
          } else if (pathParts[0] === "users" && pathParts.length > 1) {
            return { type: "user", owner: pathParts[1], number: projectNumber, viewNumber, viewQuery };
          }
        }
      }
    } catch (e) {
    }
  }
  return null;
}
function normalizeQuery(input) {
  if (input.includes("github.com") && input.includes("/issues")) {
    try {
      const url = new URL(input);
      const qParam = url.searchParams.get("q");
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        const repo = `${pathParts[0]}/${pathParts[1]}`;
        return qParam ? `repo:${repo} ${qParam}` : `repo:${repo}`;
      }
    } catch (e) {
    }
  }
  return input;
}
var ISSUE_FIELDS_FRAGMENT = `
  fragment IssueFields on Issue {
    number
    title
    url
    state
    body
    repository {
      nameWithOwner
    }
    author {
      login
      ... on User {
        company
        organizations(first: ${MAX_ORGANIZATIONS}) {
          nodes { login }
        }
      }
    }
    createdAt
    updatedAt
    closedAt
    labels(first: ${MAX_LABELS}) { nodes { name color } }
    reactions { totalCount }
    comments { totalCount }
    timelineItems(first: ${MAX_TIMELINE_ITEMS}, itemTypes: [CROSS_REFERENCED_EVENT]) {
      nodes {
        ... on CrossReferencedEvent {
          source {
            ... on PullRequest {
              number
              url
              state
              mergedAt
            }
          }
        }
      }
    }
  }
`;
var PR_FIELDS_FRAGMENT = `
  fragment PRFields on PullRequest {
    number
    title
    url
    state
    body
    repository {
      nameWithOwner
    }
    author {
      login
      ... on User {
        company
        organizations(first: ${MAX_ORGANIZATIONS}) {
          nodes { login }
        }
      }
    }
    createdAt
    updatedAt
    closedAt
    mergedAt
    labels(first: ${MAX_LABELS}) { nodes { name color } }
    reactions { totalCount }
    comments { totalCount }
    isDraft
  }
`;
async function fetchProjectViewFilter(projectInfo, token) {
  const { type, owner, number, viewNumber } = projectInfo;
  if (!viewNumber)
    return { found: false, filter: null };
  const graphqlQuery = `
    query($owner: String!, $number: Int!) {
      ${type === "org" ? "organization" : "user"}(login: $owner) {
        projectV2(number: $number) {
          views(first: 50) {
            nodes {
              number
              filter
            }
          }
        }
      }
    }
  `;
  const variables = { owner, number };
  const body = JSON.stringify({ query: graphqlQuery, variables });
  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body
    });
    if (!response.ok) {
      console.error(`GitHub API error while fetching project view: ${response.status} ${response.statusText}`);
      return { found: false, filter: null };
    }
    const data = await response.json();
    if (data.errors) {
      console.error("GitHub API errors while fetching project view:", data.errors);
      return { found: false, filter: null };
    }
    const ownerData = data.data?.[type === "org" ? "organization" : "user"];
    const views = ownerData?.projectV2?.views?.nodes || [];
    const view = views.find((v) => v?.number === viewNumber);
    if (!view) {
      return { found: false, filter: null };
    }
    return { found: true, filter: view.filter ?? "" };
  } catch (error) {
    console.error("Failed to fetch project view filter:", error.message);
    return { found: false, filter: null };
  }
}
async function fetchProjectIssues(projectInfo, token) {
  const { type, owner, number, viewNumber, viewQuery } = projectInfo;
  let itemQuery = viewQuery ? viewQuery.trim() : null;
  let viewFound = !viewNumber;
  if (viewNumber && itemQuery) {
    viewFound = true;
  }
  if (!itemQuery && viewNumber) {
    const { filter, found } = await fetchProjectViewFilter(projectInfo, token);
    viewFound = found;
    if (filter !== null && filter !== void 0) {
      itemQuery = String(filter).trim() || null;
    }
  }
  if (viewNumber && !viewFound) {
    console.error(`Project view ${viewNumber} not found for ${type} ${owner}`);
    return [];
  }
  if (itemQuery) {
    const normalized = itemQuery.toLowerCase();
    const mentionsState = ["is:open", "is:closed", "state:open", "state:closed", "is:merged", "state:merged"].some((token2) => normalized.includes(token2));
    if (!mentionsState) {
      itemQuery = `${itemQuery} is:open`.trim();
    }
  }
  const queryVar = itemQuery ? ", $itemQuery: String" : "";
  const queryArg = itemQuery ? ", query: $itemQuery" : "";
  const graphqlQuery = `
    ${ISSUE_FIELDS_FRAGMENT}
    ${PR_FIELDS_FRAGMENT}

    query($owner: String!, $number: Int!${queryVar}, $cursor: String) {
      ${type === "org" ? "organization" : "user"}(login: $owner) {
        projectV2(number: $number) {
          items(first: ${PAGINATION_SIZE}${queryArg}, after: $cursor) {
            nodes {
              fieldValues(first: ${MAX_FIELD_VALUES}) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field { ... on ProjectV2Field { name } }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field { ... on ProjectV2SingleSelectField { name } }
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field { ... on ProjectV2Field { name } }
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    date
                    field { ... on ProjectV2Field { name } }
                  }
                  ... on ProjectV2ItemFieldIterationValue {
                    title
                    field { ... on ProjectV2IterationField { name } }
                  }
                }
              }
              content {
                ... on Issue {
                  ...IssueFields
                }
                ... on PullRequest {
                  ...PRFields
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }
  `;
  let allItems = [];
  let cursor = null;
  try {
    while (true) {
      const variables = itemQuery ? { owner, number, itemQuery, cursor } : { owner, number, cursor };
      const body = JSON.stringify({ query: graphqlQuery, variables });
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body
      });
      if (!response.ok) {
        console.error(`GitHub API error: ${response.status} ${response.statusText}`);
        return allItems;
      }
      const data = await response.json();
      if (data.errors) {
        console.error("GitHub API errors:", data.errors);
        return allItems;
      }
      const ownerData = data.data?.[type === "org" ? "organization" : "user"];
      const page = ownerData?.projectV2?.items;
      const items = page?.nodes || [];
      allItems = allItems.concat(items);
      const pageInfo = page?.pageInfo;
      if (!pageInfo?.hasNextPage) {
        break;
      }
      cursor = pageInfo.endCursor;
    }
    const normalizedQuery = (itemQuery || "").toLowerCase();
    const allowClosed = normalizedQuery.includes("is:closed") || normalizedQuery.includes("state:closed") || normalizedQuery.includes("is:merged") || normalizedQuery.includes("state:merged");
    const requiresTeamPriority = normalizedQuery.includes("has:team-priority");
    const hasTeamPriority = (node) => {
      const values = node?.fieldValues?.nodes || [];
      return values.some((v) => {
        const name = v?.field?.name;
        const val = v?.text || v?.name || v?.number || v?.date || v?.title;
        return name === "Team Priority" && val != null && val !== "";
      });
    };
    return allItems.filter((node) => {
      const item = node?.content;
      if (!item || !item.number || !item.title || !item.url)
        return false;
      if (!allowClosed && item.state !== "OPEN")
        return false;
      if (requiresTeamPriority && !hasTeamPriority(node))
        return false;
      return true;
    }).map((node) => normalizeIssueData(node.content, node));
  } catch (error) {
    console.error("Failed to fetch from GitHub project:", error.message);
    return [];
  }
}
async function fetchIssuesFromSearch(query, token) {
  const graphqlQuery = `
    ${ISSUE_FIELDS_FRAGMENT}
    ${PR_FIELDS_FRAGMENT}

    query($query: String!, $first: Int!, $cursor: String) {
      search(query: $query, type: ISSUE, first: $first, after: $cursor) {
        nodes {
          ... on Issue {
            ...IssueFields
          }
          ... on PullRequest {
            ...PRFields
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;
  const first = PAGINATION_SIZE;
  let cursor = null;
  let allNodes = [];
  try {
    while (true) {
      const variables = { query, first, cursor };
      const body = JSON.stringify({ query: graphqlQuery, variables });
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body
      });
      if (!response.ok) {
        console.error(`GitHub API error: ${response.status} ${response.statusText}`);
        break;
      }
      const data = await response.json();
      if (data.errors) {
        console.error("GitHub API errors:", data.errors);
        break;
      }
      const page = data.data?.search;
      const nodes = page?.nodes || [];
      allNodes = allNodes.concat(nodes);
      if (!page?.pageInfo?.hasNextPage) {
        break;
      }
      cursor = page.pageInfo.endCursor;
    }
    return allNodes.map((item) => normalizeIssueData(item));
  } catch (error) {
    console.error("Failed to fetch from GitHub:", error.message);
    return [];
  }
}
function normalizeIssueData(item, projectNode = null) {
  const author = item.author?.login || "unknown";
  const company = item.author?.company || "";
  const orgs = item.author?.organizations?.nodes?.map((o) => o.login) || [];
  const affiliation = company || orgs[0] || "";
  const linkedPRs = (item.timelineItems?.nodes || []).map((node) => node?.source).filter((source) => source?.number).map((pr) => ({
    number: pr.number,
    url: pr.url,
    state: pr.state,
    merged: pr.mergedAt != null
  }));
  const projectFields = {};
  if (projectNode?.fieldValues?.nodes) {
    projectNode.fieldValues.nodes.forEach((fieldValue) => {
      const fieldName = fieldValue.field?.name;
      if (fieldName) {
        const value = fieldValue.text || fieldValue.name || fieldValue.number || fieldValue.date || fieldValue.title;
        if (value !== void 0 && value !== null) {
          projectFields[fieldName] = value;
        }
      }
    });
  }
  return {
    number: item.number,
    title: item.title,
    url: item.url,
    state: item.state,
    body: item.body || "",
    repo: item.repository?.nameWithOwner || "",
    author,
    author_affiliation: affiliation,
    created: item.createdAt,
    updated: item.updatedAt,
    closed: item.closedAt,
    merged: item.mergedAt,
    labels: (item.labels?.nodes || []).map((l) => ({ name: l.name, color: l.color })),
    reactions: item.reactions?.totalCount || 0,
    comments: item.comments?.totalCount || 0,
    isDraft: item.isDraft || false,
    linkedPRs,
    type: item.mergedAt !== void 0 ? "PR" : "Issue",
    ...projectFields
    // Flatten project fields into main object
  };
}
async function fetchIssues(input, token) {
  const projectInfo = parseProjectUrl(input);
  if (projectInfo) {
    return await fetchProjectIssues(projectInfo, token);
  }
  const query = normalizeQuery(input);
  return await fetchIssuesFromSearch(query, token);
}

// src/cache.mjs
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
var CACHE_DIR = "_build/temp/github-issues";
var CACHE_TTL = 24 * 36e5;
function getCacheKey(query) {
  return createHash("md5").update(query).digest("hex");
}
function getCachePath(query) {
  const key = getCacheKey(query);
  return join(CACHE_DIR, `${key}.json`);
}
function readCache(query) {
  const cachePath = getCachePath(query);
  if (!existsSync(cachePath))
    return null;
  const data = JSON.parse(readFileSync(cachePath, "utf8"));
  const age = Date.now() - data.timestamp;
  if (age > CACHE_TTL)
    return null;
  return data.items;
}
function writeCache(query, items) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = getCachePath(query);
  const tempPath = join(tmpdir(), `github-cache-${Date.now()}-${Math.random().toString(36).substring(2, 11)}.json`);
  writeFileSync(tempPath, JSON.stringify({
    timestamp: Date.now(),
    query,
    items
  }));
  renameSync(tempPath, cachePath);
}

// src/utils.mjs
function stripBrackets(title) {
  if (!title)
    return "";
  return title.replace(/^(\[.*?\]|\(.*?\))\s*/g, "").trim();
}
function formatDate(dateString, format = "absolute") {
  if (!dateString)
    return "";
  const date = new Date(dateString);
  if (format === "relative") {
    const now = Date.now();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1e3);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (years > 0)
      return `${years}y ago`;
    if (months > 0)
      return `${months}mo ago`;
    if (days > 0)
      return `${days}d ago`;
    if (hours > 0)
      return `${hours}h ago`;
    if (minutes > 0)
      return `${minutes}m ago`;
    return `${seconds}s ago`;
  }
  return date.toISOString().split("T")[0];
}
function truncateText(text, maxLength) {
  if (!text || !maxLength || text.length <= maxLength)
    return text;
  return text.substring(0, maxLength) + "...";
}
function parseTemplates(templateString) {
  if (!templateString)
    return {};
  const templates = {};
  templateString.split(";").forEach((entry) => {
    const [name, ...rest] = entry.split("=");
    if (!name || rest.length === 0)
      return;
    const key = name.trim();
    const value = rest.join("=").trim();
    if (key && value) {
      templates[key] = value;
    }
  });
  return templates;
}
function fillTemplate(template, item) {
  if (!template)
    return "";
  return template.replace(/{{\s*([^}]+)\s*}}/g, (_match, fieldName) => {
    const field = fieldName.trim();
    const value = item[field];
    return String(value ?? "");
  });
}
function templateToNodes(filled, parseMyst) {
  if (!filled)
    return [{ type: "text", value: "" }];
  if (typeof parseMyst === "function") {
    try {
      const parsed = parseMyst(filled);
      const children = Array.isArray(parsed?.children) ? parsed.children : [];
      if (children.length === 1 && children[0]?.type === "paragraph" && Array.isArray(children[0].children)) {
        return children[0].children;
      }
      return children.length > 0 ? children : [{ type: "text", value: filled }];
    } catch (err) {
      console.error("Failed to parse template with MyST parser:", err?.message || err);
      return [{ type: "text", value: filled }];
    }
  }
  return [{ type: "text", value: filled }];
}
function linkifyHandle(handle) {
  if (!handle)
    return null;
  const cleaned = handle.startsWith("@") ? handle.slice(1) : handle;
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(cleaned)) {
    return null;
  }
  return {
    type: "link",
    url: `https://github.com/${cleaned}`,
    children: [{ type: "text", value: handle }]
  };
}

// src/columns.mjs
var COLUMN_DEFINITIONS = {
  number: (item, options) => ({
    type: "link",
    url: item.url,
    children: [{ type: "text", value: `#${item.number}` }]
  }),
  title: (item, options) => ({
    type: "link",
    url: item.url,
    children: [{ type: "text", value: stripBrackets(item.title) }]
  }),
  state: (item, options) => {
    const icon = item.state === "OPEN" ? "\u{1F7E2}" : "\u{1F7E3}";
    return { type: "text", value: `${icon} ${item.state}` };
  },
  author: (item, options) => linkifyHandle(item.author) || { type: "text", value: item.author || "" },
  author_affiliation: (item, options) => {
    if (!item.author_affiliation) {
      return { type: "text", value: "" };
    }
    return linkifyHandle(item.author_affiliation) || {
      type: "text",
      value: item.author_affiliation
    };
  },
  repo: (item, options) => {
    if (!item.repo) {
      return { type: "text", value: "" };
    }
    return {
      type: "link",
      url: `https://github.com/${item.repo}`,
      children: [{ type: "text", value: item.repo }]
    };
  },
  created: (item, options) => ({
    type: "text",
    value: formatDate(item.created, options.dateFormat || "absolute")
  }),
  updated: (item, options) => ({
    type: "text",
    value: formatDate(item.updated, options.dateFormat || "absolute")
  }),
  reactions: (item, options) => ({
    type: "text",
    value: `\u{1F44D} ${item.reactions}`
  }),
  comments: (item, options) => ({
    type: "text",
    value: String(item.comments)
  }),
  labels: (item, options) => {
    if (!item.labels || item.labels.length === 0) {
      return { type: "text", value: "" };
    }
    const labelTexts = item.labels.filter((label) => label && label.name).map((label) => label.name).join(", ");
    return { type: "text", value: labelTexts };
  },
  linked_prs: (item, options) => {
    if (!item.linkedPRs || item.linkedPRs.length === 0) {
      return { type: "text", value: "" };
    }
    const prNodes = [];
    item.linkedPRs.forEach((pr, idx) => {
      if (!pr || !pr.url || !pr.number) {
        return;
      }
      let icon;
      if (pr.merged) {
        icon = "\u{1F7E3}";
      } else if (pr.state === "OPEN") {
        icon = "\u{1F7E2}";
      } else {
        icon = "\u274C";
      }
      if (idx > 0 && prNodes.length > 0) {
        prNodes.push({ type: "text", value: ", " });
      }
      prNodes.push({ type: "text", value: `${icon} ` });
      prNodes.push({
        type: "link",
        url: String(pr.url),
        children: [{ type: "text", value: `#${pr.number}` }]
      });
    });
    if (prNodes.length === 0) {
      return { type: "text", value: "" };
    }
    return {
      type: "paragraph",
      children: prNodes
    };
  },
  body: (item, options) => {
    const bodyText = truncateText(item.body || "", options.bodyTruncate);
    return { type: "text", value: bodyText };
  }
};
function renderCell(item, column, options = {}) {
  const columnDef = COLUMN_DEFINITIONS[column];
  if (columnDef) {
    return columnDef(item, options);
  }
  if (item[column] !== void 0) {
    return { type: "text", value: String(item[column]) };
  }
  const { templates = {}, parseMyst } = options;
  if (templates[column]) {
    const filled = fillTemplate(templates[column], item);
    const nodes = templateToNodes(filled, parseMyst);
    return nodes.length === 1 ? nodes[0] : { type: "paragraph", children: nodes };
  }
  return { type: "text", value: "" };
}

// src/index.mjs
var sharedParseMyst = null;
function sortItems(items, sortSpec) {
  if (!sortSpec)
    return items;
  const sortSpecs = sortSpec.split(",").map((spec) => {
    const [column, direction = "desc"] = spec.trim().split("-");
    return { column: column.trim(), ascending: direction === "asc" };
  });
  return [...items].sort((a, b) => {
    for (const { column, ascending } of sortSpecs) {
      let aVal = a[column];
      let bVal = b[column];
      if (column.includes("created") || column.includes("updated") || column.includes("closed")) {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (aVal == null && bVal == null)
        continue;
      if (aVal == null)
        return 1;
      if (bVal == null)
        return -1;
      if (aVal < bVal)
        return ascending ? -1 : 1;
      if (aVal > bVal)
        return ascending ? 1 : -1;
    }
    return 0;
  });
}
function buildTable(items, columns, options = {}) {
  const headerRow = {
    type: "tableRow",
    children: columns.map((col) => ({
      type: "tableCell",
      children: [{ type: "text", value: (col || "").replace(/_/g, " ").toUpperCase() }]
    }))
  };
  const dataRows = items.map((item) => ({
    type: "tableRow",
    children: columns.map((col) => {
      const cellContent = renderCell(item, col, options);
      if (!cellContent) {
        return {
          type: "tableCell",
          children: [{ type: "text", value: "" }]
        };
      }
      let children;
      if (cellContent.type === "paragraph") {
        children = Array.isArray(cellContent.children) ? cellContent.children : [{ type: "text", value: "" }];
      } else {
        children = [cellContent];
      }
      return {
        type: "tableCell",
        children
      };
    })
  }));
  return {
    type: "table",
    children: [headerRow, ...dataRows]
  };
}
var directive = {
  name: "issue-table",
  doc: "Render GitHub issues/PRs as a table",
  arg: {
    type: String,
    required: true,
    doc: "GitHub search query (e.g., 'author:@user org:jupyter-book is:pr state:open')"
  },
  options: {
    columns: {
      type: String,
      doc: "Comma-separated column names (default: title,author,state,reactions)"
    },
    sort: {
      type: String,
      doc: "Sort by column-direction (e.g., 'reactions-desc')"
    },
    limit: {
      type: Number,
      doc: "Maximum number of results to display"
    },
    "body-truncate": {
      type: Number,
      doc: "Truncate body text to this many characters"
    },
    "date-format": {
      type: String,
      doc: "Date format: 'relative', 'absolute', or strftime pattern"
    },
    templates: {
      type: String,
      doc: "Custom column templates: name=My text with {{field}} placeholders; separate multiple with semicolons"
    }
  },
  run(data, _vfile, ctx) {
    const query = data.arg?.trim();
    if (!query) {
      return ctx.parseMyst("*Please provide a search query*").children;
    }
    const columns = (data.options?.columns || "title,author,state,reactions").split(",").map((c) => c.trim());
    const sort = data.options?.sort;
    const limit = data.options?.limit;
    const bodyTruncate = data.options?.["body-truncate"];
    const dateFormat = data.options?.["date-format"];
    const templates = data.options?.templates;
    if (!sharedParseMyst && ctx?.parseMyst) {
      sharedParseMyst = ctx.parseMyst;
    }
    return [{
      type: "githubIssueTablePlaceholder",
      query,
      columns,
      sort,
      limit,
      bodyTruncate,
      dateFormat,
      templates
    }];
  }
};
function walk(node, callback) {
  if (!node)
    return;
  callback(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, callback);
    }
  }
}
var githubIssueTableTransform = {
  name: "github-issue-table-transform",
  stage: "document",
  doc: "Replace placeholder nodes with GitHub issue tables",
  plugin: () => {
    return async (tree) => {
      const placeholders = [];
      walk(tree, (node) => {
        if (node?.type === "githubIssueTablePlaceholder") {
          placeholders.push(node);
        }
      });
      if (placeholders.length === 0)
        return;
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        console.error("GITHUB_TOKEN environment variable not set");
        placeholders.forEach((placeholder) => {
          placeholder.type = "paragraph";
          placeholder.children = [{ type: "text", value: "*Error: GITHUB_TOKEN environment variable not set*" }];
          delete placeholder.query;
          delete placeholder.columns;
          delete placeholder.sort;
        });
        return;
      }
      await Promise.all(
        placeholders.map(async (placeholder) => {
          const { query, columns, sort, limit, bodyTruncate, dateFormat, templates: templateString } = placeholder;
          const parseMyst = sharedParseMyst;
          const templates = parseTemplates(templateString);
          let items = readCache(query);
          if (!items) {
            console.log(`Fetching GitHub data for query: ${query}`);
            items = await fetchIssues(query, token);
            writeCache(query, items);
          } else {
            console.log(`Using cached data for query: ${query}`);
          }
          if (items.length === 0) {
            placeholder.type = "paragraph";
            placeholder.children = [{ type: "text", value: "*No issues found matching this query*" }];
            delete placeholder.query;
            delete placeholder.columns;
            delete placeholder.sort;
            delete placeholder.limit;
            delete placeholder.bodyTruncate;
            delete placeholder.dateFormat;
            return;
          }
          let sorted = sortItems(items, sort);
          if (limit && limit > 0) {
            sorted = sorted.slice(0, limit);
          }
          const table = buildTable(sorted, columns, { bodyTruncate, dateFormat, templates, parseMyst });
          placeholder.type = table.type;
          placeholder.children = table.children;
          delete placeholder.query;
          delete placeholder.columns;
          delete placeholder.sort;
          delete placeholder.limit;
          delete placeholder.bodyTruncate;
          delete placeholder.dateFormat;
          delete placeholder.templates;
        })
      );
    };
  }
};
var plugin = {
  name: "GitHub Issue Table",
  directives: [directive],
  transforms: [githubIssueTableTransform]
};
var src_default = plugin;
export {
  src_default as default
};
