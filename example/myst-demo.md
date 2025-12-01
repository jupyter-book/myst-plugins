# MyST Demo Directive

Shows raw MyST content alongside its rendered output - perfect for documentation and tutorials.

## Usage

Add to your `myst.yml`:

```yaml
project:
  plugins:
    - https://raw.githubusercontent.com/jupyter-book/myst-plugins/main/plugins/demo/src/index.mjs
```

## Basic Example

::::::{myst:demo}
This is **bold** and this is *italic*.

Here's a [link](https://mystmd.org).
::::::

## Lists and Structure

::::::{myst:demo}
### A Heading

Here's an unordered list:

- First item
- Second item
- Third item

And a numbered list:

1. Step one
2. Step two
3. Step three
::::::

## Code Blocks

::::::{myst:demo}
Here's some Python code:

```python
def hello_world():
    print("Hello, MyST!")
```
::::::

## Admonitions

::::::{myst:demo}
:::{note}
This is a note admonition with important information!
:::

:::{warning}
This is a warning - be careful!
:::
::::::

## Math

::::::{myst:demo}
Inline math: $E = mc^2$

Display math:

$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
::::::

## Images and Figures

::::::{myst:demo}
```{figure} https://picsum.photos/seed/myst-demo/400/300.jpg
:name: random-figure

A random image from Unsplash
```
::::::

## Cross-References

::::::{myst:demo}
You can reference the figure above: see {ref}`random-figure` for an example.
::::::

## How It Works

The `myst:demo` directive takes any MyST content and displays it in a single card:

1. **MyST Demo** heading (customizable via an argument)
2. A code block titled “Source MyST” showing the raw markdown
3. **Rendered output** below

You can also use `myst-demo` as an alias if needed.

This makes it perfect for:
- Writing MyST documentation
- Creating tutorials
- Demonstrating MyST syntax
- Testing how content renders

This directive is used extensively throughout the myst-plugins documentation to show examples of each plugin in action!
