---
name: Chris Holdgraf
---


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

## Example

::::::{myst:demo}
Thanks to @kirstiejane and @mfisher87 for their work on MyST!

- Incorrect usernames won't be touched: `@usernamesinbackticks`.
- Already-linked usernames won't be touched: [@kirstiejane](https://mystmd.org)
::::::


## How it works

The plugin:
- Finds `@handle` mentions in text
- Validates handles via GitHub API
- Creates profile links automatically
- Skips mentions in code blocks
- Skips handles already wrapped in links
- Filters citation warnings for handled mentions
