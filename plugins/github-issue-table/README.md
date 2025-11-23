# GitHub Issue Table

Renders GitHub issues and PRs as tables from search queries.

## Installation

Add to your `myst.yml`:

```yaml
project:
  plugins:
    - plugins/github-issue-table/src/index.mjs
```

## Usage

```markdown
:::{issue-table} author:@choldgraf org:jupyter-book is:pr state:open
:columns: linked_title, author, reactions
:sort: reactions-desc
:::
```

## Options

- `:columns:` - Comma-separated column names (default: `linked_title,author,state,reactions`)
- `:sort:` - Sort by `column-direction`, e.g., `reactions-desc` or `created-asc`

## Available Columns

- `number` - Issue/PR number (#123)
- `title` - Plain title text
- `linked_title` - Title as clickable link
- `state` - Open/Closed with icon
- `author` - GitHub username
- `author_affiliation` - Organization (if available)
- `created` - Creation date
- `updated` - Last updated date
- `reactions` - Reaction count
- `comments` - Comment count
- `labels` - Comma-separated labels

## Authentication

Set `GITHUB_TOKEN` environment variable:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

## Caching

Results are cached in `_build/temp/github-issues/` for 1 hour to speed up builds.
