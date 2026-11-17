# myst-annotate

Private, local highlighting and annotation for MyST sites, in the spirit of Hypothesis but without accounts, servers or social features: readers highlight text in five colours, add Markdown + math notes, and copy text, and everything stays in their own browser.

These files are built copies of [myst-annotate](https://github.com/gradill22/myst-annotate) v0.2.1, also published on npm as [`myst-annotate`](https://www.npmjs.com/package/myst-annotate). The source, tests and issue tracker live in that repository.

## What readers can do

- **Highlight:** select text and pick a colour. Highlights can overlap; the newest is drawn on top.
- **Annotate:** select text (or click a highlight) and choose **Annotate**. Notes support Markdown and LaTeX math (`$…$`, `$$…$$`).
- **Copy:** copy selected text, a highlight, or the text a note is attached to.
- **Sidebar:** annotations, highlights, page notes and orphaned notes, for this page or the whole book, with search and a show/hide switch.

Data is kept in the reader's browser (`localStorage`). Marks are drawn with the CSS Custom Highlight API, so the page's HTML is never modified.

## Usage

**On every page:** list the plugin in `myst.yml`.

```yaml
project:
  plugins:
    - https://github.com/gradill22/myst-annotate/releases/download/v0.2.1/myst-annotate.mjs
```

**On chosen pages only:** leave it out of `project.plugins` and embed the widget on each page:

````markdown
```{anywidget} https://github.com/gradill22/myst-annotate/releases/download/v0.2.1/myst-annotate-widget.js
```
````

MyST downloads either file at build time and copies what readers need into the site, so readers' browsers never contact GitHub. A local copy works too: point `project.plugins` at `myst-annotate.mjs`, or the directive at `myst-annotate-widget.js`, by path. When loaded from a local path, the plugin writes its widget next to itself as `myst-annotate-widget-<hash>.js` on the first build.

## Requirements

A browser with the CSS Custom Highlight API: Chrome/Edge 105+, Safari 17.2+, Firefox 140+. In older browsers the plugin does nothing and logs a console warning.

## License

MIT. The license text is in the `LICENSE` file next to this README.
