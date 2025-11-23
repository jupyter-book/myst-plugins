# GitHub Handle Links

Automatically converts `@username` mentions into links to GitHub profiles.

## Usage

Add to your `myst.yml`:

```yaml
project:
  plugins:
    - https://raw.githubusercontent.com/jupyter-book/myst-plugins/main/plugins/github-handle-links/src/index.mjs
```

Optionally set `GITHUB_TOKEN` for higher rate limits:

```bash
export GITHUB_TOKEN=your_token_here
```

## Examples

### In text

::::::{myst-demo}
Thanks to @choldgraf and @rowanc1 for their work on MyST!
::::::

### With citation syntax

::::::{myst-demo}
See [@rowanc1]'s contributions to the MyST ecosystem.
::::::

### Multiple mentions

::::::{myst-demo}
The discussion between @choldgraf, @rowanc1, and @agoose77 led to this feature.
::::::

## How it works

The plugin:
- Finds `@handle` mentions in text
- Validates handles via GitHub API
- Creates profile links automatically
- Skips mentions in code blocks
- Filters citation warnings for handled mentions

Set `GITHUB_TOKEN` environment variable for higher rate limits.
