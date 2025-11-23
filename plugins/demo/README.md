# MyST Demo Directive

A MyST plugin that displays raw MyST markdown source code alongside its rendered output. Perfect for documentation and tutorials where you want to show both the syntax and the result.

## Usage

Add to your `myst.yml`:

```yaml
project:
  plugins:
    - https://raw.githubusercontent.com/jupyter-book/myst-plugins/main/plugins/demo/src/index.mjs
```

## Features

- Shows MyST source in a code block
- Displays the rendered output below
- Useful for documentation, tutorials, and examples
- Works with any MyST content

## Example

```markdown
::::::{myst-demo}
This is **bold** and this is *italic*.

- Item 1
- Item 2
::::::
```

This will display:
1. **MyST Source:** - A code block showing the raw markdown
2. **Rendered Output:** - The formatted result

## How it Works

The `myst-demo` directive wraps content and:
1. Displays the raw content as a markdown code block
2. Parses and renders the content
3. Shows both side-by-side in the output

This plugin is extensively used in the myst-plugins repository to demonstrate how other plugins work.
