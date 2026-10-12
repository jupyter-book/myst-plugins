---
title: Search filter
---
```{include} ../plugins/searchfilter/README.md
:start-line: 2
```

## Examples

Here are a few examples of how you can filter various kinds of items by providing different values for the CSS selector argument.

### Cards

Use `.myst-card` to filter cards by their content.

:::::{myst:demo}
```{searchfilter} .myst-card
```

::::{grid} 3
:::{card} Pandas
A data analysis library for Python.
:::

:::{card} NumPy
Fundamental package for scientific computing with Python.
:::

:::{card} Matplotlib
A plotting library for Python.
:::
::::
:::::

### List items

Use `li` to filter items in a list, and a `div` to filter multiple lists on a page.

:::::{myst:demo}
```{searchfilter} .example-list li
```

:::{div}
:class: example-list
- **Python** - General-purpose programming language
- **Julia** - High-performance scientific computing
- **R** - Statistical computing and graphics
:::
:::::

### Table rows

Use `tr` to filter rows of a table, and `:not(first-child)` to de-select the first row (e.g. title row).

:::::{myst:demo}
```{searchfilter} .example-table tr:not(:first-child)
```

:::{div}
:class: example-table

| Package | Language | Description |
|---|---|---|
| pandas | Python | Data analysis and manipulation |
| NumPy | Python | Numerical computing |
| SciPy | Python | Scientific computing |

:::
:::::

### Restrict to certain content

To restrict your `{searchfilter}` to only elements in the content area, use a parent selector and your own CSS class. For example:

This restricts the search to those within a custom div you define:

::::{myst:demo}
```{searchfilter} .myclass li
```
+++ {"class": "myclass"}
- One
- Two
- Three
:::::

This uses [inline directive options](https://mystmd.org/guide/inline-options) to let you attach a class to the directive output:

::::{myst:demo}
```{searchfilter} .myclass tr
```
```{list-table .myclass}
- - One
- - Two
- - Three
```
::::

### Do not do this

If you select a generic item on the page, then the searchfilter will remove stuff you don't want to remove!
For example:

:::::{myst:demo}
This will select all `li` items on the page (including menu items etc)

```{searchfilter} li
```
- One
- Two
- Three
:::::