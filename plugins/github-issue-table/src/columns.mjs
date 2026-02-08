import { stripBrackets, stripHeaders, formatDate, truncateTree, linkifyHandle, fillTemplate, templateToNodes, extractSummary, matchesLabelPattern } from "./utils.mjs";

function renderLongFormText(text, { parseMyst, truncateLength, stripHeaderLines = false, issueUrl = "" }) {
  const content = stripHeaderLines ? stripHeaders(text || "") : (text || "");
  if (!content) return { type: "text", value: "" };

  if (typeof parseMyst !== "function") {
    return { type: "text", value: content };
  }

  let parsed;
  try {
    parsed = parseMyst(content);
  } catch {
    return { type: "text", value: content };
  }

  let children = parsed?.children || [];
  let truncated = false;

  if (truncateLength && truncateLength > 0) {
    const result = truncateTree(children, truncateLength);
    truncated = result.remaining <= 0;
    children = result.nodes;
  }

  // Append "More" link as an AST node if truncated
  if (truncated && issueUrl) {
    const moreLink = { type: "link", url: issueUrl, children: [{ type: "text", value: "More" }] };
    // Find the last paragraph-like node and append inline, or add a new paragraph
    const last = children[children.length - 1];
    if (last?.children && (last.type === "paragraph" || last.type === "text")) {
      last.children.push({ type: "text", value: " " }, moreLink);
    } else {
      children.push({ type: "paragraph", children: [moreLink] });
    }
  }

  return children.length > 0
    ? { type: "div", children }
    : { type: "text", value: content };
}

function renderLabelList(labels) {
  const valid = (labels || []).filter(l => l && l.name);
  if (valid.length === 0) return { type: "text", value: "" };

  const nodes = [];
  valid.forEach((label, idx) => {
    if (idx > 0) nodes.push({ type: "break" });
    nodes.push({
      type: "span",
      style: {
        display: "inline-block",
        fontSize: "0.875rem",
        fontFamily: "monospace",
        whiteSpace: "nowrap",
        padding: "0.125rem 0.5rem",
        margin: "0.125rem 0",
        borderRadius: "0.25rem",
        backgroundColor: "#dbeafe",
        color: "#000000ff"
      },
      children: [{ type: "text", value: label.name }]
    });
  });
  return { type: "paragraph", children: nodes };
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

function renderSubIssuesBlock(item, options) {
  const subIssues = item.subIssues || [];

  if (subIssues.length === 0) {
    return null;
  }

  // Sort by last updated (most recent first)
  const sorted = [...subIssues].sort((a, b) => {
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

  return {
    type: "details",
    children: [
      {
        type: "summary",
        children: [{
          type: "text",
          value: `${subIssues.length} sub-issue${subIssues.length === 1 ? '' : 's'}`
        }]
      },
      {
        type: "paragraph",
        children: subIssueNodes
      }
    ]
  };
}

function renderTitleLink(item) {
  return {
    type: "link",
    url: item.url,
    children: [{ type: "text", value: stripBrackets(item.title) }]
  };
}

// Column definition registry. Each function receives (item, options) and returns an AST node.
export const COLUMN_DEFINITIONS = {
  number: (item) => ({
    type: "link",
    url: item.url,
    children: [{ type: "text", value: `#${item.number}` }]
  }),

  title: (item) => renderTitleLink(item),

  state: (item) => {
    const icon = item.state === "OPEN" ? "🟢" : "🟣";
    return { type: "text", value: `${icon} ${item.state}` };
  },

  author: (item) =>
    linkifyHandle(item.author) || { type: "text", value: item.author || "" },

  author_affiliation: (item) => {
    if (!item.author_affiliation) return { type: "text", value: "" };
    return linkifyHandle(item.author_affiliation) || { type: "text", value: item.author_affiliation };
  },

  repo: (item) => {
    if (!item.repo) return { type: "text", value: "" };
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

  reactions: (item) => {
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
        if (reactionNodes.length > 0) reactionNodes.push({ type: "text", value: " · " });
        reactionNodes.push({
          type: "span",
          children: [{ type: "text", value: `${emoji}\u00A0${count}` }]
        });
      }
    });
    return reactionNodes.length > 0
      ? { type: "paragraph", children: reactionNodes }
      : { type: "text", value: " " };
  },

  reactions_thumbsup: (item) => ({ type: "text", value: `👍 ${item.reactions_thumbsup}` }),
  reactions_thumbsdown: (item) => ({ type: "text", value: `👎 ${item.reactions_thumbsdown}` }),
  reactions_laugh: (item) => ({ type: "text", value: `😄 ${item.reactions_laugh}` }),
  reactions_hooray: (item) => ({ type: "text", value: `🎉 ${item.reactions_hooray}` }),
  reactions_confused: (item) => ({ type: "text", value: `😕 ${item.reactions_confused}` }),
  reactions_heart: (item) => ({ type: "text", value: `❤️ ${item.reactions_heart}` }),
  reactions_rocket: (item) => ({ type: "text", value: `🚀 ${item.reactions_rocket}` }),
  reactions_eyes: (item) => ({ type: "text", value: `👀 ${item.reactions_eyes}` }),

  comments: (item) => ({ type: "text", value: String(item.comments) }),

  labels: (item) => renderLabelList(item.labels),
  linked_prs: (item) => renderPRList(item.linkedPRs),
  closing_prs: (item) => renderPRList(item.closingPRs),

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
    const summaryText = extractSummary(
      item.body || "",
      options.summaryHeader || "summary,context,overview,description,background,user story"
    );
    if (!summaryText) return { type: "text", value: "" };
    return renderLongFormText(summaryText, {
      parseMyst: options.parseMyst,
      truncateLength: options.summaryTruncate ?? options.bodyTruncate,
      issueUrl: item.url
    });
  },

  sub_issues: (item, options) =>
    renderSubIssuesBlock(item, options) || { type: "text", value: "" },
};

export { renderSubIssuesBlock };

/** Render a table cell, checking label-columns, built-in columns, item fields, then templates. */
export function renderCell(item, column, options = {}) {
  const normalizedColumn = typeof column === "string" ? column.toLowerCase() : column;

  // Check label-column definitions (before built-ins so "labels=..." can override)
  const { labelColumns = {} } = options;
  if (labelColumns[column]) {
    const filtered = (item.labels || []).filter(l => l?.name && matchesLabelPattern(l.name, labelColumns[column]));
    return renderLabelList(filtered);
  }

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
