// GitHub Issue Table Plugin
// Renders GitHub issues/PRs as tables from search queries

import { fetchIssues } from "./github-api.mjs";
import { readCache, writeCache } from "./cache.mjs";
import { parseTemplates, parseWidths } from "./utils.mjs";
import { renderCell, renderSubIssuesBlock } from "./columns.mjs";

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

function replaceWithError(placeholder, message) {
  Object.keys(placeholder).forEach(k => { if (k !== "type") delete placeholder[k]; });
  placeholder.type = "paragraph";
  placeholder.children = [{ type: "text", value: `*Error: ${message}*` }];
}

export function validateOptions({ columns, subIssuesIn, widths }) {
  if (subIssuesIn && !columns.includes(subIssuesIn)) {
    return `append-sub-issues column "${subIssuesIn}" not found in columns list`;
  }
  if (widths) {
    const parts = widths.split(",").map(w => w.trim());
    if (parts.length !== columns.length) {
      return `widths: expected ${columns.length} values (one per column) but got ${parts.length}`;
    }
    if (parts.some(w => isNaN(parseFloat(w)) || parseFloat(w) <= 0)) {
      return "widths: all values must be positive numbers";
    }
  }
  return null;
}

function buildTable(items, columns, options = {}) {
  const { widths } = options;

  function applyWidth(cell, colIndex) {
    if (widths && widths[colIndex] != null) {
      cell.style = { ...cell.style, width: `${widths[colIndex]}%` };
    }
    return cell;
  }

  const headerRow = {
    type: "tableRow",
    children: columns.map((col, i) => applyWidth({
      type: "tableCell",
      children: [{ type: "text", value: (col || "").replace(/_/g, " ").toUpperCase() }]
    }, i))
  };

  const dataRows = items.map(item => ({
    type: "tableRow",
    children: columns.map((col, i) => {
      const cellContent = renderCell(item, col, options);

      // Defensive check
      if (!cellContent) {
        return applyWidth({
          type: "tableCell",
          children: [{ type: "text", value: "" }]
        }, i);
      }

      // Table cells should contain phrasing content, not paragraphs
      // If renderCell returns a paragraph, extract its children
      let children;
      if (cellContent.type === "paragraph") {
        children = Array.isArray(cellContent.children) ? cellContent.children : [{ type: "text", value: "" }];
      } else {
        children = [cellContent];
      }

      return applyWidth({
        type: "tableCell",
        children
      }, i);
    })
  }));

  // Post-process: add sub-issues to specified column if requested
  const { subIssuesIn } = options;
  if (subIssuesIn && columns.includes(subIssuesIn)) {
    const columnIndex = columns.indexOf(subIssuesIn);
    dataRows.forEach((row, idx) => {
      const item = items[idx];
      const cell = row.children[columnIndex];
      const subIssuesBlock = renderSubIssuesBlock(item, options);

      if (subIssuesBlock) {
        // Add spacing before sub-issues block
        cell.children.push({ type: "text", value: " " });
        // Append the sub-issues block to the cell
        cell.children.push(subIssuesBlock);
      }
    });
  }

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
    "append-sub-issues": {
      type: String,
      doc: "Column name where sub-issues should be displayed inline (e.g., 'title')"
    },
    templates: {
      type: String,
      doc: "Custom column templates: name=My text with {{field}} placeholders; separate multiple with semicolons"
    },
    widths: {
      type: String,
      doc: "Comma-separated column width percentages (e.g., '30,50,20'). Normalized if sum exceeds 100%."
    },
    "label-columns": {
      type: String,
      doc: "Define label subset columns: name=pattern,pattern; separate multiple with semicolons (e.g., 'type=type:*; priority=priority:*')"
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
    const subIssuesIn = data.options?.["append-sub-issues"];
    const templates = data.options?.templates;
    const widths = data.options?.widths;
    const labelColumnsStr = data.options?.["label-columns"];

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
      subIssuesIn,
      templates,
      widths,
      labelColumnsStr
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
        placeholders.forEach(p => replaceWithError(p, "GITHUB_TOKEN environment variable not set"));
        return;
      }

      // Process each placeholder
      await Promise.all(
        placeholders.map(async (placeholder) => {
          const { query, columns, sort, limit, bodyTruncate, dateFormat, summaryHeader, summaryTruncate, subIssuesIn, widths: widthsStr, templates: templateString, labelColumnsStr } = placeholder;

          // Validate directive options
          const validationError = validateOptions({ columns, subIssuesIn, widths: widthsStr });
          if (validationError) {
            replaceWithError(placeholder, validationError);
            return;
          }

          const parseMyst = sharedParseMyst;
          const templates = parseTemplates(templateString);
          const labelColumns = parseTemplates(labelColumnsStr);
          const widths = widthsStr ? parseWidths(widthsStr) : undefined;

          // Include limit and sort in cache key (different sorts return different "top N" items)
          const cacheKey = `${query}|limit:${limit}|sort:${sort || "none"}`;

          // Check cache
          let cachedData = readCache(cacheKey);
          let items;
          let effectiveSort = sort; // The sort to actually use

          // If no cache, fetch data
          if (!cachedData) {
            try {
              console.log(`Fetching GitHub data for query: ${query} (limit: ${limit}, sort: ${sort || "none"})`);
              const { items: fetchedItems, viewSort } = await fetchIssues(query, token, limit, sort);

              // Use view's sort as default if no explicit sort was provided
              if (!sort && viewSort) {
                effectiveSort = viewSort;
                console.log(`Using project view's sort: ${viewSort}`);
              }

              cachedData = { items: fetchedItems, viewSort };
              writeCache(cacheKey, cachedData);
              items = fetchedItems;
            } catch (err) {
              console.error("Error fetching GitHub data:", err);
              replaceWithError(placeholder, `fetching GitHub data: ${err?.message || err}`);
              return;
            }
          } else {
            console.log(`Using cached data for query: ${query} (limit: ${limit}, sort: ${sort || "none"})`);
            items = cachedData.items || cachedData; // Handle both old and new cache formats

            // Use view's sort as default if no explicit sort was provided
            if (!sort && cachedData.viewSort) {
              effectiveSort = cachedData.viewSort;
            }
          }

          if (items.length === 0) {
            replaceWithError(placeholder, "No issues found matching this query");
            return;
          }

          // Sort items using effectiveSort (explicit :sort: or view's default)
          let sorted = sortItems(items, effectiveSort);

          // Apply limit after sorting (fetch may have retrieved more items for accurate sorting)
          if (limit && limit > 0 && sorted.length > limit) {
            sorted = sorted.slice(0, limit);
          }

          // Build table with options
          const table = buildTable(sorted, columns, { bodyTruncate, dateFormat, summaryHeader, summaryTruncate, subIssuesIn, templates, labelColumns, parseMyst, widths });

          // Replace placeholder with table
          Object.keys(placeholder).forEach(k => { if (k !== "type") delete placeholder[k]; });
          placeholder.type = table.type;
          placeholder.children = table.children;
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
