---
exports:
    - format: typst
      template: https://github.com/myst-templates/plain_typst_book.git
      output: exports/intermezzo.pdf
      id: pdf_intermezzo
downloads:
    - id: pdf_intermezzo
name: Luuk Fröling
---

# Intermezzo

You can create an **intermezzo admonition** by adding an `intermezzo` directive.

````markdown
```{intermezzo} Hooke's law intermezzo
:label: hookes-law-intermezzo

Some description
```
````

This will render an admonition like:

```{intermezzo} Hooke's law intermezzo
:label: hookes-law-intermezzo

Some description
```