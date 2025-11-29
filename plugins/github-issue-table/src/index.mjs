// GitHub Issue Table Plugin
// Renders GitHub issues/PRs as tables from search queries

import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { fetchIssues } from "./github-api.mjs";

const CACHE_DIR = "_build/temp/github-issues";
const CACHE_TTL = 24*3600000; // 24 hours in milliseconds

let sharedParseMyst = null; // captured from directive ctx; reused in transform

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
  // Write to temp file first, then atomically rename to prevent corruption
  const tempPath = join(tmpdir(), `github-cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
  writeFileSync(tempPath, JSON.stringify({
    timestamp: Date.now(),
    query,
    items
  }));
  renameSync(tempPath, cachePath);
}

// GitHub API functions now imported from github-api.mjs

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

function formatDate(dateString, format = "absolute") {
  if (!dateString) return "";
  const date = new Date(dateString);

  if (format === "relative") {
    const now = Date.now();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years}y ago`;
    if (months > 0) return `${months}mo ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  }

  // Default to ISO date format (YYYY-MM-DD)
  return date.toISOString().split("T")[0];
}

function truncateText(text, maxLength) {
  if (!text || !maxLength || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

function parseTemplates(templateString) {
  if (!templateString) return {};
  const templates = {};
  templateString.split(";").forEach(entry => {
    const [name, ...rest] = entry.split("=");
    if (!name || rest.length === 0) return;
    const key = name.trim();
    const value = rest.join("=").trim();
    if (key && value) {
      templates[key] = value;
    }
  });
  return templates;
}

function fillTemplate(template, item) {
  if (!template) return "";
  const replaceField = (field) => {
    if (!field) return "";
    const direct = item[field];
    if (direct !== undefined && direct !== null) return direct;
    if (item.projectFields && item.projectFields[field] !== undefined && item.projectFields[field] !== null) {
      return item.projectFields[field];
    }
    return "";
  };
  return template.replace(/{{\s*([^}]+)\s*}}/g, (_match, fieldName) => {
    return String(replaceField(fieldName.trim()) ?? "");
  });
}

function templateToNodes(filled, parseMyst) {
  if (!filled) return [{ type: "text", value: "" }];

  // Prefer full MyST parsing so roles (e.g., {button}) render as normal
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
      // Fall through to lightweight parsing
    }
  }

  // Fallback: basic markdown links and role-like tokens
  const nodes = [];
  const tokenRegex = /(\{[a-zA-Z0-9_-]+\}`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;
  while ((match = tokenRegex.exec(filled)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: filled.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith("{")) {
      const roleMatch = /\{([^}]+)\}`(.+?)`/.exec(token);
      if (roleMatch) {
        const body = roleMatch[2].trim();
        const angleMatch = /(.*)<(.+?)>/.exec(body);
        const label = (angleMatch ? angleMatch[1] : body).trim();
        const url = angleMatch ? angleMatch[2].trim() : null;
        if (url) {
          nodes.push({
            type: "link",
            url,
            children: [{ type: "text", value: label }]
          });
        } else {
          nodes.push({ type: "text", value: label });
        }
      } else {
        nodes.push({ type: "text", value: token });
      }
    } else {
      // Standard markdown link
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (linkMatch) {
        nodes.push({
          type: "link",
          url: linkMatch[2],
          children: [{ type: "text", value: linkMatch[1] }]
        });
      } else {
        nodes.push({ type: "text", value: token });
      }
    }
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < filled.length) {
    nodes.push({ type: "text", value: filled.slice(lastIndex) });
  }
  return nodes.length > 0 ? nodes : [{ type: "text", value: filled }];
}

function renderCell(item, column, options = {}) {
  const { bodyTruncate, dateFormat = "absolute", templates = {}, parseMyst } = options;

  const linkifyHandle = (handle) => {
    if (!handle) return null;
    const cleaned = handle.startsWith("@") ? handle.slice(1) : handle;
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(cleaned)) {
      return null;
    }
    return {
      type: "link",
      url: `https://github.com/${cleaned}`,
      children: [{ type: "text", value: handle }],
    };
  };

  switch (column) {
    case "number":
      return {
        type: "link",
        url: item.url,
        children: [{ type: "text", value: `#${item.number}` }],
      };

    case "title":
      return {
        type: "link",
        url: item.url,
        children: [{ type: "text", value: stripBrackets(item.title) }],
      };

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
      return linkifyHandle(item.author) || { type: "text", value: item.author };

    case "linked_author":
      if (!item.author) {
        return { type: "text", value: "" };
      }
      return {
        type: "link",
        url: `https://github.com/${item.author}`,
        children: [{ type: "text", value: item.author }]
      };

    case "author_affiliation":
      if (!item.author_affiliation) {
        return { type: "text", value: "" };
      }
      return (
        linkifyHandle(item.author_affiliation) || {
          type: "text",
          value: item.author_affiliation,
        }
      );

    case "linked_prs":
      if (!item.linkedPRs || item.linkedPRs.length === 0) {
        return { type: "text", value: "" };
      }
      const prNodes = [];
      item.linkedPRs.forEach((pr, idx) => {
        // Validate PR data
        if (!pr || !pr.url || !pr.number) {
          return; // Skip invalid PRs
        }

        // Determine icon: ❌ closed without merge, 🟢 open, 🟣 merged
        let icon;
        if (pr.merged) {
          icon = "🟣";
        } else if (pr.state === "OPEN") {
          icon = "🟢";
        } else {
          icon = "❌";
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

      // If no valid PRs, return empty text
      if (prNodes.length === 0) {
        return { type: "text", value: "" };
      }

      return {
        type: "paragraph",
        children: prNodes
      };

    case "created":
      return { type: "text", value: formatDate(item.created, dateFormat) };

    case "updated":
      return { type: "text", value: formatDate(item.updated, dateFormat) };

    case "reactions":
      return { type: "text", value: `👍 ${item.reactions}` };

    case "comments":
      return { type: "text", value: String(item.comments) };

    case "labels":
      if (!item.labels || item.labels.length === 0) {
        return { type: "text", value: "" };
      }
      // Create label text nodes (simplified - no HTML styling in tables)
      const labelTexts = item.labels
        .filter(label => label && label.name)
        .map(label => label.name)
        .join(", ");

      return { type: "text", value: labelTexts };

    case "repo":
      if (!item.repo) {
        return { type: "text", value: "" };
      }
      return {
        type: "link",
        url: `https://github.com/${item.repo}`,
        children: [{ type: "text", value: item.repo }],
      };

    case "linked_repo":
      if (!item.repo) {
        return { type: "text", value: "" };
      }
      return {
        type: "link",
        url: `https://github.com/${item.repo}`,
        children: [{ type: "text", value: item.repo }]
      };

    case "body":
      const bodyText = truncateText(item.body || "", bodyTruncate);
      return { type: "text", value: bodyText };

    case "linked_body":
      const linkedBodyText = truncateText(item.body || "", bodyTruncate);
      return {
        type: "link",
        url: item.url,
        children: [{ type: "text", value: linkedBodyText }]
      };

    default:
      // Check if it's a project field
      if (item.projectFields && item.projectFields[column]) {
        return { type: "text", value: String(item.projectFields[column]) };
      }
      // Custom template column
      if (templates && templates[column]) {
        const filled = fillTemplate(templates[column], item);
        const nodes = templateToNodes(filled, parseMyst);
        return nodes.length === 1 ? nodes[0] : { type: "paragraph", children: nodes };
      }
      return { type: "text", value: "" };
  }
}

function validateNode(node) {
  // Ensure node has required properties
  if (!node || typeof node !== 'object') {
    return { type: "text", value: "" };
  }

  // If node has children, ensure it's an array
  if ('children' in node && !Array.isArray(node.children)) {
    // Normalize any non-array children into an array of text nodes to avoid runtime errors
    node.children = [{ type: "text", value: String(node.children ?? node.value ?? "") }];
  }

  // Recursively validate children
  if (Array.isArray(node.children)) {
    node.children = node.children.map(child => validateNode(child));
  }

  return node;
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

      // Validate all children nodes
      children = children.map(child => validateNode(child));

      return {
        type: "tableCell",
        children
      };
    })
  }));

  const table = {
    type: "table",
    children: [headerRow, ...dataRows]
  };

  // Final validation of the entire table structure
  return validateNode(table);
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

    // Get options
    const columns = (data.options?.columns || "title,author,state,reactions")
      .split(",")
      .map(c => c.trim());
    const sort = data.options?.sort;
    const limit = data.options?.limit;
    const bodyTruncate = data.options?.["body-truncate"];
    const dateFormat = data.options?.["date-format"];
    const templates = data.options?.templates;
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
        });
        return;
      }

      // Process each placeholder
      await Promise.all(
        placeholders.map(async (placeholder) => {
          const { query, columns, sort, limit, bodyTruncate, dateFormat, templates: templateString } = placeholder;
          const parseMyst = sharedParseMyst;
          const templates = parseTemplates(templateString);

          // Check cache
          let items = readCache(query);

          // If no cache, fetch data
          if (!items) {
            console.log(`Fetching GitHub data for query: ${query}`);
            items = await fetchIssues(query, token);
            writeCache(query, items);
          } else {
            console.log(`Using cached data for query: ${query}`);
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
            return;
          }

          // Sort and limit items
          let sorted = sortItems(items, sort);
          if (limit && limit > 0) {
            sorted = sorted.slice(0, limit);
          }

          // Build table with options
          const table = buildTable(sorted, columns, { bodyTruncate, dateFormat, templates, parseMyst });

          // Replace placeholder with table
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

// ============================================================================
// Plugin Export
// ============================================================================

const plugin = {
  name: "GitHub Issue Table",
  directives: [directive],
  transforms: [githubIssueTableTransform]
};

export default plugin;
