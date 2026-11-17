---
title: myst-annotate
no-hypothesis: true
---

```{include} ../plugins/myst-annotate/README.md
:start-line: 2
```

## Try it

This page embeds the widget with the `anywidget` directive, so only this page has it:

````markdown
```{anywidget} ../plugins/myst-annotate/myst-annotate-widget.js
```
````

```{anywidget} ../plugins/myst-annotate/myst-annotate-widget.js
```

Select some of the text below and pick a colour, or choose **Annotate** and write a note. Click a highlight to recolour, annotate or copy it, and open the sidebar with the tab on the right edge of the window (or **Alt/⌥+Shift+A**). Your highlights and notes are saved in this browser only.

Euler's identity, $e^{i\pi} + 1 = 0$, links five fundamental constants of mathematics: $0$, $1$, $e$, $i$ and $\pi$. Try annotating it with a note that contains math of its own, such as $$\sum_{n=0}^{\infty} \frac{x^n}{n!} = e^x.$$

The quick brown fox jumps over the lazy dog. Highlight a few words here in one colour, then highlight part of the same text in another colour to see how layers stack, with the newest on top.

Hypothesis is turned off on this page (`no-hypothesis: true`), because this site enables it everywhere else.
