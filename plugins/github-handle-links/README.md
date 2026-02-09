# GitHub Handle Links

Automatically converts `@username` mentions into clickable links to GitHub profiles if they do not match a referenceable label in your MyST site.

## What it does

When you write `@choldgraf` in your MyST documents, this plugin:
- Waits until MyST has parsed references and citations so real `@...` references stay untouched
- If the label is not a known reference, checks whether it matches a GitHub username
- Converts valid GitHub handles to links: `[@choldgraf](https://github.com/choldgraf)`
- Leaves unknown or invalid handles alone
- Adds CSS classes for (optional) styling

## Installation

Add to your `myst.yml`:

```yaml
project:
  plugins:
    - github-handle-links/src/index.mjs
```

## Usage

Simply write GitHub handles in your documents:

```markdown
Thanks to @kirstiejane and @mfisher87 for their work on this!

See [@choldgraf]'s repository for more details.
```

The plugin automatically:
- Finds `@handle` mentions via MyST citation nodes
- Skips mentions that resolve to existing references/citations
- Validates the remaining handles exist on GitHub
- Creates profile links and leaves non-existent handles unchanged
- If a `@handle` is already inside a link to GitHub, the link URL is preserved but the avatar and styling are still applied
- Handles linked to non-GitHub URLs are left unchanged

## Authentication

Set `GITHUB_TOKEN` for higher API rate limits:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```
