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

### GitHub Search queries

```markdown
:::{issue-table} author:@choldgraf org:jupyter-book is:pr state:open
:columns: title, author, reactions
:sort: reactions-desc
:::
```

### Project view links

Project view links are supported too - the directive applies the view's filters so only items visible in that view are shown:

```markdown
:::{issue-table} https://github.com/orgs/jupyter-book/projects/1/views/7
:::
```

### Custom template columns

Add ad-hoc columns whose values are generated from other fields (issue data or project fields) using `{{field}}` placeholders, including simple MyST-style roles like `{button}`:

```markdown
:::{issue-table} repo:jupyter-book/jupyter-book is:issue is:open
:columns: title, reactions, quick_link, repo_link, issue_cta
:templates: quick_link=[View on GitHub]({{url}}); repo_link=[Repo]({{repo}}); issue_cta={button}`Open issue <{{url}}>`
:::
```

## Options

- `:columns:` - Comma-separated column names (default: `title,author,state,reactions`) – most columns auto-link, so you generally don’t need `linked_*` variants
- `:sort:` - Sort by `column-direction`, e.g., `reactions-desc` or `created-asc`. Multiple sort keys can be comma-separated and are applied left-to-right.
- `:limit:` - Maximum number of rows to render (after sorting)
- `:body-truncate:` - Truncate the body text to this many characters
- `:date-format:` - `relative` or `absolute` date display
- `:templates:` - Custom column templates as `name=My text with {{field}} placeholders; another=...` (include the template name in `:columns:` to render it)

## Available Columns

- `number` - Issue/PR number (#123) (auto-links to the issue)
- `title` - Title text (auto-links to the issue)
- `state` - Open/Closed with icon
- `author` - GitHub username (auto-links to profile when it looks like a handle)
- `author_affiliation` - Organization/handle (auto-links to GitHub when it looks like a handle)
- `repo` - Repository `owner/name` (auto-links to GitHub)
- `created` - Creation date
- `updated` - Last updated date
- `reactions` - Reaction count
- `comments` - Comment count
- `labels` - Comma-separated labels
- `linked_prs` - Linked PRs from cross-references
- `body` - Issue/PR body text
- Project fields from project views (e.g., `Team Priority`, `Status`, `Iteration`) are available as columns and sort keys

## Authentication

Set `GITHUB_TOKEN` environment variable:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

## Caching

Results are cached in `_build/temp/github-issues/` for 24 hours to speed up builds and reduce API rate limit usage.

**To clear cache:**

```bash
rm -rf _build/temp/github-issues/
```
