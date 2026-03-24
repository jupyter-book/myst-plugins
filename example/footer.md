# Footer

The `{footer}` directive renders a site footer from structured YAML data. It uses the [anywidget](https://mystmd.org/guide/widgets) interface to do so in a self-contained way.

## Installation

Add the plugin to your `myst.yml`:

```yaml
project:
  plugins:
  - https://github.com/jupyter-book/myst-plugins/releases/download/footer-latest/index.mjs
```

Then create a markdown file (e.g. `footer.md`) with a `{footer}` directive (see below for example), and wire it into your site config:

```yaml
site:
  parts:
    footer: footer.md
```

## Usage

Use this plugin with a `{footer}` directive with a YAML body. There are multiple fields (see below) that will change the layout based on which are present. Here's an example:

:::::{myst:demo}
```{footer}
title: Jupyter Book
description: Build beautiful, publication-quality books and documents from computational content.
logo: https://raw.githubusercontent.com/jupyter-book/jupyterbook.org/refs/heads/main/docs/media/images/logo.svg
copyright: © 2026 Jupyter Book Contributors. Licensed under BSD-3.

links:
  Documentation:
    - Getting Started: https://jupyterbook.org/stable/get-started/
    - User Guide: https://mystmd.org/guide
    - Reference: https://mystmd.org/guide/syntax-overview
  Community:
    - GitHub: https://github.com/jupyter-book
    - Forum: https://github.com/orgs/jupyter-book/discussions
    - Contributing: https://jupyterbook.org/contribute/
  Related Projects:
    - Jupyter Book: https://jupyterbook.org
    - MyST Markdown: https://mystmd.org
    - Jupyter: https://jupyter.org

icons:
  github: https://github.com/jupyter-book
  bluesky: https://bsky.app/profile/mystmd.org
  discord: https://discord.mystmd.org
```
:::::

### Available Fields

`title`
: Project name, displayed in the branding area.

`description`
: Short tagline below the title.

`logo`
: Path or URL to a logo image.

`copyright`
: Copyright text at the bottom.

`links`
: Named groups of links. Each group becomes a column. Use `- Label: URL` items.

`icons`
: Icon links as `name: url` pairs. Icons are fetched from [Simple Icons](https://simpleicons.org) at build time. Browse [simpleicons.org](https://simpleicons.org) to find icon names — use the exact lowercase slug shown on the site (e.g. `github`, `discord`, `mastodon`, `youtube`, `bluesky`, `x`).

### Gotchas and notes

- Links must be full URLs (e.g. `https://example.com/guide`), not MyST cross-references.
- YAML comments (`#`) are not supported inside the directive body.

## Examples

### Example: Minimal

This shows how the footer shrinks if only a few fields are used.

:::::{myst:demo}
```{footer}
title: My Docs
copyright: © 2026 Me
```
:::::

### Example: Only links

Only providing links instead of the logo etc.

:::::{myst:demo}
```{footer}
links:
  Docs:
    - Guide: https://example.com/guide
    - API: https://example.com/api
  Project:
    - Source: https://github.com/example
    - Issues: https://github.com/example/issues
copyright: © 2026 Example Project
```
:::::
