# GitHub Handle Links

Automatically converts `@username` mentions into clickable links to GitHub profiles.

## What it does

When you write `@choldgraf` in your MyST documents, this plugin:
- Validates the handle against the GitHub API
- Converts it to a link: `[@choldgraf](https://github.com/choldgraf)`
- Adds CSS classes for styling
- Works in both regular text and MyST citation syntax

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
Thanks to @choldgraf and @rowanc1 for their work on this!

See [@choldgraf]'s repository for more details.
```

The plugin automatically:
- Finds `@handle` mentions in text
- Validates handles exist on GitHub
- Creates profile links
- Skips mentions in code blocks and inline code
- Filters MyST citation warnings for handled mentions

## Authentication

Set `GITHUB_TOKEN` for higher API rate limits:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

**Rate limits:**
- Without token: 60 requests/hour
- With token: 5,000 requests/hour

## Link Attributes

Generated links include:

```html
<a href="https://github.com/choldgraf"
   title="GitHub profile for choldgraf"
   class="github-handle-link"
   data-github-user="choldgraf">
  @choldgraf
</a>
```

Style with CSS:

```css
.github-handle-link {
  color: #0366d6;
}
```

## Error Handling

Invalid or non-existent handles are left as plain text - builds never fail.
