---
exports:
    - format: typst
      template: https://github.com/myst-templates/plain_typst_book.git
      output: exports/experiment.pdf
      id: pdf_experiment
downloads:
    - id: pdf_experiment
name: Luuk Fröling
---

# Custom admonition called Experiment

You can create an **experiment admonition** by adding an `experiment` directive.

````markdown
```{experiment} Hooke's law
:label: hookes-law-experiment

Some description
```
````

This will render an admonition like:

```{experiment} Hooke's law
:label: hookes-law-experiment

Some description
```