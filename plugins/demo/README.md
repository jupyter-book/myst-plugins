# MyST Demo Directive

A MyST plugin that displays raw MyST markdown source code alongside its rendered output in a card.

## Usage

Add to your `myst.yml`:

```yaml
project:
  plugins:
    - https://raw.githubusercontent.com/jupyter-book/myst-plugins/main/plugins/demo/src/index.mjs
```

Use like this:
```markdown
:::{myst:demo} Custom Title
This is **bold** and this is *italic*.

- Item 1
- Item 2
:::
```
