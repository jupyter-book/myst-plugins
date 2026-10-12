# MyST Demo Directive

Shows raw MyST content alongside its rendered output.
The `{myst:demo}` directive takes any MyST content and displays two things in a card:

1. The markdown source
2. The rendered output

This directive is used extensively throughout the myst-plugins documentation to show examples of each plugin in action!

## Usage

Add to your `myst.yml`:

```yaml
project:
  plugins:
    - https://raw.githubusercontent.com/jupyter-book/myst-plugins/main/plugins/demo/src/index.mjs
```

The syntax below is both an example of `{myst:demo}` and a demonstration of how to use it:

::::{myst:demo}
:::{myst:demo} My cool title
This is **bold** and this is *italic*.

Here's a [link](https://mystmd.org).
:::
::::

Do not give an argument if you do not wish to have a title.

## Examples

Here are several examples to demonstrate functionality and as a reference to ensure the rendering looks correct.

### Lists and Structure

::::::{myst:demo}
#### A Heading

Here's an unordered list:

- First item
- Second item
- Third item

And a numbered list:

1. Step one
2. Step two
3. Step three
::::::

### Code Blocks

::::::{myst:demo}
Here's some Python code:

```python
def hello_world():
    print("Hello, MyST!")
```
::::::

### Admonitions

::::::{myst:demo}
:::{note}
This is a note admonition with important information!
:::

:::{warning}
This is a warning - be careful!
:::
::::::

### Math

::::::{myst:demo}
Inline math: $E = mc^2$

Display math:

$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
::::::

### Images and Figures

::::::{myst:demo}
```{figure} https://picsum.photos/seed/myst-demo/400/300.jpg
:name: random-figure

A random image from Unsplash
```
::::::

### Cross-References

::::::{myst:demo}
You can reference the figure above: see {ref}`random-figure` for an example.
::::::
