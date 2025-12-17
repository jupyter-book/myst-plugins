---
exports:
    - format: typst
      template: https://github.com/myst-templates/plain_typst_book.git
      output: exports/exercise.pdf
      id: pdf_exercise
downloads:
    - id: pdf_exercise
name: Luuk Fröling
---

# exercise admonition pdf

This plugin allows exercises and solutions to be included in PDF builds. 

```{exercise} Basic calculation
:label: exc_basic-calculation

2 + 3 =?
```

```{solution} exc_basic-calculation

The answer is 5.
```