// Filters available inside {{field | filter}} template expressions.
const TEMPLATE_FILTERS = {
  urlencode: (v) => encodeURIComponent(v),
};

/** Check if a label matches a comma-separated list of glob patterns (e.g. "type:*,bug"). */
export function matchesLabelPattern(label, patternString) {
  return patternString.split(",").some(p => {
    const pattern = p.trim();
    if (!pattern.includes("*")) return label === pattern;
    const regex = new RegExp("^" + pattern.replace(/[-[\]{}()+?.\\^$|]/g, "\\$&").replace(/\*/g, ".*") + "$");
    return regex.test(label);
  });
}

/** Remove [...] and (...) prefixes from titles. */
export function stripBrackets(title) {
  if (!title) return "";
  return title.replace(/^(\[.*?\]|\(.*?\))\s*/g, "").trim();
}

export function stripHeaders(text) {
  if (!text) return "";
  return text
    .split("\n")
    .filter(line => !line.trim().startsWith("#"))
    .join("\n")
    .trim();
}

/** Format date as "relative" (e.g. "2d ago") or "absolute" (YYYY-MM-DD). */
export function formatDate(dateString, format = "absolute") {
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

  return date.toISOString().split("T")[0];
}

/** Parse "name=value; name=value" definitions (used by :templates: and :label-columns:). */
export function parseTemplates(templateString) {
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

/** Substitute {{field}} and {{field | filter}} placeholders. Returns "" if all fields are empty. */
export function fillTemplate(template, item) {
  if (!template) return "";

  let hasAnyValue = false;
  const filled = template.replace(/{{\s*([^}]+)\s*}}/g, (_match, expr) => {
    const parts = expr.split("|").map(s => s.trim());
    const field = parts[0];
    const filterName = parts[1]; // undefined when no filter is specified
    const value = item[field];
    let stringValue = String(value ?? "");

    if (stringValue !== "" && stringValue !== "undefined" && stringValue !== "null") {
      hasAnyValue = true;
    }

    if (filterName && TEMPLATE_FILTERS[filterName]) {
      stringValue = TEMPLATE_FILTERS[filterName](stringValue);
    }

    return stringValue;
  });

  return hasAnyValue ? filled : "";
}

/** Convert a filled template string to AST nodes via parseMyst. */
export function templateToNodes(filled, parseMyst) {
  if (!filled) return [{ type: "text", value: "" }];
  if (typeof parseMyst !== "function") return [{ type: "text", value: filled }];

  try {
    const parsed = parseMyst(filled);
    const children = parsed?.children || [];

    // Unwrap a single paragraph to inline content
    if (children.length === 1 && children[0]?.type === "paragraph" && children[0].children) {
      return children[0].children;
    }

    return children.length > 0 ? children : [{ type: "text", value: filled }];
  } catch {
    return [{ type: "text", value: filled }];
  }
}

export function linkifyHandle(handle) {
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
}

/**
 * Extract summary from issue body by finding a header matching one of the
 * comma-separated keywords and returning content until the next header.
 * Falls back to everything before the first header or horizontal rule.
 */
export function extractSummary(body, summaryHeader = "summary,context,overview,description,background,user story") {
  if (!body) return "";

  const lines = body.split("\n");
  const keywords = summaryHeader.split(",").map(k => k.trim().toLowerCase());

  // Look for headers with matching keywords
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);

    if (headerMatch) {
      const headerText = headerMatch[2].toLowerCase();

      // Check if header contains any keyword
      if (keywords.some(keyword => headerText.includes(keyword))) {
        // Extract content from next line until next header (any level)
        const contentLines = [];
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();

          // Stop at any header
          if (nextLine.match(/^#{1,4}\s+/)) {
            break;
          }

          contentLines.push(lines[j]);
        }

        // Return extracted content, strip whitespace (no truncation for explicit sections)
        return contentLines.join("\n").trim();
      }
    }
  }

  // Fallback: extract from start until first header or horizontal rule
  const contentLines = [];
  for (const line of lines) {
    const trimmed = line.trim();

    // Stop at first header or horizontal rule
    if (trimmed.match(/^#{1,4}\s+/) || trimmed.match(/^---+$/)) {
      break;
    }

    contentLines.push(line);
  }

  return contentLines.join("\n").trim();
}

/**
 * Truncate an AST node array by character budget. Walks depth-first; once
 * exhausted, cuts at a word boundary. Structure nodes stay properly nested.
 */
export function truncateTree(nodes, remaining) {
  const result = [];
  for (const node of nodes) {
    if (remaining <= 0) break;

    if (node.type === "text") {
      if (node.value.length <= remaining) {
        result.push(node);
        remaining -= node.value.length;
      } else {
        const slice = node.value.substring(0, remaining);
        const lastSpace = slice.lastIndexOf(" ");
        const cutoff = lastSpace > 0 ? lastSpace : remaining;
        result.push({ type: "text", value: node.value.substring(0, cutoff).trimEnd() + "..." });
        remaining = 0;
      }
    } else if (node.children) {
      const inner = truncateTree(node.children, remaining);
      result.push({ ...node, children: inner.nodes });
      remaining = inner.remaining;
    } else {
      result.push(node);
    }
  }
  return { nodes: result, remaining };
}

/** Parse comma-separated widths, normalizing if sum > 100%. */
export function parseWidths(widthsStr) {
  const widths = widthsStr.split(",").map(w => parseFloat(w.trim()));
  const sum = widths.reduce((a, b) => a + b, 0);
  return sum > 100 ? widths.map(w => (w / sum) * 100) : widths;
}
