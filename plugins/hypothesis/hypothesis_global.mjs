
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

// Lees de frontmatter van een Markdown-bestand
function getFrontmatter(srcPath) {
  try {
    const text = readFileSync(srcPath, "utf-8");
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);

    if (!match) return null;

    const data = {};

    match[1].split("\n").forEach(line => {
      const [key, ...valueParts] = line.split(":");

      if (key && valueParts.length > 0) {
        const value = valueParts.join(":").trim();

        if (value.toLowerCase() === "false") {
          data[key.trim()] = false;
        } else if (value.toLowerCase() === "true") {
          data[key.trim()] = true;
        } else {
          data[key.trim()] = value;
        }
      }
    });

    return data;
  } catch {
    return null;
  }
}

const hypothesisTransform = {
  name: "hypothesis-global",
  stage: "document",

  plugin: () => (mdast, file) => {
    if (!mdast?.children) return mdast;

    // Geen Hypothesis bij PDF/Typst-export
    const isPDF = process.argv.some(arg =>
      arg.includes("pdf") || arg.includes("typst")
    );

    if (isPDF) return mdast;

    // Controleer de frontmatter
    if (file?.path) {
      const frontmatter = getFrontmatter(file.path);

      console.log("HYPOTHESIS DEBUG:", {
        path: file.path,
        frontmatter,
        disabled: frontmatter?.["no-hypothesis"] === true
      });

      if (frontmatter?.["no-hypothesis"] === true) {
        console.log("Hypothesis UIT voor:", file.path);
        return mdast;
      }
    }

    // Controleer of Hypothesis al aanwezig is
    const hasHypothesis = (node) => {
      if (
        node.type === "anywidget" &&
        node.esm?.includes("hypothesis.mjs")
      ) {
        return true;
      }

      return node.children?.some(hasHypothesis) ?? false;
    };

    if (hasHypothesis(mdast)) return mdast;

    // Voeg Hypothesis automatisch toe
    mdast.children.push({
      type: "anywidget",
      esm: "./plugins/hypothesis.mjs",
      model: {},
      id: randomUUID()
    });

    return mdast;
  }
};

export default {
  name: "hypothesis-global",
  transforms: [hypothesisTransform]
};
