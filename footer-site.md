```{footer}
title: MyST Plugins
description: Community-driven plugins for MyST Markdown and Jupyter Book.
logo: https://raw.githubusercontent.com/jupyter-book/myst-theme/refs/heads/main/docs/_static/myst-logo-light.svg

links:
  Plugins:
    - Browse Plugins: /readme
    - GitHub Plugins: /github-plugins
    - PDF Export: /iframe-to-qr
    - Custom Admonitions: /experiment
  Resources:
    - MyST Documentation: https://mystmd.org
    - Jupyter Book: https://jupyterbook.org
    - Widget Docs: https://mystmd.org/guide/widgets
    - Plugin Guide: https://mystmd.org/guide/plugins

icons:
  github: https://github.com/jupyter-book/myst-plugins
  discord: https://discord.mystmd.org

copyright: © 2026 Jupyter Book. Built with MyST.
```

% This is a hack to inject the foldable-solutions javascript in all pages
```{anywidget} ./plugins/foldable-solutions/foldable-solutions.mjs
{
  "notesTitles": ["Notes for instructors"],
}
```
