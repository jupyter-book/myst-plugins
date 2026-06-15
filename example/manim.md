# Manim examples

Here is a 3D scene created using `manim` plugin.

## 3D-Scene

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

Its code is provided below.

::::{admonition} Code
:class: dropdown
```javascript
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
```
::::
`
