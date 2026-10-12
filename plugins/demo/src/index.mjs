// MyST Demo Directive Plugin
// Shows raw MyST content alongside its rendered output

function createDemoDirective(name) {
  return {
    name,
    arg: {
      type: String,
      required: false,
      doc: "Optional title for the demo card",
    },
    doc: "Display raw MyST content with rendered output inside a single card",
    body: {
      type: String,
      required: true,
    },
    run(data, _vfile, ctx) {
      const rawContent = data.body?.trim() || "";
      const title = data.arg?.trim() || "";

      if (!rawContent) {
        return [];
      }

      const parsed = ctx.parseMyst(rawContent) || { children: [] };

      const titleChildren = title
        ? [{ type: "heading", depth: 6, children: [{ type: "text", value: title }] }]
        : [];

      return [
        {
          type: "div",
          class: "myst-demo-container",
          style: {
            border: "1px solid #e0e0e0",
            borderRadius: "4px",
            padding: "1rem",
            marginBottom: "1rem",
          },
          children: [
            ...titleChildren,
            {
              type: "code",
              lang: "markdown",
              value: rawContent,
            },
            { type: "thematicBreak" },
            ...parsed.children,
          ],
        },
      ];
    },
  };
}

const plugin = {
  name: "MyST Demo Directive",
  directives: [
    createDemoDirective("myst:demo"),
  ],
};

export default plugin;
