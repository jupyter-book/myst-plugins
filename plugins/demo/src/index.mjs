// MyST Demo Directive Plugin
// Shows raw MyST content alongside its rendered output

const mystDemoDirective = {
  name: "myst-demo",
  doc: "Display raw MyST content and its rendered output in a grouped container",
  body: {
    type: String,
    required: true,
  },
  run(data, _vfile, ctx) {
    const rawContent = data.body?.trim() || "";

    if (!rawContent) {
      return [];
    }

    // Parse the MyST content to get the rendered output
    const parsed = ctx.parseMyst(rawContent);

    // Create section headings
    const sourceHeading = {
      type: "paragraph",
      children: [
        { type: "strong", children: [{ type: "text", value: "MyST Source:" }] },
      ],
    };

    const outputHeading = {
      type: "paragraph",
      children: [
        { type: "strong", children: [{ type: "text", value: "Rendered Output:" }] },
      ],
    };

    // Create a code block - MyST should auto-handle fence length
    const codeBlock = {
      type: "code",
      lang: "markdown",
      value: rawContent,
    };

    // Return all elements with a visual separator
    return [
      sourceHeading,
      codeBlock,
      outputHeading,
      ...parsed.children,
    ];
  },
};

const plugin = {
  name: "MyST Demo Directive",
  directives: [mystDemoDirective],
};

export default plugin;
