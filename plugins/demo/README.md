# MyST Demo Directive

A MyST plugin that displays raw MyST markdown source code alongside its rendered output in a card.

## Usage

Add to your `myst.yml`:

```yaml
project:
  plugins:
    - https://raw.githubusercontent.com/jupyter-book/myst-plugins/main/plugins/demo/src/index.mjs
```

## Features

- Shows MyST source in a code block
- Displays the rendered output below in the same block
- Optional argument to set the card title (defaults to “MyST Demo”)

## Example

```markdown
::::::{myst:demo} Custom Title
This is **bold** and this is *italic*.

- Item 1
- Item 2
::::::
```

This will display:
1. **MyST Demo** (or your custom title) as the card heading
2. A code block titled "Source MyST" showing the raw markdown
3. Rendered output below, inside the same card

