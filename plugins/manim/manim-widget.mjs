/**
 * manim-web anywidget
 *
 * Runs inside the browser. MyST calls render({ model, el }) once per
 * `manim` directive on the page. `el` is a Shadow DOM element — we can
 * write arbitrary HTML/CSS into it without polluting the rest of the page.
 *
 * model keys (set by plugin.mjs):
 *   code            {string}  user's animation JS
 *   width           {number}  canvas width  (px)
 *   height          {number}  canvas height (px)
 *   backgroundColor {string}  CSS hex color
 */

const MANIM_CDN =
  'https://cdn.jsdelivr.net/npm/manim-web@0.3.22/dist/manim-web.browser.js';

/** All manim-web names we destructure into the user's animation scope. */
const MANIM_EXPORTS = [
  // scenes
  'Scene', 'ThreeDScene', 'MovingCameraScene', 'ZoomedScene',
  'LinearTransformationScene', 'VectorScene', 'InteractiveScene',
  // interactive controls
  'Controls', 'OrbitControls',
  // drag & interaction utilities
  'makeDraggable', 'Draggable',
  'makeHoverable', 'Hoverable',
  'makeClickable', 'Clickable',
  // base mobjects
  'Mobject', 'Mobject1D', 'Mobject2D',
  'VMobject', 'VMobjectFromSVGPath', 'VectorizedPoint',
  'PMobject', 'PointMobject', 'PointCloudDot',
  'TipableVMobject',
  // 2D shapes
  'Circle', 'Dot', 'SmallDot', 'LargeDot', 'AnnotationDot', 'LabeledDot',
  'Ellipse', 'AnnularSector', 'Annulus', 'Sector',
  'Square', 'Rectangle', 'RoundedRectangle',
  'Triangle', 'Polygon', 'RegularPolygon', 'Polygram', 'RegularPolygram',
  'ArcPolygon', 'Hexagon', 'Pentagon',
  'Star', 'Cross', 'ConvexHull',
  'Arc', 'ArcBetweenPoints', 'TangentialArc', 'CubicBezier',
  'Line', 'DashedLine', 'LabeledLine',
  'Arrow', 'DoubleArrow', 'CurvedArrow', 'CurvedDoubleArrow',
  'LabeledArrow', 'LabeledPolygram',
  'Vector', 'ArrowVectorField', 'StreamLines',
  'ArrowTip', 'StealthTip',
  'ArrowCircleTip', 'ArrowCircleFilledTip',
  'ArrowSquareTip', 'ArrowSquareFilledTip',
  'ArrowTriangleTip', 'ArrowTriangleFilledTip',
  'Angle', 'RightAngle', 'Elbow',
  'Brace', 'BraceBetweenPoints', 'BraceLabel', 'BraceText', 'ArcBrace',
  'TangentLine',
  'DashedVMobject', 'BackgroundRectangle', 'SurroundingRectangle',
  'ScreenRectangle', 'FullScreenRectangle', 'FullScreenFadeRectangle',
  'Cutout', 'SVGMobject', 'ImageMobject',
  'TracedPath', 'AnimatedBoundary',
  'Underline',
  // 3D shapes
  'Sphere', 'Cube', 'Cone', 'Cylinder', 'Torus',
  'Box3D', 'Line3D', 'Arrow3D', 'Dot3D',
  'Surface3D', 'ParametricSurface', 'TexturedSurface',
  'Tetrahedron', 'Octahedron', 'Icosahedron', 'Dodecahedron',
  'Polyhedron', 'Prism',
  'ThreeDAxes', 'ThreeDVMobject',
  'ConvexHull3D',
  // graphs & functions
  'FunctionGraph', 'ParametricFunction', 'ImplicitFunction',
  'Graph', 'DiGraph', 'GenericGraph',
  // coordinate systems
  'Axes', 'NumberLine', 'NumberPlane', 'ComplexPlane',
  'PolarPlane', 'SampleSpace',
  // data display
  'BarChart', 'Table', 'MathTable', 'DecimalTable', 'IntegerTable', 'MobjectTable',
  'Matrix', 'DecimalMatrix', 'IntegerMatrix', 'MobjectMatrix',
  // text & math
  'Text', 'MarkupText', 'MarkdownText', 'Paragraph', 'BulletedList', 'Title',
  'MathTex', 'Tex', 'SingleStringMathTex', 'MathTexSVG', 'MathTexImage', 'MathTexPart',
  'Code',
  'TexTemplate', 'TexTemplateLibrary', 'TexFontTemplates',
  'GlyphVMobject', 'TextGlyphGroup',
  // numbers & variables
  'DecimalNumber', 'Integer', 'Variable',
  'ChangingDecimal',
  // groups
  'VGroup', 'VDict', 'Group', 'PGroup',
  // value tracking
  'ValueTracker', 'ComplexValueTracker',
  // special scenes / objects
  'ManimBanner', 'DiceFace', 'MandelbrotSet', 'NewtonFractal',
  'PhaseFlow', 'VectorField', 'VectorFieldVector',
  // animations – base
  'Animation',
  // animations – add / remove
  'Add', 'Remove',
  // animations – creation/destruction
  'Create', 'Uncreate', 'DrawBorderThenFill',
  'Write', 'Unwrite',
  'AddTextLetterByLetter', 'RemoveTextLetterByLetter',
  'AddTextWordByWord',
  'TypeWithCursor', 'UntypeWithCursor',
  'ShowCreationThenDestruction',
  'ShowSubmobjectsOneByOne', 'ShowIncreasingSubsets', 'ShowPartial',
  'ShowPassingFlash', 'ShowPassingFlashWithThinningStrokeWidth',
  'Blink',
  // animations – fade
  'FadeIn', 'FadeOut', 'FadeToColor',
  'FadeTransform', 'FadeTransformPieces',
  // animations – grow/shrink
  'GrowFromCenter', 'GrowFromEdge', 'GrowFromPoint', 'GrowArrow',
  'ShrinkToCenter', 'SpinInFromNothing', 'SpiralIn',
  // animations – transform
  'Transform', 'ReplacementTransform', 'TransformFromCopy',
  'TransformMatchingShapes', 'TransformMatchingTex', 'TransformAnimations',
  'ClockwiseTransform', 'CounterclockwiseTransform',
  'CyclicReplace', 'Swap',
  'Restore', 'MoveToTarget',
  'Scale', 'ScaleInPlace',
  'Rotate', 'Rotating',
  'Shift', 'MoveAlongPath', 'MoveToTargetPosition',
  'ApplyMethod', 'ApplyFunction',
  'ApplyMatrix', 'ApplyComplexFunction',
  'ApplyPointwiseFunction', 'ApplyPointwiseFunctionToCenter',
  'ApplyWave',
  'Homotopy', 'ComplexHomotopy', 'SmoothedVectorizedHomotopy',
  // animations – update
  'UpdateFromFunc', 'UpdateFromAlphaFunc',
  'ChangeDecimalToValue', 'ChangeSpeed',
  // animations – highlighting
  'Indicate', 'Circumscribe', 'Flash',
  'FocusOn', 'Broadcast', 'Pulse',
  'Wiggle', 'WiggleOutThenIn',
  // animations – grouping
  'AnimationGroup', 'LaggedStart', 'LaggedStartMap', 'Succession',
  'Wait',
  // rate functions – basic
  'smooth', 'linear', 'doubleSmooth',
  'thereAndBack', 'thereAndBackWithPause',
  'rushFrom', 'rushInto', 'slowInto',
  'exponentialDecay', 'lingering', 'runningStart', 'reverse',
  // rate functions – ease in
  'easeIn', 'easeInSine', 'easeInQuad', 'easeInCubic',
  'easeInQuart', 'easeInQuint', 'easeInExpo',
  'easeInCirc', 'easeInBack', 'easeInBounce', 'easeInElastic',
  // rate functions – ease out
  'easeOut', 'easeOutSine', 'easeOutQuad', 'easeOutCubic',
  'easeOutQuart', 'easeOutQuint', 'easeOutExpo',
  'easeOutCirc', 'easeOutBack', 'easeOutBounce', 'easeOutElastic',
  // rate functions – ease in-out
  'easeInOut', 'easeInOutSine', 'easeInOutQuad', 'easeInOutCubic',
  'easeInOutQuart', 'easeInOutQuint', 'easeInOutExpo',
  'easeInOutCirc', 'easeInOutBack', 'easeInOutBounce', 'easeInOutElastic',
  // direction constants
  'UP', 'DOWN', 'LEFT', 'RIGHT',
  'UL', 'UR', 'DL', 'DR',
  'IN', 'OUT', 'ORIGIN',
  // colors – base
  'RED', 'GREEN', 'BLUE', 'YELLOW', 'PURPLE', 'PINK',
  'WHITE', 'BLACK', 'GRAY', 'LIGHT_GRAY', 'DARK_GRAY',
  'ORANGE', 'TEAL', 'GOLD', 'MAROON',
  'DARK_BLUE', 'DARK_BROWN', 'LIGHT_BROWN', 'LIGHT_PINK',
  'LIGHTER_GRAY', 'DARKER_GRAY',
  'PURE_RED', 'PURE_GREEN', 'PURE_BLUE',
  // colors – variants (A–E)
  'RED_A', 'RED_B', 'RED_C', 'RED_D', 'RED_E',
  'GREEN_A', 'GREEN_B', 'GREEN_C', 'GREEN_D', 'GREEN_E',
  'BLUE_A', 'BLUE_B', 'BLUE_C', 'BLUE_D', 'BLUE_E',
  'YELLOW_A', 'YELLOW_B', 'YELLOW_C', 'YELLOW_D', 'YELLOW_E',
  'PURPLE_A', 'PURPLE_B', 'PURPLE_C', 'PURPLE_D', 'PURPLE_E',
  'TEAL_A', 'TEAL_B', 'TEAL_C', 'TEAL_D', 'TEAL_E',
  'GOLD_A', 'GOLD_B', 'GOLD_C', 'GOLD_D', 'GOLD_E',
  'MAROON_A', 'MAROON_B', 'MAROON_C', 'MAROON_D', 'MAROON_E',
  'GRAY_A', 'GRAY_B', 'GRAY_C', 'GRAY_D', 'GRAY_E',
];

function showError(container, message) {
  container.style.cssText = `
    background: #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  `;
  const pre = document.createElement('pre');
  pre.style.cssText =
    'color:#ff6b6b;padding:16px;font-size:13px;white-space:pre-wrap;margin:0;';
  pre.textContent = '[manim-web error]\n' + message;
  container.appendChild(pre);
}

export default {
  async render({ model, el }) {
    const code = model.get('code');
    const width = model.get('width');
    const height = model.get('height');
    const backgroundColor = model.get('backgroundColor');
    const sceneType = model.get('sceneType') ?? 'Scene';

    // ── Container ────────────────────────────────────────────────────────────
    const container = document.createElement('div');
    container.style.cssText = `
      width: ${width}px;
      height: ${height}px;
      display: inline-block;
      overflow: hidden;
      border-radius: 6px;
    `;
    el.appendChild(container);

    // ── Load manim-web ────────────────────────────────────────────────────────
    let ManimWeb;
    try {
      ManimWeb = await import(MANIM_CDN);
    } catch (err) {
      showError(container, `Failed to load manim-web from CDN.\n${err.message}`);
      return;
    }

    // ── Boot scene ───────────────────────────────────────────────────────────
    const SceneClass = ManimWeb[sceneType] ?? ManimWeb.Scene;
    const scene = new SceneClass(container, { width, height, backgroundColor });

    // ── Destructure all exports for user code ─────────────────────────────────
    const scope = {};
    for (const name of MANIM_EXPORTS) {
      if (name in ManimWeb) scope[name] = ManimWeb[name];
    }

    // ── Run user animation ────────────────────────────────────────────────────
    // We build an async function whose parameters are all the manim-web names
    // so the user can reference them without any import statement.
    try {
      const fn = new Function(
        'scene',
        ...Object.keys(scope),
        `"use strict"; return (async () => { ${code} })();`
      );
      await fn(scene, ...Object.values(scope));
    } catch (err) {
      console.error('[manim-web]', err);
      showError(container, err.message);
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      scene.dispose?.();
      container.remove();
    };
  },
};
