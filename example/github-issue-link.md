---
updated: November 28, 2025
---
# GitHub Issue Link

Automatically decorates GitHub issue links with titles and state badges.

## Usage

Add to your `myst.yml`:

```yaml
project:
  plugins:
    - https://raw.githubusercontent.com/jupyter-book/myst-plugins/main/plugins/github-issue-link/src/index.mjs
```

Optionally set `GITHUB_TOKEN` for higher rate limits:

```bash
export GITHUB_TOKEN=your_token_here
```

## Examples

### Open Issue (🟢)

::::::{myst:demo}
This open issue https://github.com/jupyter-book/jupyter-book/issues/2481 needs attention.
::::::

### Closed Issue (🟣)

::::::{myst:demo}
This closed issue https://github.com/jupyter-book/jupyter-book/issues/2050 describes the migration path.
::::::

### Custom link text

You can also use custom link text, and the plugin will add state information:

::::::{myst:demo}
For more details, see [this output scroll issue](https://github.com/jupyter-book/jupyter-book/issues/2050) for instructions.
::::::
