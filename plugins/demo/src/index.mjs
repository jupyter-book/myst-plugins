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
        ? [
            {
              type: "cardTitle",
              children: [{ type: "text", value: title }],
            },
          ]
        : [];

      const cardNode = {
        type: "card",
        class: "myst-demo-container",
        children: [
          ...titleChildren,
          {
            type: "cardBody",
            children: [
              {
                type: "code",
                lang: "markdown",
                meta: { caption: "Source MyST" },
                value: rawContent,
              },
          {
            type: "paragraph",
            children: [
              {
                type: "thematicBreak",
              },
            ],
          },
          ...parsed.children,
        ],
          },
        ],
      };

      return [cardNode];
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
