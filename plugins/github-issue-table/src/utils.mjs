// Utility Functions for GitHub Issue Table Plugin

/**
 * Remove [...] and (...) content from the beginning of titles
 * @param {string} title - Title to clean
 * @returns {string} Cleaned title
 */
export function stripBrackets(title) {
  if (!title) return "";
  return title.replace(/^(\[.*?\]|\(.*?\))\s*/g, "").trim();
}

/**
 * Strip header lines (lines starting with #) from text
 * @param {string} text - Text to clean
 * @returns {string} Text with header lines removed
 */
export function stripHeaders(text) {
  if (!text) return "";
  return text
    .split("\n")
    .filter(line => !line.trim().startsWith("#"))
    .join("\n")
    .trim();
}

/**
 * Format date as relative or absolute
 * @param {string} dateString - ISO date string
 * @param {string} format - "relative" or "absolute"
 * @returns {string} Formatted date
 */
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

  // Default to ISO date format (YYYY-MM-DD)
  return date.toISOString().split("T")[0];
}

/**
 * Truncate text to maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength) {
  return truncateTextWithFlag(text, maxLength).text;
}

/**
 * Truncate text and return metadata about whether truncation occurred
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {Object} Object with truncated text and flag
 */
export function truncateTextWithFlag(text, maxLength) {
  if (!text || !maxLength || text.length <= maxLength) {
    return { text, truncated: false };
  }

  // Prefer breaking at a whitespace boundary so words are not split
  const slice = text.substring(0, maxLength);
  const lastSpace = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("\n"), slice.lastIndexOf("\t"));
  const cutoff = lastSpace > 0 ? lastSpace : maxLength;
  const trimmed = text.substring(0, cutoff).trimEnd();

  return { text: `${trimmed}...`, truncated: true };
}

/**
 * Parse template definitions from semicolon-separated string
 * @param {string} templateString - Template definitions
 * @returns {Object} Map of template name to template string
 */
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

/**
 * Fill template with item data
 * Returns empty string if all template fields are empty/missing
 * @param {string} template - Template string with {{field}} placeholders
 * @param {Object} item - Data object
 * @returns {string} Filled template or empty string if all fields are empty
 */
export function fillTemplate(template, item) {
  if (!template) return "";

  let hasAnyValue = false;
  const filled = template.replace(/{{\s*([^}]+)\s*}}/g, (_match, fieldName) => {
    const field = fieldName.trim();
    const value = item[field];
    const stringValue = String(value ?? "");

    // Track if any field has a non-empty value
    if (stringValue !== "" && stringValue !== "undefined" && stringValue !== "null") {
      hasAnyValue = true;
    }

    return stringValue;
  });

  // Return empty string if all fields were empty
  return hasAnyValue ? filled : "";
}

/**
 * Convert filled template to AST nodes
 * @param {string} filled - Filled template string
 * @param {Function} parseMyst - MyST parser function
 * @returns {Array} Array of AST nodes
 */
export function templateToNodes(filled, parseMyst) {
  if (!filled) return [{ type: "text", value: "" }];

  // Use MyST parser for template rendering
  if (typeof parseMyst === "function") {
    try {
      const parsed = parseMyst(filled);
      const children = Array.isArray(parsed?.children) ? parsed.children : [];

      // If we got a single paragraph, unwrap it to inline content
      if (children.length === 1 && children[0]?.type === "paragraph" && Array.isArray(children[0].children)) {
        return children[0].children;
      }

      return children.length > 0 ? children : [{ type: "text", value: filled }];
    } catch (err) {
      console.error("Failed to parse template with MyST parser:", err?.message || err);
      return [{ type: "text", value: filled }];
    }
  }

  return [{ type: "text", value: filled }];
}

/**
 * Create link node for GitHub handle
 * @param {string} handle - GitHub handle (with or without @)
 * @returns {Object|null} Link node or null if invalid
 */
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
 * Extract summary from issue body
 * @param {string} body - Issue body text
 * @param {string} summaryHeader - Comma-separated keywords to search for (default: "summary,context,overview,description,background,user story")
 * @returns {string} Extracted summary text
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
