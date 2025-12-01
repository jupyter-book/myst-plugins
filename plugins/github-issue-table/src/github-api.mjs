// GitHub API Integration for Issue Table Plugin
// Handles GraphQL queries for issues, PRs, and project boards

// ============================================================================
// Constants
// ============================================================================

const PAGINATION_SIZE = 100;
const MAX_FIELD_VALUES = 20;
const MAX_ORGANIZATIONS = 3;
const MAX_LABELS = 10;
const MAX_TIMELINE_ITEMS = 20;

// ============================================================================
// URL Parsing
// ============================================================================

/**
 * Parse GitHub project URLs
 * Supports: https://github.com/orgs/ORG/projects/NUMBER/views/VIEW
 * @param {string} input - URL or query string
 * @returns {Object|null} Parsed project info or null
 */
export function parseProjectUrl(input) {
  if (input.includes('github.com') && input.includes('/projects/')) {
    try {
      const url = new URL(input);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Expected: ['orgs', 'org-name', 'projects', 'number'] or ['users', 'username', 'projects', 'number']
      const projectIndex = pathParts.indexOf('projects');
      if (projectIndex >= 0 && pathParts.length > projectIndex + 1) {
        const projectNumber = parseInt(pathParts[projectIndex + 1], 10);
        const viewIndex = pathParts.indexOf('views');
        const viewNumber = viewIndex >= 0 && pathParts.length > viewIndex + 1
          ? parseInt(pathParts[viewIndex + 1], 10)
          : null;
        const viewQuery = url.searchParams.get('query') || url.searchParams.get('filterQuery');
        if (!isNaN(projectNumber)) {
          if (pathParts[0] === 'orgs' && pathParts.length > 1) {
            return { type: 'org', owner: pathParts[1], number: projectNumber, viewNumber, viewQuery };
          } else if (pathParts[0] === 'users' && pathParts.length > 1) {
            return { type: 'user', owner: pathParts[1], number: projectNumber, viewNumber, viewQuery };
          }
        }
      }
    } catch (e) {
      // Not a valid URL, fall through
    }
  }
  return null;
}

/**
 * Normalize GitHub issue list URLs to search queries
 * Converts: https://github.com/owner/repo/issues?q=... to repo:owner/repo ...
 * @param {string} input - URL or query string
 * @returns {string} Normalized search query
 */
export function normalizeQuery(input) {
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

// ============================================================================
// GraphQL Fragments
// ============================================================================

const ISSUE_FIELDS_FRAGMENT = `
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

const PR_FIELDS_FRAGMENT = `
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

// ============================================================================
// GraphQL Queries - Project Boards
// ============================================================================

/**
 * Fetch project view filter using GraphQL
 * @param {Object} projectInfo - Parsed project info
 * @param {string} token - GitHub API token
 * @returns {Promise<Object>} { found: boolean, filter: string|null }
 */
async function fetchProjectViewFilter(projectInfo, token) {
  const { type, owner, number, viewNumber } = projectInfo;
  if (!viewNumber) return { found: false, filter: null };

  const graphqlQuery = `
    query($owner: String!, $number: Int!) {
      ${type === 'org' ? 'organization' : 'user'}(login: $owner) {
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
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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

    const ownerData = data.data?.[type === 'org' ? 'organization' : 'user'];
    const views = ownerData?.projectV2?.views?.nodes || [];
    const view = views.find(v => v?.number === viewNumber);
    if (!view) {
      return { found: false, filter: null };
    }
    return { found: true, filter: view.filter ?? "" };
  } catch (error) {
    console.error("Failed to fetch project view filter:", error.message);
    return { found: false, filter: null };
  }
}

/**
 * Fetch issues/PRs from a GitHub project board
 * @param {Object} projectInfo - Parsed project info
 * @param {string} token - GitHub API token
 * @param {number} limit - Maximum number of results to fetch (default: 100)
 * @returns {Promise<Array>} Array of normalized issue/PR objects
 */
async function fetchProjectIssues(projectInfo, token, limit = 100) {
  const { type, owner, number, viewNumber, viewQuery } = projectInfo;
  const maxLimit = limit || PAGINATION_SIZE;

  // Resolve the query used by the project view (if provided)
  let itemQuery = viewQuery ? viewQuery.trim() : null;
  let viewFound = !viewNumber;
  if (viewNumber && itemQuery) {
    viewFound = true;
  }

  if (!itemQuery && viewNumber) {
    const { filter, found } = await fetchProjectViewFilter(projectInfo, token);
    viewFound = found;
    if (filter !== null && filter !== undefined) {
      itemQuery = String(filter).trim() || null;
    }
  }

  if (viewNumber && !viewFound) {
    console.error(`Project view ${viewNumber} not found for ${type} ${owner}`);
    return [];
  }

  // If the view filter doesn't specify state, mirror the UI default by only requesting open items.
  if (itemQuery) {
    const normalized = itemQuery.toLowerCase();
    const mentionsState = ["is:open", "is:closed", "state:open", "state:closed", "is:merged", "state:merged"]
      .some(token => normalized.includes(token));
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
      ${type === 'org' ? 'organization' : 'user'}(login: $owner) {
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
    while (allItems.length < maxLimit) {
      const variables = itemQuery ? { owner, number, itemQuery, cursor } : { owner, number, cursor };
      const body = JSON.stringify({ query: graphqlQuery, variables });

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: body
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

      const ownerData = data.data?.[type === 'org' ? 'organization' : 'user'];
      const page = ownerData?.projectV2?.items;
      const items = page?.nodes || [];
      allItems = allItems.concat(items);

      const pageInfo = page?.pageInfo;
      if (!pageInfo?.hasNextPage || allItems.length >= maxLimit) {
        break;
      }
      cursor = pageInfo.endCursor;
    }

    const normalizedQuery = (itemQuery || "").toLowerCase();
    const allowClosed =
      normalizedQuery.includes("is:closed") ||
      normalizedQuery.includes("state:closed") ||
      normalizedQuery.includes("is:merged") ||
      normalizedQuery.includes("state:merged");
    const requiresTeamPriority = normalizedQuery.includes("has:team-priority");

    const hasTeamPriority = (node) => {
      const values = node?.fieldValues?.nodes || [];
      return values.some(v => {
        const name = v?.field?.name;
        const val = v?.text || v?.name || v?.number || v?.date || v?.title;
        return name === "Team Priority" && val != null && val !== "";
      });
    };

    const filtered = allItems
      .filter(node => {
        const item = node?.content;
        if (!item || !item.number || !item.title || !item.url) return false;
        if (!allowClosed && item.state !== "OPEN") return false;
        if (requiresTeamPriority && !hasTeamPriority(node)) return false;
        return true;
      })
      .map(node => normalizeIssueData(node.content, node));

    // Ensure we don't return more than requested
    return filtered.slice(0, maxLimit);
  } catch (error) {
    console.error("Failed to fetch from GitHub project:", error.message);
    return [];
  }
}

// ============================================================================
// GraphQL Queries - Issue Search
// ============================================================================

/**
 * Map sort specification to GitHub search sort parameter
 * @param {string} sortSpec - Sort specification (e.g., "reactions-desc")
 * @returns {string|null} GitHub search sort parameter or null if not supported
 */
function mapSortToGitHubSearch(sortSpec) {
  if (!sortSpec) return null;

  // Parse first sort spec (primary sort) - GitHub search only supports one
  const [column, direction = "desc"] = sortSpec.split(",")[0].trim().split("-");
  const col = column.trim().toLowerCase();
  const dir = direction.trim().toLowerCase();

  // Map to GitHub search sort options
  // See: https://docs.github.com/en/search-github/searching-on-github/sorting-search-results
  // Note: GitHub search does NOT support sort:reactions, only sort:interactions
  const sortMap = {
    "interactions": "interactions",
    "updated": "updated",
    "created": "created",
    "comments": "comments"
  };

  const githubSort = sortMap[col];
  if (!githubSort) return null;

  // GitHub search uses sort:field-direction format
  return `sort:${githubSort}-${dir}`;
}

/**
 * Fetch issues/PRs using GitHub search API
 * @param {string} query - Search query
 * @param {string} token - GitHub API token
 * @param {number} limit - Maximum number of results to fetch (default: 100)
 * @param {string} sortSpec - Sort specification (e.g., "reactions-desc,updated-desc")
 * @returns {Promise<Array>} Array of normalized issue/PR objects
 */
async function fetchIssuesFromSearch(query, token, limit = 100, sortSpec = null) {
  // Append sort to query if supported by GitHub search
  let searchQuery = query;
  const githubSort = mapSortToGitHubSearch(sortSpec);
  if (githubSort) {
    searchQuery = `${query} ${githubSort}`;
  }
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

  let cursor = null;
  let allNodes = [];
  const maxLimit = limit || PAGINATION_SIZE;

  try {
    while (allNodes.length < maxLimit) {
      // Fetch exactly what we need, or PAGINATION_SIZE, whichever is smaller
      const remainingNeeded = maxLimit - allNodes.length;
      const first = Math.min(remainingNeeded, PAGINATION_SIZE);

      const variables = { query: searchQuery, first, cursor };
      const body = JSON.stringify({ query: graphqlQuery, variables });

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: body
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

      if (!page?.pageInfo?.hasNextPage || allNodes.length >= maxLimit) {
        break;
      }
      cursor = page.pageInfo.endCursor;
    }

    // Ensure we don't return more than requested
    return allNodes.slice(0, maxLimit).map(item => normalizeIssueData(item));
  } catch (error) {
    console.error("Failed to fetch from GitHub:", error.message);
    return [];
  }
}

// ============================================================================
// Data Normalization
// ============================================================================

/**
 * Normalize issue/PR data from GraphQL response
 * @param {Object} item - Raw GraphQL issue/PR object
 * @param {Object} projectNode - Optional project node (for project fields)
 * @returns {Object} Normalized issue/PR object
 */
function normalizeIssueData(item, projectNode = null) {
  // Extract author affiliation (company or first org)
  const author = item.author?.login || "unknown";
  const company = item.author?.company || "";
  const orgs = item.author?.organizations?.nodes?.map(o => o.login) || [];
  const affiliation = company || orgs[0] || "";

  // Extract linked PRs from cross-referenced events (issues only)
  const linkedPRs = (item.timelineItems?.nodes || [])
    .map(node => node?.source)
    .filter(source => source?.number)
    .map(pr => ({
      number: pr.number,
      url: pr.url,
      state: pr.state,
      merged: pr.mergedAt != null
    }));

  // Extract project field values (if available)
  const projectFields = {};
  if (projectNode?.fieldValues?.nodes) {
    projectNode.fieldValues.nodes.forEach(fieldValue => {
      const fieldName = fieldValue.field?.name;
      if (fieldName) {
        const value = fieldValue.text || fieldValue.name || fieldValue.number || fieldValue.date || fieldValue.title;
        if (value !== undefined && value !== null) {
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
    labels: (item.labels?.nodes || []).map(l => ({ name: l.name, color: l.color })),
    reactions: item.reactions?.totalCount || 0,
    comments: item.comments?.totalCount || 0,
    isDraft: item.isDraft || false,
    linkedPRs,
    type: item.mergedAt !== undefined ? "PR" : "Issue",
    ...projectFields  // Flatten project fields into main object
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Fetch issues/PRs from GitHub (handles both search queries and project URLs)
 * @param {string} input - Search query or project URL
 * @param {string} token - GitHub API token
 * @param {number} limit - Maximum number of results to fetch (default: 100)
 * @param {string} sortSpec - Sort specification (e.g., "reactions-desc,updated-desc")
 * @returns {Promise<Array>} Array of normalized issue/PR objects
 */
export async function fetchIssues(input, token, limit = 100, sortSpec = null) {
  // Check if input is a project URL
  const projectInfo = parseProjectUrl(input);
  if (projectInfo) {
    // Note: Project queries don't support server-side sorting via GraphQL
    return await fetchProjectIssues(projectInfo, token, limit);
  }

  // Otherwise treat as search query
  const query = normalizeQuery(input);

  // Check if the sort is supported by GitHub API
  const githubSort = mapSortToGitHubSearch(sortSpec);

  // If sort is NOT supported by GitHub (like reactions), fetch more items
  // so JavaScript sorting can find the true top N
  const fetchLimit = githubSort ? limit : Math.max(limit * 4, 100);

  return await fetchIssuesFromSearch(query, token, fetchLimit, sortSpec);
}
