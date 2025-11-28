# GitHub Issue Link Decorator

Automatically decorates GitHub issue links with titles, state badges, and CSS classes for styling.

## What it does

When you link to a GitHub issue like `https://github.com/owner/repo/issues/123`, this plugin:

- Fetches the issue title and state from GitHub API
- Replaces bare URLs with the issue title (e.g., `Fix bug in parser [OPEN]`)
- Adds CSS classes and data attributes for styling

## Installation

Add to your `myst.yml`:

```yaml
project:
  plugins:
    - github-issue-link/src/index.mjs
```

## Usage

Just paste GitHub issue URLs in your markdown:

```markdown
See https://github.com/jupyter-book/jupyter-book/issues/123
Or with custom text: [My custom label](https://github.com/owner/repo/issues/456)
```

## Authentication

Set `GITHUB_TOKEN` for higher API rate limits:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```


The plugin adds these attributes:

- `class`: `github-issue-link github-issue-link--{open|closed}`
- `data-state`: `open` or `closed`
- `data-state-reason`: Why it was closed (e.g., `completed`, `not_planned`)
- `data-issue-title`: The full issue title
