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
Where handles will be added:

- Thanks to @kirstiejane and @mfisher87 for their work on MyST!
- Already-linked handles get an avatar and styling: [@kirstiejane](https://github.com/kirstiejane)

Where they won't:

- Incorrect usernames: @thisuserwontbelinked
- Literal spans: `@usernamesinbackticks`
- Linked handles to non-github urls: [@kirstiejane](https://mystmd.org).
::::::
