# Search Filter

Add a simple search bar to your MyST content that filters and subsets items on the page.

> **Warning, this is kind of hacky!**: It "breaks out of the shadow DOM" for anywidgets which is **not recommended**.
> The filter works by setting `style.display` on matched DOM elements.
> This works well for static MyST content (cards, lists, tables), but if React re-renders an element after the filter has hidden it, the inline style will be reset.

## Usage

Add the plugin to your `myst.yml` file:

```yaml
project:
  plugins:
    - https://github.com/jupyter-book/myst-plugins/raw/refs/heads/main/plugins/searchfilter/searchfilter.mjs
```

Then add a `{searchfilter}` directive with a CSS selector argument to select the items you'd like to search and filter. For example:

````{myst:demo}
```{searchfilter} .example-list li
```

:::{div}
:class: example-list
- One
- Two
- Three
:::
````

This creates a search bar on the page. It uses the CSS selector to match elements, then hides any whose `textContent` doesn't contain the search query (case-insensitive).

Search queries are automatically saved in the page URL as a `?searchfilter=` query parameter, so filtered views can be shared via link.

## Architecture

This is an [anywidget plugin](https://mystmd.org/guide/widgets) - it defines two kinds of things in a single file, so that we don't have to publish two artifacts with our github releases:

- **Directive** - defines the `{searchfilter}` directive and returns an `anywidget` AST node.
- **Widget** - defines the `render` function that creates the search UI and handles filtering (this is what :esm: points to).

The logic computes the _path to itself_ when defining `:esm:` which seems to work, but is also definitely hacky.
