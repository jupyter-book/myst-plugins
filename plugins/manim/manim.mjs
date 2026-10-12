/**
 * MyST plugin: manim-web
 *
 * Registers the `manim` directive. At build time it emits an anywidget node
 * that carries the user's animation code and canvas options as model data.
 * The browser-side widget (manim-widget.mjs) picks those up and runs manim-web.
 *
 * Usage:
 *
 *   :::{manim}
 *   :width: 800
 *   :height: 450
 *   :background-color: '#1e1e2e'
 *
 *   const circle = new Circle({ color: RED, fillOpacity: 0.3 });
 *   scene.add(circle);
 *   await scene.play(new Create(circle));
 *   await scene.wait(1);
 *   await scene.play(new FadeOut(circle));
 *   :::
 */
const PLUGIN_PATH = new URL(import.meta.url).pathname;
const WIDGET_PATH = PLUGIN_PATH.replace(/\/[^/]*$/, "/manim-widget.mjs");

function relativePath(fromDir, toFile) {
  const from = fromDir.split("/").filter(Boolean);
  const to = toFile.split("/").filter(Boolean);
  let i = 0;
  while (i < from.length && i < to.length && from[i] === to[i]) i++;
  return [...Array(from.length - i).fill(".."), ...to.slice(i)].join("/") || ".";
}

const manimDirective = {
  name: 'manim',
  doc: `Embed an interactive manim-web animation.
Write only the animation body — \`scene\` and all manim-web exports
(shapes, animations, colors, rate-functions) are already in scope.`,

  body: {
    type: String,
    required: true,
    doc: 'Animation code. `scene` plus all manim-web exports are pre-imported.',
  },

  options: {
    width: {
      type: Number,
      doc: 'Canvas width in pixels (default: 800).',
    },
    height: {
      type: Number,
      doc: 'Canvas height in pixels (default: 450).',
    },
    'background-color': {
      type: String,
      doc: "Background color as a CSS hex string, e.g. '#1e1e2e' (default: '#000000').",
    },
    scene: {
      type: String,
      doc: "Scene class to use: 'Scene' (default) or 'ThreeDScene' for 3D with orbit controls.",
    },
  },

  run(data, vfile) {
    const { body, options } = data;
    const fromDir = vfile.path.replace(/\/[^/]*$/, "");
    const esm = relativePath(fromDir, WIDGET_PATH);


    return [
      {
        type: 'anywidget',
        esm: esm,
        model: {
          code: body,
          width: options?.width ?? 800,
          height: options?.height ?? 450,
          backgroundColor: options?.['background-color'] ?? '#000000',
          sceneType: options?.scene ?? 'Scene',
        },
      },
    ];
  },
};

const plugin = {
  name: 'manim-web',
  author: 'Yehor Korotenko',
  license: 'MIT',
  directives: [manimDirective],
};

export default plugin;
