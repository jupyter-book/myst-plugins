---
exports:
    - format: typst
      template: https://github.com/myst-templates/plain_typst_book.git
      output: exports/iframe-to-thumbnail.pdf
      id: iframe-to-thumbnail
downloads:
    - id: iframe-to-thumbnail
updated: October 9, 2025
name: Luuk Fröling
---

# iframe-to-thumbnail pdf

This plugin will replace every iframe directive with the youtube thumbnail for PDF builds. 

```{iframe} https://www.youtube.com/embed/seKOq-VMJgY?si=NjrDJRkoPczQbznv
Overview of Jupyter Book
```

:::{note}
To see the results of this plugin, enable the plugin in the myst.yml file and remove the iframe-to-qr plugin. 
:::