# Hypothesis

Hypothesis is a annotation platform that allows visitors to leave private and public annotations on the pages.

This plugin enables hypothesis, either per page using the hypothesis.mjs plugin:

````markdown
```{anywidget} hypothesis.mjs
```
````

or by including hypothesis_global.mjs, which slots in hypotesis at every page. You can disable hypothesis by including `no-hypothesis: True` in your frontmatter.
