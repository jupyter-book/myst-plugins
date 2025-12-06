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

**Available columns**: `number`, `title`, `author`, `author_affiliation`, `state`, `labels`, `linked_prs`, `closing_prs` (PRs that will close the issue), `sub_issues` (tracked sub-issues), `reactions` (shows all reaction types with counts), `comments`, `created`, `updated`, `closed`, `repo`, `body`, `summary`, plus individual reaction types: `reactions_thumbsup` (👍), `reactions_thumbsdown` (👎), `reactions_laugh` (😄), `reactions_hooray` (🎉), `reactions_confused` (😕), `reactions_heart` (❤️), `reactions_rocket` (🚀), `reactions_eyes` (👀), and any project fields (e.g., `Team Priority`, `Status`) when using a project view

**Sorting**: Two approaches available:
- **Recommended:** Use GitHub's native `sort:` in your query (e.g., `org:jupyter-book is:issue sort:reactions-desc`). Supported fields: `reactions`, `interactions`, `comments`, `created`, `updated`. See [GitHub's sorting docs](https://docs.github.com/en/search-github/getting-started-with-searching-on-github/sorting-search-results).
- **Advanced:** Use `:sort:` option for multi-column sorting (e.g., `:sort: reactions-desc,updated-desc`) or project fields (e.g., `:sort: Team Priority-asc`).

**Limit**: By default, tables fetch and show 25 items from the GitHub API. Use `:limit:` to fetch more (e.g., `:limit: 50`) or fewer results. This reduces API calls and helps avoid rate limits.

**Date format**: Use `:date-format:` to control how dates in `created`, `updated`, and `closed` columns are displayed. Options: `relative` (e.g., "2d ago"), `absolute` (default, YYYY-MM-DD), or a custom strftime pattern.

**Body truncation**: Use `:body-truncate:` to limit the character length of the `body` column (e.g., `:body-truncate: 200`). This also applies to the `summary` column when using the fallback extraction mode.

**Summary column**: Use the `summary` column to extract intelligent summaries from issue bodies. By default, it searches for headers containing "summary", "context", "overview", "description", "background", or "user story" (case-insensitive) and extracts that section's content up to the next header. If no matching header is found, it extracts everything before the first header or horizontal rule. Use `:summary-header:` to customize the keywords (e.g., `:summary-header: tldr,abstract`).

**Templates**: Use `:templates:` to add custom columns with `{{field}}` placeholders, and include the template name in `:columns:`. Most core columns (title, number, author, author_affiliation, repo) auto-link.

**Note**: Set `GITHUB_TOKEN` environment variable to use this plugin.

The same query is reused across tables, so data is only fetched once and cached locally.


## Open PRs in the Jupyter Book organization

Using GitHub's native sort (recommended for single-column sorting):

::::::{myst:demo}
:::{issue-table} org:jupyter-book is:pr is:open updated:>=2025-11-01 sort:reactions-desc
:columns: title, author, author_affiliation, reactions, updated
:::
::::::

Show individual reaction types:

::::::{myst:demo}
:::{issue-table} org:jupyter-book is:pr is:open updated:>=2025-11-01 sort:reactions-desc
:columns: title, reactions_thumbsup, reactions_heart, reactions_rocket
:limit: 10
:::
::::::

Or use `:sort:` option for multi-column sorting:

::::::{myst:demo}
:::{issue-table} org:jupyter-book is:pr is:open updated:>=2025-11-01 updated:2025-11-01..2025-11-20
:columns: title, author, author_affiliation, reactions, updated
:sort: reactions_thumbsup-desc,updated-desc
:::
::::::

## Date Formatting

Use `:date-format:` to show relative dates (e.g., "2d ago") instead of absolute dates:

::::::{myst:demo}
:::{issue-table} org:jupyter-book is:pr is:open updated:>=2025-11-01 updated:2025-11-01..2025-11-20
:columns: title, author, created, updated
:date-format: relative
:limit: 10
:::
::::::

## Jupyter Book Issues (Closed + Closing PRs)

Shows recently updated issues (open or closed) so you can see closed items alongside any closing PRs:

::::::{myst:demo}
:::{issue-table} repo:jupyter-book/jupyter-book is:issue updated:2025-11-25..2025-12-05 sort:updated-desc
:columns: title, linked_prs, closing_prs, labels, reactions
:limit: 10
:::
::::::

## Sub-Issues Column

Show issues with their tracked sub-tasks using GitHub's native sub-issue feature.

### Option 1: Separate column

The `sub_issues` column displays a dropdown with each sub-issue's state, number, and last update:

::::::{myst:demo}
:::{issue-table} repo:jupyter-book/mystmd is:issue 1026
:columns: number, title, sub_issues, updated
:::
::::::

### Option 2: Integrated with title

Use `title_with_sub_issues` to embed the sub-issues dropdown directly below the title (more compact):

::::::{myst:demo}
:::{issue-table} repo:jupyter-book/mystmd is:issue 189
:columns: number, title_with_sub_issues, updated
:::
::::::

## GitHub Project Board

Show issues from a specific GitHub project view (Team Priorities).
In this case, the board's own filter acts as our filter, there is no extra "search query" for project boards.

::::::{myst:demo}
:::{issue-table} https://github.com/orgs/jupyter-book/projects/1/views/7
:columns: title, Team Priority, linked_prs, closing_prs, reactions
:sort: Team Priority-asc, reactions_thumbsup-desc
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

## Issue Summary Column

The `summary` column intelligently extracts summaries from issue bodies:

::::::{myst:demo}
:::{issue-table} https://github.com/orgs/jupyter-book/projects/1/views/7
:columns: title, author, summary
:limit: 5
:::
::::::

The summary column will:
- Search for headers containing "summary", "context", "overview", "description", "background", or "user story" (case-insensitive)
- Extract the content under that header up to the next header
- If no matching header is found, extract everything before the first header or horizontal rule
- Parse the extracted content as MyST markdown

You can customize the keywords to search for:

::::::{myst:demo}
:::{issue-table} repo:jupyter-book/jupyter-book is:issue is:open updated:>2025-11-15
:columns: title, author, summary
:summary-header: tldr,abstract,problem
:limit: 5
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

%not using myst:demo because we can't horizontally scroll
```
:::{issue-table} repo:jupyter-book/jupyter-book is:issue updated:2025-11-15..2025-11-20
:columns: number, title, author, author_affiliation, state, labels, linked_prs, closing_prs, sub_issues, reactions, comments, created, closed, updated, repo, body
:sort: updated-desc
:::
```

:::{issue-table} repo:jupyter-book/jupyter-book is:issue updated:2025-11-15..2025-11-20
:columns: number, title, author, author_affiliation, state, labels, linked_prs, closing_prs, sub_issues, reactions, comments, created, closed, updated, repo, body
:sort: updated-desc
:format-date: relative
:::
