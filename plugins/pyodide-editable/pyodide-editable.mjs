const PLUGIN_PATH = new URL(import.meta.url).pathname;
const WIDGET_PATH = PLUGIN_PATH.replace(/\/[^/]*$/, "/widget.mjs");

function relativePath(fromDir, toFile) {
  const from = fromDir.split("/").filter(Boolean);
  const to = toFile.split("/").filter(Boolean);
  let i = 0;
  while (i < from.length && i < to.length && from[i] === to[i]) i++;
  return [...Array(from.length - i).fill(".."), ...to.slice(i)].join("/") || ".";
}

const pyodideDirective = {
  name: "pyodide-cell",
  alias: ["pyodide", "myst:pyodide", "myst:pyodide-cell", "python-cell"],
  doc: "Render an editable Pyodide-backed Python code cell.",
  body: { type: String, required: true },
  options: {
    id: { type: String, doc: "Optional id for the cell." },
    packages: { type: String, doc: "Comma-separated Pyodide packages." },
  },
  run(data, vfile) {
    const code = (data.body || "").trim();
    if (!code) return [];

    const fromDir = vfile.path.replace(/\/[^/]*$/, "");
    const esm = relativePath(fromDir, WIDGET_PATH);

    return [
      {
        type: "anywidget",
        esm,
        model: {
          code,
          id: data.options?.id?.trim() || "",
          packages: data.options?.packages?.trim() || "",
        },
        id: data.options?.id?.trim() || Math.random().toString(36).slice(2),
      },
    ];
  },
};

export default {
  name: "Pyodide Editable",
  directives: [pyodideDirective],
};
