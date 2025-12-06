// GitHub Issue Table Plugin
// Renders GitHub issues/PRs as tables from search queries

import { fetchIssues } from "./github-api.mjs";
import { readCache, writeCache } from "./cache.mjs";
import { parseTemplates } from "./utils.mjs";
import { renderCell } from "./columns.mjs";

let sharedParseMyst = null; // captured from directive ctx; reused in transform

// ============================================================================
// Table Sorting and Building
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

      // Handle dates
      if (column.includes("created") || column.includes("updated") || column.includes("closed")) {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      // Handle numeric fields (interactions and individual reactions)
      if (column === "interactions" || column.startsWith("reactions_")) {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
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

function buildTable(items, columns, options = {}) {
  const headerRow = {
    type: "tableRow",
    children: columns.map(col => ({
      type: "tableCell",
      children: [{ type: "text", value: (col || "").replace(/_/g, " ").toUpperCase() }]
    }))
  };

  const dataRows = items.map(item => ({
    type: "tableRow",
    children: columns.map(col => {
      const cellContent = renderCell(item, col, options);

      // Defensive check
      if (!cellContent) {
        return {
          type: "tableCell",
          children: [{ type: "text", value: "" }]
        };
      }

      // Table cells should contain phrasing content, not paragraphs
      // If renderCell returns a paragraph, extract its children
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

// ============================================================================
// Directive (Synchronous - creates placeholder)
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
      doc: "Comma-separated column names (default: title,author,state,reactions)"
    },
    sort: {
      type: String,
      doc: "Sort by column-direction (e.g., 'reactions-desc')"
    },
    limit: {
      type: Number,
      doc: "Maximum number of results to display (default: 25)"
    },
    "body-truncate": {
      type: Number,
      doc: "Truncate body text to this many characters"
    },
    "date-format": {
      type: String,
      doc: "Date format: 'relative', 'absolute', or strftime pattern"
    },
    "summary-header": {
      type: String,
      doc: "Comma-separated keywords to search for in summary extraction (e.g., 'summary,context,overview')"
    },
    "summary-truncate": {
      type: Number,
      doc: "Truncate summary text to this many characters"
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

    // Get options
    const columns = (data.options?.columns || "title,author,state,reactions")
      .split(",")
      .map(c => c.trim());
    const sort = data.options?.sort;
    const limit = data.options?.limit ?? 25;  // Default to 25 items
    const bodyTruncate = data.options?.["body-truncate"];
    const dateFormat = data.options?.["date-format"];
    const summaryHeader = data.options?.["summary-header"];
    const summaryTruncate = data.options?.["summary-truncate"];
    const templates = data.options?.templates;

    // Capture parseMyst for later use in transform
    if (!sharedParseMyst && ctx?.parseMyst) {
      sharedParseMyst = ctx.parseMyst;
    }

    // Return a placeholder node that the transform will replace
    return [{
      type: "githubIssueTablePlaceholder",
      query,
      columns,
      sort,
      limit,
      bodyTruncate,
      dateFormat,
      summaryHeader,
      summaryTruncate,
      templates
    }];
  }
};

// ============================================================================
// Transform (Asynchronous - fetches data and builds table)
// ============================================================================

function walk(node, callback) {
  if (!node) return;
  callback(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, callback);
    }
  }
}

const githubIssueTableTransform = {
  name: "github-issue-table-transform",
  stage: "document",
  doc: "Replace placeholder nodes with GitHub issue tables",
  plugin: () => {
    return async (tree) => {
      const placeholders = [];

      // Find all placeholder nodes
      walk(tree, (node) => {
        if (node?.type === "githubIssueTablePlaceholder") {
          placeholders.push(node);
        }
      });

      if (placeholders.length === 0) return;

      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        console.error("GITHUB_TOKEN environment variable not set");
        // Replace placeholders with error messages
        placeholders.forEach(placeholder => {
          placeholder.type = "paragraph";
          placeholder.children = [{ type: "text", value: "*Error: GITHUB_TOKEN environment variable not set*" }];
          delete placeholder.query;
          delete placeholder.columns;
          delete placeholder.sort;
          delete placeholder.limit;
          delete placeholder.bodyTruncate;
          delete placeholder.dateFormat;
          delete placeholder.summaryHeader;
          delete placeholder.summaryTruncate;
          delete placeholder.templates;
        });
        return;
      }

      // Process each placeholder
      await Promise.all(
        placeholders.map(async (placeholder) => {
          const { query, columns, sort, limit, bodyTruncate, dateFormat, summaryHeader, summaryTruncate, templates: templateString } = placeholder;
          const parseMyst = sharedParseMyst;
          const templates = parseTemplates(templateString);

          // Include limit and sort in cache key (different sorts return different "top N" items)
          const cacheKey = `${query}|limit:${limit}|sort:${sort || "none"}`;

          // Check cache
          let items = readCache(cacheKey);

          // If no cache, fetch data
          if (!items) {
            console.log(`Fetching GitHub data for query: ${query} (limit: ${limit}, sort: ${sort || "none"})`);
            items = await fetchIssues(query, token, limit, sort);
            writeCache(cacheKey, items);
          } else {
            console.log(`Using cached data for query: ${query} (limit: ${limit}, sort: ${sort || "none"})`);
          }

          if (items.length === 0) {
            // Replace with "no results" message
            placeholder.type = "paragraph";
            placeholder.children = [{ type: "text", value: "*No issues found matching this query*" }];
            delete placeholder.query;
            delete placeholder.columns;
            delete placeholder.sort;
            delete placeholder.limit;
            delete placeholder.bodyTruncate;
            delete placeholder.dateFormat;
            delete placeholder.summaryHeader;
            delete placeholder.summaryTruncate;
            return;
          }

          // Sort items
          let sorted = sortItems(items, sort);

          // Apply limit after sorting (fetch may have retrieved more items for accurate sorting)
          if (limit && limit > 0 && sorted.length > limit) {
            sorted = sorted.slice(0, limit);
          }

          // Build table with options
          const table = buildTable(sorted, columns, { bodyTruncate, dateFormat, summaryHeader, summaryTruncate, templates, parseMyst });

          // Replace placeholder with table
          placeholder.type = table.type;
          placeholder.children = table.children;
          delete placeholder.query;
          delete placeholder.columns;
          delete placeholder.sort;
          delete placeholder.limit;
          delete placeholder.bodyTruncate;
          delete placeholder.dateFormat;
          delete placeholder.summaryHeader;
          delete placeholder.summaryTruncate;
          delete placeholder.templates;
        })
      );
    };
  }
};

// ============================================================================
// Plugin Export
// ============================================================================

const plugin = {
  name: "GitHub Issue Table",
  directives: [directive],
  transforms: [githubIssueTableTransform]
};

export default plugin;
