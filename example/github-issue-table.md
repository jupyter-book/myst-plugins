# GitHub Issue Table

Renders GitHub issues and PRs as tables from search queries or GitHub URLs.

## Usage

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

**Available columns**: `number`, `title`, `author`, `author_affiliation`, `state`, `labels`, `linked_prs`, `reactions`, `comments`, `created`, `updated`, `repo`, `body`, plus any project fields (e.g., `Team Priority`, `Status`) when using a project view

**Sorting**: Use `:sort:` with `column-direction` format (e.g., `reactions-desc`). Multiple columns can be specified separated by commas for left-to-right priority (e.g., `reactions-desc,updated-desc`).

**Limit**: By default, tables fetch and show 25 items from the GitHub API. Use `:limit:` to fetch more (e.g., `:limit: 50`) or fewer results. This reduces API calls and helps avoid rate limits.

**Templates**: Use `:templates:` to add custom columns with `{{field}}` placeholders, and include the template name in `:columns:`. Most core columns (title, number, author, author_affiliation, repo) auto-link.

**Note**: Set `GITHUB_TOKEN` environment variable to use this plugin.

The same query is reused across tables, so data is only fetched once and cached locally.


## Open PRs in the Jupyter Book organization

Sorted by reactions (descending), then by update date (descending):

::::::{myst:demo}
:::{issue-table} org:jupyter-book is:pr is:open updated:>=2025-11-01 updated:2025-11-01..2025-11-20
:columns: title, author, author_affiliation, reactions, updated
:sort: reactions-desc,updated-desc
:::
::::::

## Jupyter Book Team Issues with Linked PRs

Shows issues with linked PRs, styled labels, and reactions:

::::::{myst:demo}
:::{issue-table} repo:jupyter-book/jupyter-book is:issue is:open updated:2025-11-01..2025-11-20
:columns: title, linked_prs, labels, reactions
:sort: reactions-desc
:::
::::::

## GitHub Project Board

Show issues from a specific GitHub project view (Team Priorities).
In this case, the board's own filter acts as our filter, there is no extra "search query" for project boards.

::::::{myst:demo}
:::{issue-table} https://github.com/orgs/jupyter-book/projects/1/views/7
:columns: title, Team Priority, linked_prs, reactions
:sort: Team Priority-asc, reactions-desc
:::
::::::

You can include custom project columns by using the field name (e.g., `Status`, `Team Priority`, etc.) and sort by them.

## Template columns

Add bespoke columns that pull from other fields using `{{field}}` placeholders:

::::::{myst:demo}
:::{issue-table} repo:jupyter-book/jupyter-book is:issue is:open updated:>2025-11-15
:columns: title, repo, author, issue_link, repo_link, issue_cta
:templates: issue_link=[View issue]({{url}}); repo_link=[Repo home](https://github.com/{{repo}}); issue_cta={button}`Open issue <{{url}}>`
:::
::::::

## Issue Body with MyST Parsing

The `body` column parses issue bodies as MyST markdown (stripping header lines first) and supports truncation:

::::::{myst:demo}
:::{issue-table} repo:jupyter-book/jupyter-book is:issue is:open updated:>2025-11-15
:columns: title, author, body
:body-truncate: 200
:limit: 5
:::
::::::

The body column will:
- Strip out any header lines (lines starting with `#`)
- Parse the remaining content as MyST markdown (preserving links, formatting, etc.)
- Truncate to the specified character length if `:body-truncate:` is set

## All Available Columns

This example shows all possible columns for recently updated issues:

::::::{myst:demo}
:::{issue-table} repo:jupyter-book/jupyter-book is:issue is:open updated:>2025-11-15
:columns: number, title, author, author_affiliation, state, labels, linked_prs, reactions, comments, created, updated, repo, body
:sort: updated-desc
:::
::::::
