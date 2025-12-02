// Column Definitions for GitHub Issue Table Plugin

import { stripBrackets, stripHeaders, formatDate, truncateText, linkifyHandle, fillTemplate, templateToNodes } from "./utils.mjs";

/**
 * Column definition registry mapping column names to render functions
 * Each function receives (item, options) and returns an AST node
 */
export const COLUMN_DEFINITIONS = {
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
    const icon = item.state === "OPEN" ? "🟢" : "🟣";
    return { type: "text", value: `${icon} ${item.state}` };
  },

  author: (item, options) =>
    linkifyHandle(item.author) || { type: "text", value: item.author || "" },

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
    value: `👍 ${item.reactions}`
  }),

  comments: (item, options) => ({
    type: "text",
    value: String(item.comments)
  }),

  labels: (item, options) => {
    if (!item.labels || item.labels.length === 0) {
      return { type: "text", value: "" };
    }

    const { parseMyst } = options;
    const labelNodes = [];

    item.labels
      .filter(label => label && label.name)
      .forEach((label, idx) => {
        if (idx > 0) {
          labelNodes.push({ type: "text", value: " " });
        }

        // Use parseMyst to parse guilabel syntax
        if (typeof parseMyst === "function") {
          try {
            const mystSyntax = `{kbd}\`${label.name}\``;
            const parsed = parseMyst(mystSyntax);
            const children = Array.isArray(parsed?.children) ? parsed.children : [];

            // Extract inline content from parsed result
            if (children.length === 1 && children[0]?.type === "paragraph" && Array.isArray(children[0].children)) {
              labelNodes.push(...children[0].children);
            } else if (children.length > 0) {
              labelNodes.push(...children);
            } else {
              labelNodes.push({ type: "text", value: label.name });
            }
          } catch (err) {
            console.error("Failed to parse label with MyST:", err?.message || err);
            labelNodes.push({ type: "text", value: label.name });
          }
        } else {
          // Fallback if parseMyst not available
          labelNodes.push({ type: "text", value: label.name });
        }
      });

    if (labelNodes.length === 0) {
      return { type: "text", value: "" };
    }

    return {
      type: "paragraph",
      children: labelNodes
    };
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

    if (prNodes.length === 0) {
      return { type: "text", value: "" };
    }

    return {
      type: "paragraph",
      children: prNodes
    };
  },

  body: (item, options) => {
    // Strip headers first
    let bodyText = stripHeaders(item.body || "");

    // Then truncate if specified
    bodyText = truncateText(bodyText, options.bodyTruncate);

    // Parse with MyST if parseMyst is available
    const { parseMyst } = options;
    if (typeof parseMyst === "function" && bodyText) {
      try {
        const parsed = parseMyst(bodyText);
        const children = Array.isArray(parsed?.children) ? parsed.children : [];

        // Return the parsed content
        if (children.length === 1 && children[0]?.type === "paragraph" && Array.isArray(children[0].children)) {
          // Unwrap single paragraph to inline content
          return { type: "paragraph", children: children[0].children };
        }

        return children.length > 0
          ? { type: "paragraph", children }
          : { type: "text", value: bodyText };
      } catch (err) {
        console.error("Failed to parse body with MyST parser:", err?.message || err);
        return { type: "text", value: bodyText };
      }
    }

    // Fallback to plain text if no parseMyst
    return { type: "text", value: bodyText };
  }
};

/**
 * Render a table cell for given column
 * @param {Object} item - Issue/PR data
 * @param {string} column - Column name
 * @param {Object} options - Rendering options
 * @returns {Object} AST node for cell content
 */
export function renderCell(item, column, options = {}) {
  // Try column definition first
  const columnDef = COLUMN_DEFINITIONS[column];
  if (columnDef) {
    return columnDef(item, options);
  }

  // Check if column exists on item (includes project fields)
  if (item[column] !== undefined) {
    return { type: "text", value: String(item[column]) };
  }

  // Check custom templates
  const { templates = {}, parseMyst } = options;
  if (templates[column]) {
    const filled = fillTemplate(templates[column], item);
    const nodes = templateToNodes(filled, parseMyst);
    return nodes.length === 1 ? nodes[0] : { type: "paragraph", children: nodes };
  }

  return { type: "text", value: "" };
}
