const plugin = {
  name: 'Append anywidget to every page',
  transforms: [
    {
      name: 'transform-add-anywidget',
      doc: 'Adds an anywidget to the end of every page',
      stage: 'document',
      plugin: (_, utils) => (node) => {
        const anyWidgetNode = {
            type: 'block',
            children: [
                {
                type: 'anywidget',
                esm: 'https://github.com/TUD-JB-Templates/JB2_plugins/releases/download/wizard-widget/wizard.mjs',
                model: {},
                css: undefined,
                class: undefined
                }
            ]
        }
        node.children.push(anyWidgetNode);
      },
    },
  ],
};

export default plugin;
