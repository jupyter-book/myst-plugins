const PAGINATION_SIZE = 100;
const MAX_FIELD_VALUES = 20;
const MAX_ORGANIZATIONS = 3;
const MAX_LABELS = 10;
const MAX_TIMELINE_ITEMS = 20;


/** Parse GitHub project URLs (e.g. https://github.com/orgs/ORG/projects/N/views/V). */
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

/** Convert issue list URLs (github.com/owner/repo/issues?q=...) to search queries. */
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

  return input;
}


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
    reactions_thumbsup: reactions(content: THUMBS_UP) { totalCount }
    reactions_thumbsdown: reactions(content: THUMBS_DOWN) { totalCount }
    reactions_laugh: reactions(content: LAUGH) { totalCount }
    reactions_hooray: reactions(content: HOORAY) { totalCount }
    reactions_confused: reactions(content: CONFUSED) { totalCount }
    reactions_heart: reactions(content: HEART) { totalCount }
    reactions_rocket: reactions(content: ROCKET) { totalCount }
    reactions_eyes: reactions(content: EYES) { totalCount }
    comments { totalCount }
    timelineItems(first: ${MAX_TIMELINE_ITEMS}, itemTypes: [CROSS_REFERENCED_EVENT]) {
      nodes {
        ... on CrossReferencedEvent {
          willCloseTarget
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
    subIssues(first: 100) {
      nodes {
        number
        title
        url
        updatedAt
        state
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
    reactions_thumbsup: reactions(content: THUMBS_UP) { totalCount }
    reactions_thumbsdown: reactions(content: THUMBS_DOWN) { totalCount }
    reactions_laugh: reactions(content: LAUGH) { totalCount }
    reactions_hooray: reactions(content: HOORAY) { totalCount }
    reactions_confused: reactions(content: CONFUSED) { totalCount }
    reactions_heart: reactions(content: HEART) { totalCount }
    reactions_rocket: reactions(content: ROCKET) { totalCount }
    reactions_eyes: reactions(content: EYES) { totalCount }
    comments { totalCount }
    isDraft
  }
`;


/** Fetch a project view's filter and sort configuration. */
async function fetchProjectViewFilter(projectInfo, token) {
  const { type, owner, number, viewNumber } = projectInfo;
  if (!viewNumber) return { found: false, filter: null, sort: null };

  const graphqlQuery = `
    query($owner: String!, $number: Int!) {
      ${type === 'org' ? 'organization' : 'user'}(login: $owner) {
        projectV2(number: $number) {
          views(first: 50) {
            nodes {
              number
              filter
              sortByFields(first: 5) {
                nodes {
                  field {
                    ... on ProjectV2Field {
                      name
                    }
                    ... on ProjectV2SingleSelectField {
                      name
                    }
                    ... on ProjectV2IterationField {
                      name
                    }
                  }
                  direction
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
      return { found: false, filter: null, sort: null };
    }

    // Extract sort configuration from sortByFields
    const sortByFields = view.sortByFields?.nodes || [];
    const sort = sortByFields
      .map(sortField => {
        const fieldName = sortField.field?.name;
        const direction = sortField.direction?.toLowerCase(); // ASC or DESC
        if (!fieldName || !direction) return null;
        return { field: fieldName, direction };
      })
      .filter(Boolean);

    return { found: true, filter: view.filter ?? "", sort: sort.length > 0 ? sort : null };
  } catch (error) {
    console.error("Failed to fetch project view filter:", error.message);
    return { found: false, filter: null, sort: null };
  }
}

/** Fetch issues/PRs from a GitHub project board. */
async function fetchProjectIssues(projectInfo, token, limit = 100) {
  const { type, owner, number, viewNumber, viewQuery } = projectInfo;
  const maxLimit = limit || PAGINATION_SIZE;

  // Resolve the query used by the project view (if provided)
  let itemQuery = viewQuery ? viewQuery.trim() : null;
  let viewFound = !viewNumber;
  let viewSort = null;
  if (viewNumber && itemQuery) {
    viewFound = true;
  }

  if (!itemQuery && viewNumber) {
    const { filter, found, sort } = await fetchProjectViewFilter(projectInfo, token);
    viewFound = found;
    viewSort = sort;
    if (filter !== null && filter !== undefined) {
      itemQuery = String(filter).trim() || null;
    }
  }

  if (viewNumber && !viewFound) {
    console.error(`Project view ${viewNumber} not found for ${type} ${owner}`);
    return { items: [], viewSort: null };
  }

  // Use the view's filter as-is
  // The project view's own filters determine what's visible (excluding archived items)

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
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        const message = data.errors?.[0]?.message || "Unknown GitHub API error";
        throw new Error(message);
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
        if (requiresTeamPriority && !hasTeamPriority(node)) return false;
        return true;
      })
      .map(node => normalizeIssueData(node.content, node));

    // Ensure we don't return more than requested
    const items = filtered.slice(0, maxLimit);
    return { items, viewSort };
  } catch (error) {
    console.error("Failed to fetch from GitHub project:", error.message);
    throw error;
  }
}


/** Check if sort can be delegated to GitHub's search API. */
function getGitHubSort(sortSpec) {
  if (!sortSpec) return { supported: false, sortQuery: null };

  // Check if it's single-column sort (GitHub only supports one)
  const sortParts = sortSpec.split(",");
  if (sortParts.length > 1) {
    // Multi-column sort - needs client-side handling
    return { supported: false, sortQuery: null };
  }

  // Parse single sort spec
  const [column, direction = "desc"] = sortSpec.trim().split("-");
  const col = column.trim().toLowerCase();
  const dir = direction.trim().toLowerCase();

  // Check if GitHub supports this sort field
  // See: https://docs.github.com/en/search-github/getting-started-with-searching-on-github/sorting-search-results
  const githubSupported = ["reactions", "interactions", "comments", "created", "updated"];

  if (!githubSupported.includes(col)) {
    // Unsupported field (e.g., project fields) - needs client-side handling
    return { supported: false, sortQuery: null };
  }

  // Build GitHub search sort query
  return { supported: true, sortQuery: `sort:${col}-${dir}` };
}

/** Fetch issues/PRs using GitHub search API. */
async function fetchIssuesFromSearch(query, token, limit = 100) {
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

      const variables = { query, first, cursor };
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
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        const message = data.errors?.[0]?.message || "Unknown GitHub API error";
        throw new Error(message);
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
    throw error;
  }
}


/** Normalize raw GraphQL issue/PR data into the flat shape used by column renderers. */
function normalizeIssueData(item, projectNode = null) {
  // Extract author affiliation (company or first org)
  const author = item.author?.login || "unknown";
  const company = item.author?.company || "";
  const orgs = item.author?.organizations?.nodes?.map(o => o.login) || [];
  const affiliation = company || orgs[0] || "";

  // Extract linked PRs from cross-referenced events (issues only)
  const timelineNodes = item.timelineItems?.nodes || [];
  const linkedPRs = timelineNodes
    .map(node => {
      const pr = node?.source;
      if (!pr?.number) {
        return null;
      }
      return {
        number: pr.number,
        url: pr.url,
        state: pr.state,
        merged: pr.mergedAt != null,
        willClose: Boolean(node?.willCloseTarget)
      };
    })
    .filter(Boolean);
  const closingPRs = linkedPRs.filter(pr => pr.willClose);

  // Extract sub-issues
  const subIssues = (item.subIssues?.nodes || []).map(sub => ({
    number: sub.number,
    title: sub.title,
    url: sub.url,
    updated: sub.updatedAt,
    state: sub.state
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
    interactions: item.reactions?.totalCount || 0,
    reactions_thumbsup: item.reactions_thumbsup?.totalCount || 0,
    reactions_thumbsdown: item.reactions_thumbsdown?.totalCount || 0,
    reactions_laugh: item.reactions_laugh?.totalCount || 0,
    reactions_hooray: item.reactions_hooray?.totalCount || 0,
    reactions_confused: item.reactions_confused?.totalCount || 0,
    reactions_heart: item.reactions_heart?.totalCount || 0,
    reactions_rocket: item.reactions_rocket?.totalCount || 0,
    reactions_eyes: item.reactions_eyes?.totalCount || 0,
    comments: item.comments?.totalCount || 0,
    isDraft: item.isDraft || false,
    linkedPRs,
    closingPRs,
    subIssues,
    type: item.mergedAt !== undefined ? "PR" : "Issue",
    ...projectFields  // Flatten project fields into main object
  };
}


/** Main entry point — accepts a search query or project URL. */
export async function fetchIssues(input, token, limit = 100, sortSpec = null) {
  // Check if input is a project URL
  const projectInfo = parseProjectUrl(input);
  if (projectInfo) {
    // Note: Project queries don't support server-side sorting via GraphQL
    const { items, viewSort } = await fetchProjectIssues(projectInfo, token, limit);

    // Convert viewSort array to plugin sort spec format
    let viewSortSpec = null;
    if (viewSort && viewSort.length > 0) {
      viewSortSpec = viewSort
        .map(s => `${s.field}-${s.direction}`)
        .join(',');
    }

    return { items, viewSort: viewSortSpec };
  }

  // Otherwise treat as search query
  let query = normalizeQuery(input);

  // Check if sort can be handled by GitHub
  const { supported, sortQuery } = getGitHubSort(sortSpec);

  let fetchLimit;
  if (supported && sortQuery) {
    // GitHub supports this sort - append to query and fetch only what we need
    query = `${query} ${sortQuery}`;
    fetchLimit = limit;
  } else if (sortSpec) {
    // Multi-column or unsupported field - fetch more for client-side sorting
    fetchLimit = Math.max(limit * 3, 100);
  } else {
    // No sort specified - fetch what we need
    fetchLimit = limit;
  }

  const items = await fetchIssuesFromSearch(query, token, fetchLimit);
  return { items, viewSort: null };
}
