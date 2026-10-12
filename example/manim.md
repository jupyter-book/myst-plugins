# Manim examples


The plugin repository is [here](https://github.com/DobbiKov/myst-manim-plugin).
You may find there more examples and the documentation.

## Installation
1. Copy `manim.mjs` and `manim-widget.mjs` to your `plugins` directory
2. Put `plugins/manim.mjs` as a plugin in myst.yml
    ```yml
    version: 1
    project:
      plugins:
        - plugins/manim.mjs
    ```

## Demo
Here is a 3D scene created using `manim` plugin. You can rotate the scene by
holding left-mouse button and move the mouse. You also can move the objects by
clicking on them and moving the mouse.

:::{myst:demo}
:::{manim}
:scene: ThreeDScene
// ThreeDScene with orbit controls enabled by default
const axes = new ThreeDAxes({ xRange: [-4, 4, 1], yRange: [-4, 4, 1], zRange: [-3, 3, 1] });

const sphere = new Sphere({ radius: 0.4, color: BLUE, opacity: 0.8 });
sphere.moveTo([-2, 0, 0]);

const cube = new Cube({ sideLength: 0.6, color: GREEN, opacity: 0.8 });
cube.moveTo([2, 0, 0]);

const dot = new Dot3D({ color: YELLOW, radius: 0.2 });
dot.moveTo([0, 2, 0]);

scene.add(axes, sphere, cube, dot);

// 3D dragging raycasts onto a camera-facing plane at the object's depth
makeDraggable(sphere, scene);
makeDraggable(cube, scene);
makeDraggable(dot, scene);
:::
:::
