# GitHub Issue Table

Renders GitHub issues and PRs as tables from search queries.

## Installation

Use the bundled single-file version from the repository in a `myst.yml` file:

```yaml
project:
  plugins:
    - https://raw.githubusercontent.com/jupyter-book/myst-plugins/main/plugins/github-issue-table/dist/index.mjs
```

## Usage

See examples for usage documentation: `../example/github-issue-table.md`

## Authentication and caching

Set `GITHUB_TOKEN` environment variable to increase your API rate limit:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

Results are cached in `_build/temp/github-issues/` for 24 hours to speed up builds and reduce API rate limit usage.
