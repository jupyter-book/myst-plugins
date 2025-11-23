// GitHub Issue Table Plugin
// Renders GitHub issues/PRs as tables from search queries

import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const CACHE_DIR = "_build/temp/github-issues";
const CACHE_TTL = 24*3600000; // 24 hours in milliseconds

// ============================================================================
// Title Cleaning
// ============================================================================

function stripBrackets(title) {
  // Remove [...] and (...) content from the beginning of titles
  if (!title) return "";
  return title.replace(/^(\[.*?\]|\(.*?\))\s*/g, "").trim();
}

// ============================================================================
// Cache Management
// ============================================================================

function getCacheKey(query) {
  return createHash("md5").update(query).digest("hex");
}

function getCachePath(query) {
  const key = getCacheKey(query);
  return join(CACHE_DIR, `${key}.json`);
}

function readCache(query) {
  const cachePath = getCachePath(query);
  if (!existsSync(cachePath)) return null;

  const data = JSON.parse(readFileSync(cachePath, "utf8"));
  const age = Date.now() - data.timestamp;

  if (age > CACHE_TTL) return null;
  return data.items;
}

function writeCache(query, items) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = getCachePath(query);
  writeFileSync(cachePath, JSON.stringify({
    timestamp: Date.now(),
    query,
    items
  }));
}

// ============================================================================
// GitHub API (Synchronous)
// ============================================================================

function parseProjectUrl(input) {
  // Parse GitHub project URLs: https://github.com/orgs/ORG/projects/NUMBER
  if (input.includes('github.com') && input.includes('/projects/')) {
    try {
      const url = new URL(input);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Expected: ['orgs', 'org-name', 'projects', 'number'] or ['users', 'username', 'projects', 'number']
      const projectIndex = pathParts.indexOf('projects');
      if (projectIndex >= 0 && pathParts.length > projectIndex + 1) {
        const projectNumber = parseInt(pathParts[projectIndex + 1], 10);
        if (!isNaN(projectNumber)) {
          if (pathParts[0] === 'orgs' && pathParts.length > 1) {
            return { type: 'org', owner: pathParts[1], number: projectNumber };
          } else if (pathParts[0] === 'users' && pathParts.length > 1) {
            return { type: 'user', owner: pathParts[1], number: projectNumber };
          }
        }
      }
    } catch (e) {
      // Not a valid URL, fall through
    }
  }
  return null;
}

function normalizeQuery(input) {
  // Handle GitHub issue/PR list URLs
  // https://github.com/jupyter-book/jupyter-book/issues?q=is%3Aissue+is%3Aopen
  if (input.includes('github.com') && input.includes('/issues')) {
    try {
      const url = new URL(input);
      const qParam = url.searchParams.get('q');
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        const repo = `${pathParts[0]}/${pathParts[1]}`;
        return qParam ? `repo:${repo} ${qParam}` : `repo:${repo}`;
      }
    } catch (e) {
      // Fall through to return input as-is
    }
  }

  // Otherwise assume it's a direct search query
  return input;
}

function fetchProjectIssuesSync(projectInfo, token) {
  const { type, owner, number } = projectInfo;

  const graphqlQuery = `
    query($owner: String!, $number: Int!) {
      ${type === 'org' ? 'organization' : 'user'}(login: $owner) {
        projectV2(number: $number) {
          items(first: 100) {
            nodes {
              fieldValues(first: 20) {
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
                  number
                  title
                  url
                  state
                  author {
                    login
                    ... on User {
                      company
                      organizations(first: 3) {
                        nodes { login }
                      }
                    }
                  }
                  createdAt
                  updatedAt
                  closedAt
                  labels(first: 10) { nodes { name color } }
                  reactions { totalCount }
                  comments { totalCount }
                  timelineItems(first: 20, itemTypes: [CROSS_REFERENCED_EVENT]) {
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
                ... on PullRequest {
                  number
                  title
                  url
                  state
                  author {
                    login
                    ... on User {
                      company
                      organizations(first: 3) {
                        nodes { login }
                      }
                    }
                  }
                  createdAt
                  updatedAt
                  closedAt
                  mergedAt
                  labels(first: 10) { nodes { name color } }
                  reactions { totalCount }
                  comments { totalCount }
                  isDraft
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = { owner, number };
  const body = JSON.stringify({ query: graphqlQuery, variables });

  const curlCommand = `curl -s -X POST https://api.github.com/graphql \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${token}" \
    -d '${body.replace(/'/g, "'\\''")}'`;

  try {
    const response = execSync(curlCommand, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    const data = JSON.parse(response);

    if (data.errors) {
      console.error("GitHub API errors:", data.errors);
      return [];
    }

    const ownerData = data.data?.[type === 'org' ? 'organization' : 'user'];
    const items = ownerData?.projectV2?.items?.nodes || [];

    return items
      .filter(node => node.content && node.content.number && node.content.title && node.content.url) // Filter out invalid items
      .map(node => {
        const item = node.content;

        // Extract author affiliation
        const author = item.author?.login || "unknown";
        const company = item.author?.company || "";
        const orgs = item.author?.organizations?.nodes?.map(o => o.login) || [];
        const affiliation = company || orgs[0] || "";

        // Extract linked PRs (only for issues)
        const linkedPRs = (item.timelineItems?.nodes || [])
          .map(node => node?.source)
          .filter(source => source?.number)
          .map(pr => ({
            number: pr.number,
            url: pr.url,
            state: pr.state,
            merged: pr.mergedAt != null
          }));

        // Extract project field values
        const projectFields = {};
        (node.fieldValues?.nodes || []).forEach(fieldValue => {
          const fieldName = fieldValue.field?.name;
          if (fieldName) {
            // Get the value based on field type
            const value = fieldValue.text || fieldValue.name || fieldValue.number || fieldValue.date || fieldValue.title;
            if (value !== undefined && value !== null) {
              projectFields[fieldName] = value;
            }
          }
        });

        return {
          number: item.number,
          title: item.title,
          url: item.url,
          state: item.state,
          author,
          author_affiliation: affiliation,
          created: item.createdAt,
          updated: item.updatedAt,
          closed: item.closedAt,
          merged: item.mergedAt,
          labels: (item.labels?.nodes || []).map(l => ({ name: l.name, color: l.color })),
          reactions: item.reactions?.totalCount || 0,
          comments: item.comments?.totalCount || 0,
          isDraft: item.isDraft || false,
          linkedPRs,
          type: item.mergedAt !== undefined ? "PR" : "Issue",
          projectFields  // Add project-specific fields
        };
      });
  } catch (error) {
    console.error("Failed to fetch from GitHub project:", error.message);
    return [];
  }
}

function fetchIssuesSync(input, token) {
  // Check if input is a project URL
  const projectInfo = parseProjectUrl(input);
  if (projectInfo) {
    return fetchProjectIssuesSync(projectInfo, token);
  }

  const query = normalizeQuery(input);

  const graphqlQuery = `
    query($query: String!, $first: Int!) {
      search(query: $query, type: ISSUE, first: $first) {
        nodes {
          ... on Issue {
            number
            title
            url
            state
            author {
              login
              ... on User {
                company
                organizations(first: 3) {
                  nodes { login }
                }
              }
            }
            createdAt
            updatedAt
            closedAt
            labels(first: 10) { nodes { name color } }
            reactions { totalCount }
            comments { totalCount }
            timelineItems(first: 20, itemTypes: [CROSS_REFERENCED_EVENT]) {
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
          ... on PullRequest {
            number
            title
            url
            state
            author {
              login
              ... on User {
                company
                organizations(first: 3) {
                  nodes { login }
                }
              }
            }
            createdAt
            updatedAt
            closedAt
            mergedAt
            labels(first: 10) { nodes { name color } }
            reactions { totalCount }
            comments { totalCount }
            isDraft
          }
        }
      }
    }
  `;

  const variables = { query, first: 100 };
  const body = JSON.stringify({ query: graphqlQuery, variables });

  // Use curl for synchronous HTTP request
  const curlCommand = `curl -s -X POST https://api.github.com/graphql \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${token}" \
    -d '${body.replace(/'/g, "'\\''")}'`;

  try {
    const response = execSync(curlCommand, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    const data = JSON.parse(response);

    if (data.errors) {
      console.error("GitHub API errors:", data.errors);
      return [];
    }

    return (data.data?.search?.nodes || []).map(item => {
      // Extract author affiliation (company or first org)
      const author = item.author?.login || "unknown";
      const company = item.author?.company || "";
      const orgs = item.author?.organizations?.nodes?.map(o => o.login) || [];
      const affiliation = company || orgs[0] || "";

      // Extract linked PRs from cross-referenced events
      const linkedPRs = (item.timelineItems?.nodes || [])
        .map(node => node?.source)
        .filter(source => source?.number)
        .map(pr => ({
          number: pr.number,
          url: pr.url,
          state: pr.state,
          merged: pr.mergedAt != null
        }));

      return {
        number: item.number,
        title: item.title,
        url: item.url,
        state: item.state,
        author,
        author_affiliation: affiliation,
        created: item.createdAt,
        updated: item.updatedAt,
        closed: item.closedAt,
        merged: item.mergedAt,
        labels: (item.labels?.nodes || []).map(l => ({ name: l.name, color: l.color })),
        reactions: item.reactions?.totalCount || 0,
        comments: item.comments?.totalCount || 0,
        isDraft: item.isDraft || false,
        linkedPRs,
        type: item.mergedAt !== undefined ? "PR" : "Issue"
      };
    });
  } catch (error) {
    console.error("Failed to fetch from GitHub:", error.message);
    return [];
  }
}

// ============================================================================
// Table Rendering
// ============================================================================

function sortItems(items, sortSpec) {
  if (!sortSpec) return items;

  // Parse multiple sort specifications (comma-separated)
  const sortSpecs = sortSpec.split(",").map(spec => {
    const [column, direction = "desc"] = spec.trim().split("-");
    return { column: column.trim(), ascending: direction === "asc" };
  });

  return [...items].sort((a, b) => {
    // Apply each sort spec in order (left to right priority)
    for (const { column, ascending } of sortSpecs) {
      let aVal = a[column];
      let bVal = b[column];

      // Check if it's a project field
      if (aVal === undefined && a.projectFields) {
        aVal = a.projectFields[column];
      }
      if (bVal === undefined && b.projectFields) {
        bVal = b.projectFields[column];
      }

      // Handle dates
      if (column.includes("created") || column.includes("updated") || column.includes("closed")) {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      // Handle null/undefined
      if (aVal == null && bVal == null) continue;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Compare values
      if (aVal < bVal) return ascending ? -1 : 1;
      if (aVal > bVal) return ascending ? 1 : -1;
      // If equal, continue to next sort spec
    }
    return 0; // All sort specs resulted in equality
  });
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toISOString().split("T")[0];
}

function renderCell(item, column) {
  switch (column) {
    case "number":
      return { type: "text", value: `#${item.number}` };

    case "title":
      return { type: "text", value: stripBrackets(item.title) };

    case "linked_title":
      return {
        type: "link",
        url: item.url,
        children: [{ type: "text", value: stripBrackets(item.title) }]
      };

    case "state":
      const icon = item.state === "OPEN" ? "🟢" : "🟣";
      return { type: "text", value: `${icon} ${item.state}` };

    case "author":
      return { type: "text", value: item.author };

    case "author_affiliation":
      return { type: "text", value: item.author_affiliation || "" };

    case "linked_prs":
      if (!item.linkedPRs || item.linkedPRs.length === 0) {
        return { type: "text", value: "" };
      }
      return {
        type: "paragraph",
        children: item.linkedPRs.flatMap((pr, idx) => {
          // Determine icon: ❌ closed without merge, 🟢 open, 🟣 merged
          let icon;
          if (pr.merged) {
            icon = "🟣";
          } else if (pr.state === "OPEN") {
            icon = "🟢";
          } else {
            icon = "❌";
          }

          const iconText = { type: "text", value: `${icon} ` };
          const prLink = {
            type: "link",
            url: pr.url,
            children: [{ type: "text", value: `#${pr.number}` }]
          };

          return idx > 0
            ? [{ type: "text", value: ", " }, iconText, prLink]
            : [iconText, prLink];
        })
      };

    case "created":
      return { type: "text", value: formatDate(item.created) };

    case "updated":
      return { type: "text", value: formatDate(item.updated) };

    case "reactions":
      return { type: "text", value: `👍 ${item.reactions}` };

    case "comments":
      return { type: "text", value: String(item.comments) };

    case "labels":
      if (!item.labels || item.labels.length === 0) {
        return { type: "text", value: "" };
      }
      // Create styled label badges
      return {
        type: "paragraph",
        children: item.labels.flatMap((label, idx) => {
          if (!label || !label.name || !label.color) {
            return []; // Skip invalid labels
          }
          const bgColor = `#${label.color}`;
          // Calculate contrasting text color
          const rgb = parseInt(label.color, 16);
          const r = (rgb >> 16) & 0xff;
          const g = (rgb >> 8) & 0xff;
          const b = rgb & 0xff;
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          const textColor = brightness > 128 ? "#000000" : "#ffffff";

          const badge = {
            type: "html",
            value: `<span style="background-color: ${bgColor}; color: ${textColor}; padding: 2px 6px; border-radius: 3px; font-size: 0.85em; display: inline-block; margin: 2px;">${label.name}</span>`
          };

          return idx > 0 ? [{ type: "text", value: " " }, badge] : [badge];
        })
      };

    default:
      // Check if it's a project field
      if (item.projectFields && item.projectFields[column]) {
        return { type: "text", value: String(item.projectFields[column]) };
      }
      return { type: "text", value: "" };
  }
}

function buildTable(items, columns) {
  const headerRow = {
    type: "tableRow",
    children: columns.map(col => ({
      type: "tableCell",
      children: [{
        type: "paragraph",
        children: [{ type: "text", value: (col || "").replace(/_/g, " ").toUpperCase() }]
      }]
    }))
  };

  const dataRows = items.map(item => ({
    type: "tableRow",
    children: columns.map(col => ({
      type: "tableCell",
      children: [{
        type: "paragraph",
        children: [renderCell(item, col)]
      }]
    }))
  }));

  return {
    type: "table",
    children: [headerRow, ...dataRows]
  };
}

// ============================================================================
// Directive
// ============================================================================

const directive = {
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
      doc: "Comma-separated column names (default: linked_title,author,state,reactions)"
    },
    sort: {
      type: String,
      doc: "Sort by column-direction (e.g., 'reactions-desc')"
    }
  },
  run(data, _vfile, ctx) {
    const query = data.arg?.trim();
    if (!query) {
      return ctx.parseMyst("*Please provide a search query*").children;
    }

    // Get options
    const columns = (data.options?.columns || "linked_title,author,state,reactions")
      .split(",")
      .map(c => c.trim());
    const sort = data.options?.sort;

    // Check cache
    let items = readCache(query);

    // If no cache, fetch data
    if (!items) {
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        return ctx.parseMyst("*Error: GITHUB_TOKEN environment variable not set*").children;
      }

      console.log(`Fetching GitHub data for query: ${query}`);
      items = fetchIssuesSync(query, token);
      writeCache(query, items);
    } else {
      console.log(`Using cached data for query: ${query}`);
    }

    if (items.length === 0) {
      return ctx.parseMyst("*No issues found matching this query*").children;
    }

    // Sort and render
    const sorted = sortItems(items, sort);
    const table = buildTable(sorted, columns);

    return [table];
  }
};

const plugin = {
  name: "GitHub Issue Table",
  directives: [directive]
};

export default plugin;
