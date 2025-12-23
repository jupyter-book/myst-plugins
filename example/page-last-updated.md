---
title: page last updated
name: Freek Pols
---

This plugin uses the gitlog to slot in the latest update date per page in the frontmatter, making it easy to see when a page was last modified.

It requires to make a small change to your GH action workflow to ensure the git history is available when the site is built:
```yaml
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:               # new part
          fetch-depth: 0
```

Note that you can't turn the plugin off for specific pages, it will always update the `updated` field in the frontmatter of all pages. If you want to only set specific dates and you don't mind doing it manually, check [this plugin](update-date.md) instead.