---
exports:
    - format: typst
      template: https://github.com/myst-templates/plain_typst_book.git
      output: exports/example.pdf
      id: pdf_example
downloads:
    - id: pdf_example
name: Luuk Fröling
---

# Example

You can create an **example admonition** by adding an `example` directive.

````markdown
```{example} Hooke's law example
:label: hookes-law-example

Some description here.
```
````

This will render an admonition like:

```{example} Hooke's law example
:label: hookes-law-example

Some description here.
```
