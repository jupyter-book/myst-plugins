// Column Definitions for GitHub Issue Table Plugin

import { stripBrackets, stripHeaders, formatDate, truncateTextWithFlag, linkifyHandle, fillTemplate, templateToNodes, extractSummary } from "./utils.mjs";

// Parse text through MyST (when available) and return inline children
function renderInlineContent(text, parseMyst) {
  if (!text) {
    return [{ type: "text", value: "" }];
  }

  try {
    const parsed = parseMyst(text);
    const children = Array.isArray(parsed?.children) ? parsed.children : [];
    if (children.length === 1 && children[0]?.type === "paragraph" && Array.isArray(children[0].children)) {
      return children[0].children;
    }
    return children.length > 0 ? children : [{ type: "text", value: text }];
  } catch (err) {
    console.error("Failed to parse content with MyST parser:", err?.message || err);
    return [{ type: "text", value: text }];
  }
}

// Wrap inline nodes in a paragraph
function renderParagraphFromInline(inlineNodes) {
  return { type: "paragraph", children: inlineNodes };
}

// Shared renderer for long-form fields (body, description, summary) with truncation + link out
function renderLongFormText(text, { parseMyst, truncateLength, stripHeaderLines = false, issueUrl = "" }) {
  const cleanedText = stripHeaderLines ? stripHeaders(text || "") : (text || "");
  const { text: truncatedText, truncated } = truncateTextWithFlag(cleanedText, truncateLength);

  const inlineNodes = renderInlineContent(truncatedText, parseMyst);
  if (truncated && issueUrl) {
    inlineNodes.push({ type: "text", value: " " });
    inlineNodes.push({
      type: "link",
      url: issueUrl,
      children: [{ type: "text", value: "Read more" }]
    });
  }

  return renderParagraphFromInline(inlineNodes);
}

function renderPRList(prs) {
  if (!prs || prs.length === 0) {
    return { type: "text", value: "" };
  }

  const prNodes = [];
  prs.forEach((pr, idx) => {
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
      prNodes.push({ type: "text", value: " · " });
    }
    // Wrap icon and link in a span to prevent line breaking between them
    prNodes.push({
      type: "span",
      children: [
        { type: "text", value: `${icon}\u00A0` },
        {
          type: "link",
          url: String(pr.url),
          children: [{ type: "text", value: `#${pr.number}` }]
        }
      ]
    });
  });

  if (prNodes.length === 0) {
    return { type: "text", value: "" };
  }

  return {
    type: "paragraph",
    children: prNodes
  };
}

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

  "title-sub_issues": (item, options) => {
    const trackedIssues = item.trackedIssues || [];

    // Start with the title link
    const children = [
      {
        type: "link",
        url: item.url,
        children: [{ type: "text", value: stripBrackets(item.title) }]
      }
    ];

    // Add sub-issues dropdown if any exist
    if (trackedIssues.length > 0) {
      // Sort by last updated (most recent first)
      const sorted = [...trackedIssues].sort((a, b) => {
        const aTime = a.updated ? new Date(a.updated).getTime() : 0;
        const bTime = b.updated ? new Date(b.updated).getTime() : 0;
        return bTime - aTime;
      });

      const subIssueNodes = [];
      sorted.forEach((sub, idx) => {
        if (idx > 0) {
          subIssueNodes.push({ type: "break" });
        }

        const icon = sub.state === "OPEN" ? "🟢" : "🟣";
        subIssueNodes.push({ type: "text", value: `${icon} ` });
        subIssueNodes.push({
          type: "link",
          url: sub.url,
          children: [{ type: "text", value: sub.title || `#${sub.number}` }]
        });
        subIssueNodes.push({
          type: "text",
          value: ` • ${formatDate(sub.updated, options.dateFormat || "relative")}`
        });
      });

      children.push({ type: "text", value: " " });
      children.push({
        type: "details",
        children: [
          {
            type: "summary",
            children: [{
              type: "text",
              value: `${trackedIssues.length} sub-issue${trackedIssues.length === 1 ? '' : 's'}`
            }]
          },
          {
            type: "paragraph",
            children: subIssueNodes
          }
        ]
      });
    }

    return {
      type: "paragraph",
      children
    };
  },

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

  closed: (item, options) => ({
    type: "text",
    value: formatDate(item.closed, options.dateFormat || "absolute")
  }),

  reactions: (item, options) => {
    // Show all reaction types with counts
    const reactionNodes = [];

    const reactions = [
      { emoji: "👍", count: item.reactions_thumbsup },
      { emoji: "❤️", count: item.reactions_heart },
      { emoji: "🚀", count: item.reactions_rocket },
      { emoji: "🎉", count: item.reactions_hooray },
      { emoji: "😄", count: item.reactions_laugh },
      { emoji: "👀", count: item.reactions_eyes },
      { emoji: "😕", count: item.reactions_confused },
      { emoji: "👎", count: item.reactions_thumbsdown }
    ];

    reactions.forEach(({ emoji, count }) => {
      if (count > 0) {
        if (reactionNodes.length > 0) {
          reactionNodes.push({ type: "text", value: " · " });
        }
        // Wrap emoji and count in span to prevent line breaking
        reactionNodes.push({
          type: "span",
          children: [
            { type: "text", value: `${emoji}\u00A0${count}` }
          ]
        });
      }
    });

    if (reactionNodes.length === 0) {
      return { type: "text", value: " " };
    }

    return {
      type: "paragraph",
      children: reactionNodes
    };
  },

  reactions_thumbsup: (item, options) => ({
    type: "text",
    value: `👍 ${item.reactions_thumbsup}`
  }),

  reactions_thumbsdown: (item, options) => ({
    type: "text",
    value: `👎 ${item.reactions_thumbsdown}`
  }),

  reactions_laugh: (item, options) => ({
    type: "text",
    value: `😄 ${item.reactions_laugh}`
  }),

  reactions_hooray: (item, options) => ({
    type: "text",
    value: `🎉 ${item.reactions_hooray}`
  }),

  reactions_confused: (item, options) => ({
    type: "text",
    value: `😕 ${item.reactions_confused}`
  }),

  reactions_heart: (item, options) => ({
    type: "text",
    value: `❤️ ${item.reactions_heart}`
  }),

  reactions_rocket: (item, options) => ({
    type: "text",
    value: `🚀 ${item.reactions_rocket}`
  }),

  reactions_eyes: (item, options) => ({
    type: "text",
    value: `👀 ${item.reactions_eyes}`
  }),

  comments: (item, options) => ({
    type: "text",
    value: String(item.comments)
  }),

  labels: (item, options) => {
    if (!item.labels || item.labels.length === 0) {
      return { type: "text", value: "" };
    }

    const labelNodes = [];

    item.labels
      .filter(label => label && label.name)
      .forEach((label, idx) => {
        if (idx > 0) {
          // Add line break between labels
          labelNodes.push({ type: "break" });
        }

        // Create span with styling for labels
        // Using inline styles only (no Tailwind classes needed)
        labelNodes.push({
          type: "span",
          style: {
            display: "inline-block",
            fontSize: "0.875rem",
            whiteSpace: "nowrap",
            padding: "0.125rem 0.5rem",
            margin: "0.125rem 0",
            borderRadius: "0.25rem",
            backgroundColor: "#dbeafe",
            color: "#000000ff"
          },
          children: [
            { type: "text", value: label.name }
          ]
        });
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
    return renderPRList(item.linkedPRs);
  },

  closing_prs: (item, options) => {
    const closing = item?.closingPRs ?? (item.linkedPRs || []).filter(pr => pr?.willClose);
    return renderPRList(closing);
  },

  body: (item, options) =>
    renderLongFormText(item.body, {
      parseMyst: options.parseMyst,
      truncateLength: options.bodyTruncate,
      stripHeaderLines: true,
      issueUrl: item.url
    }),

  description: (item, options) =>
    renderLongFormText(item.description ?? item.Description, {
      parseMyst: options.parseMyst,
      truncateLength: options.bodyTruncate,
      issueUrl: item.url
    }),
  
  summary: (item, options) => {
    const summaryLimit = options.summaryTruncate ?? options.bodyTruncate;
    // Extract summary using header keywords or fallback logic
    const summaryText = extractSummary(
      item.body || "",
      options.summaryHeader || "summary,context,overview,description,background,user story",
      summaryLimit
    );

    if (!summaryText) {
      return { type: "text", value: "" };
    }

    return renderLongFormText(summaryText, {
      parseMyst: options.parseMyst,
      truncateLength: summaryLimit,
      issueUrl: item.url
    });
  }

  sub_issues: (item, options) => {
    const trackedIssues = item.trackedIssues || [];

    if (trackedIssues.length === 0) {
      return { type: "text", value: "" };
    }

    // Sort by last updated (most recent first)
    const sorted = [...trackedIssues].sort((a, b) => {
      const aTime = a.updated ? new Date(a.updated).getTime() : 0;
      const bTime = b.updated ? new Date(b.updated).getTime() : 0;
      return bTime - aTime;
    });

    const contentNodes = [];
    sorted.forEach((sub, idx) => {
      if (idx > 0) {
        contentNodes.push({ type: "break" });
      }

      const icon = sub.state === "OPEN" ? "🟢" : "🟣";

      contentNodes.push({ type: "text", value: `${icon} ` });
      contentNodes.push({
        type: "link",
        url: sub.url,
        children: [{ type: "text", value: sub.title || `#${sub.number}` }]
      });
      contentNodes.push({
        type: "text",
        value: ` • ${formatDate(sub.updated, options.dateFormat || "relative")}`
      });
    });

    return {
      type: "details",
      children: [
        {
          type: "summary",
          children: [{
            type: "text",
            value: `${trackedIssues.length} sub-issue${trackedIssues.length === 1 ? '' : 's'}`
          }]
        },
        {
          type: "paragraph",
          children: contentNodes
        }
      ]
    };
  },
};

/**
 * Render a table cell for given column
 * @param {Object} item - Issue/PR data
 * @param {string} column - Column name
 * @param {Object} options - Rendering options
 * @returns {Object} AST node for cell content
 */
export function renderCell(item, column, options = {}) {
  const normalizedColumn = typeof column === "string" ? column.toLowerCase() : column;

  // Try column definition first
  const columnDef = COLUMN_DEFINITIONS[column] || COLUMN_DEFINITIONS[normalizedColumn];
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
