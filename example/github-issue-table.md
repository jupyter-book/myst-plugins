# GitHub Issue Table

Renders GitHub issues and PRs as tables from search queries or GitHub URLs.

## Usage

Add to your `myst.yml`:

```yaml
project:
  plugins:
    - https://raw.githubusercontent.com/jupyter-book/myst-plugins/main/plugins/github-issue-table/src/index.mjs
```

Set the `GITHUB_TOKEN` environment variable for authentication:

```bash
export GITHUB_TOKEN=your_token_here
```

## Open PRs in the Jupyter Book organization

Sorted by reactions (descending), then by update date (descending):

::::::{myst-demo}
:::{issue-table} org:jupyter-book is:pr is:open updated:>=2025-11-01 updated:2025-11-01..2025-11-20
:columns: linked_title, author, author_affiliation, reactions, updated
:sort: reactions-desc,updated-desc
:::
::::::

## Jupyter Book Team Issues with Linked PRs

Shows issues with linked PRs, styled labels, and reactions:

::::::{myst-demo}
:::{issue-table} repo:jupyter-book/jupyter-book is:issue is:open updated:2025-11-01..2025-11-20
:columns: linked_title, linked_prs, labels, reactions
:sort: reactions-desc
:::
::::::

## GitHub Project Board

Show issues from a specific GitHub project, sorted by team priority then by reactions:

::::::{myst-demo}
:::{issue-table} https://github.com/orgs/jupyter-book/projects/1
:columns: linked_title, Team Priority, linked_prs, reactions
:sort: Team Priority-desc,reactions-desc
:::
::::::

You can include custom project columns by using the field name (e.g., `Status`, `Team Priority`, etc.) and sort by them.

## Organization-wide Issues

Show issues across the Jupyter Book organization with linked PRs:

::::::{myst-demo}
:::{issue-table} org:jupyter-book is:issue is:open updated:>=2025-11-01
:columns: linked_title, author_affiliation, linked_prs, labels, reactions
:sort: updated-desc
:::
::::::

## All Available Columns

This example shows all possible columns for recently updated issues:

::::::{myst-demo}
:::{issue-table} repo:jupyter-book/jupyter-book is:issue is:open updated:>2024-11-15
:columns: number, linked_title, author, author_affiliation, state, labels, linked_prs, reactions, comments, created, updated
:sort: updated-desc
:::
::::::

**Available columns**: `number`, `title`, `linked_title`, `author`, `author_affiliation`, `state`, `labels`, `linked_prs`, `reactions`, `comments`, `created`, `updated`

**Sorting**: Use `:sort:` with `column-direction` format (e.g., `reactions-desc`). Multiple columns can be specified separated by commas for left-to-right priority (e.g., `reactions-desc,updated-desc`).

**Note**: Set `GITHUB_TOKEN` environment variable to use this plugin.

The same query is reused across tables, so data is only fetched once and cached locally.
