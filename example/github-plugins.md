# GitHub Plugins

A family of plugins for working with GitHub content in your MyST documents.

## Plugins

- **[GitHub Issue Table](./github-issue-table.md)** — Render GitHub issues and PRs as tables from search queries or project URLs.
- **[GitHub Issue Link](./github-issue-link.md)** — Automatically decorate GitHub issue links with titles and state badges.
- **[GitHub Handle Links](./github-handle-links.md)** — Convert `@username` mentions into links to GitHub profiles with avatars.

## Shared requirements

All three plugins use the GitHub API and benefit from a `GITHUB_TOKEN` environment variable to avoid rate limits.
Set it in your shell before building:

```bash
export GITHUB_TOKEN=ghp_...
```

API responses are cached in `_build/cache/` with a 24-hour TTL, so repeated builds don't re-fetch the same data.
