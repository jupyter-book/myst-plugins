---
name: Chris Holdgraf
---
# GitHub Issue Table

Renders GitHub issues and PRs as tables from search queries or GitHub URLs.

## Setup

Add to your `myst.yml`:

```yaml
project:
  plugins:
    - https://raw.githubusercontent.com/jupyter-book/myst-plugins/main/plugins/github-issue-table/dist/index.mjs
```

Set the `GITHUB_TOKEN` environment variable for authentication:

```bash
export GITHUB_TOKEN=your_token_here
```

:::{dropdown} Token scopes
- **Fine-grained PATs**: `Issues (read-only)`, `Pull requests (read-only)`, and `Projects (read-only)` if you query project boards; `Metadata` is implied.
- **Classic PATs**: `repo` (or `public_repo` for public data only), `read:org` (for org project views), and `project` (for project boards).
- **GitHub Actions**: usually works for public data but may need `permissions: contents: read, issues: read, pull-requests: read, projects: read` if you query projects.
- Fine-grained PATs must also be installed on every repository you query. A 401 with correct scopes usually means the token isn't granted to one of the repos in your query.
:::

Results are cached locally, so reusing the same query across tables only fetches data once.

## Quick Start

The directive takes a GitHub search query and renders matching issues as a table. Use `:columns:` to pick which columns to show and `:limit:` to control how many rows (default 25).

::::::{myst:demo}
:::{issue-table} org:jupyter-book is:pr is:open updated:>=2025-11-01 sort:reactions-desc
:columns: title, author, reactions, updated
:limit: 5
:::
::::::

## Available Columns

- `number`, `title`, `author`, `author_affiliation`, `state`
- `labels`, `linked_prs`, `closing_prs`, `sub_issues`, `comments`
- `created`, `updated`, `closed`, `repo`
- `body` — full issue body (headers stripped)
- `description` — project board Description field
- `summary` — extracted section from the issue body (see [Summary Column](#summary-column))
- `reactions` — all reaction types with counts
- Individual reactions: `reactions_thumbsup`, `reactions_thumbsdown`, `reactions_laugh`, `reactions_hooray`, `reactions_confused`, `reactions_heart`, `reactions_rocket`, `reactions_eyes`
- Any project field name (e.g., `Team Priority`, `Status`) when querying a project view

## Sorting

Use GitHub's native `sort:` in your search query for single-column sorting (recommended). See [GitHub's sorting docs](https://docs.github.com/en/search-github/getting-started-with-searching-on-github/sorting-search-results) for supported fields. For multi-column or project-field sorting, use the `:sort:` option.

**Options**: `:sort:` (string) — comma-separated `column-direction` pairs, e.g., `reactions-desc,updated-asc`

::::::{myst:demo}
:::{issue-table} org:jupyter-book is:pr is:open updated:>=2025-11-01 sort:reactions-desc
:columns: title, author, author_affiliation, reactions, updated
:::
::::::

Multi-column sorting with `:sort:`:

::::::{myst:demo}
:::{issue-table} org:jupyter-book is:pr is:open updated:>=2025-11-01 updated:2025-11-01..2025-11-20
:columns: title, author, author_affiliation, reactions, updated
:sort: reactions_thumbsup-desc,updated-desc
:::
::::::

## Date Formatting

Use `:date-format:` to control how `created`, `updated`, and `closed` columns display.

**Options**: `:date-format:` (string) — `relative` (e.g., "2d ago") or `absolute` (default, YYYY-MM-DD)

::::::{myst:demo}
:::{issue-table} org:jupyter-book is:pr is:open updated:>=2025-11-01 updated:2025-11-01..2025-11-20
:columns: title, author, created, updated
:date-format: relative
:limit: 10
:::
::::::

## Truncation

Limit `body`, `description`, and `summary` columns to approximately N characters of visible text. Truncated content appends a "More" link to the full issue. Truncation is applied after Markdown is parsed, so it never produces broken links or formatting.

**Options**: `:body-truncate:` (number), `:summary-truncate:` (number) — summary falls back to body-truncate when not set

::::::{myst:demo}
:::{issue-table} https://github.com/orgs/jupyter-book/projects/1/views/7
:columns: title, body, summary
:limit: 5
:body-truncate: 200
:summary-truncate: 150
:::
::::::

(summary-column)=
## Summary Column

The `summary` column extracts a section from the issue body by searching for headers matching keywords (case-insensitive). It returns that section's content up to the next header. If no matching header is found, it falls back to everything before the first header or horizontal rule.

**Options**: `:summary-header:` (string) — comma-separated keywords to match, default: `summary,context,overview,description,background,user story`

::::::{myst:demo}
:::{issue-table} repo:jupyter-book/jupyter-book is:issue is:open updated:>2025-11-15
:columns: title, author, summary
:summary-header: tldr,abstract,problem
:limit: 5
:::
::::::

## Sub-Issues

Show tracked sub-tasks using GitHub's sub-issue feature. Inline them at the bottom of a specific column, or use a dedicated `sub_issues` column.

**Options**: `:append-sub-issues:` (string) — column name to inline sub-issues into

::::::{myst:demo}
:::{issue-table} repo:jupyter-book/mystmd is:issue 1921
:columns: number, title, updated
:append-sub-issues: title
:limit: 5
:::
::::::

## Project Boards

Pass a GitHub project view URL instead of a search query. The board's own filter acts as the query, and you can use project field names (e.g., `Team Priority`, `Status`) as columns and sort by them.

::::::{myst:demo}
:::{issue-table} https://github.com/orgs/jupyter-book/projects/1/views/7
:columns: title, Team Priority, linked_prs, closing_prs, reactions
:sort: Team Priority-asc, reactions_thumbsup-desc
:::
::::::

## Templates

Add custom columns using `{{field}}` placeholders and include the template name in `:columns:`.

**Options**: `:templates:` (string) — semicolon-separated definitions, e.g., `name=Text with {{field}}; other=More {{data}}`

::::::{myst:demo}
:::{issue-table} repo:jupyter-book/jupyter-book is:issue is:open updated:>2025-11-15
:columns: title, repo, author, issue_link, repo_link, issue_cta
:templates: issue_link=[View issue]({{url}}); repo_link=[Repo home](https://github.com/{{repo}}); issue_cta={button}`Open issue <{{url}}>`
:::
::::::

### Filters

Use `{{ field | filter }}` to transform a value before insertion. This is useful when embedding values in URLs where special characters must be encoded.

**Available filters**: `urlencode` — percent-encodes the value for safe use in URLs

::::::{myst:demo}
:::{issue-table} repo:jupyter-book/jupyter-book is:issue is:open updated:>2025-11-15
:columns: title, author, search_link
:templates: search_link=[Search title](https://github.com/search?q={{ title | urlencode }})
:limit: 5
:::
::::::

## Column Widths

Set column width percentages (one per column). Values are normalized proportionally if they sum to more than 100%.

**Options**: `:widths:` (string) — comma-separated percentages, e.g., `60,20,20`

::::::{myst:demo}
:::{issue-table} org:jupyter-book is:pr is:open updated:>=2025-11-01 sort:reactions-desc
:columns: title, author, reactions
:widths: 60,20,20
:limit: 5
:::
::::::

## All Columns

All available columns for reference:

%not using myst:demo because we can't horizontally scroll
```
:::{issue-table} repo:jupyter-book/jupyter-book is:issue updated:2025-11-15..2025-11-20
:columns: number, title, author, author_affiliation, state, labels, linked_prs, closing_prs, sub_issues, reactions, comments, created, closed, updated, repo, body, summary
:sort: updated-desc
:body-truncate: 100
:summary-truncate: 50
:::
```

:::{issue-table} repo:jupyter-book/jupyter-book is:issue updated:2025-11-15..2025-11-20
:columns: number, title, author, author_affiliation, state, labels, linked_prs, closing_prs, sub_issues, reactions, comments, created, closed, updated, repo, body, summary
:sort: updated-desc
:body-truncate: 100
:summary-truncate: 50
:::
