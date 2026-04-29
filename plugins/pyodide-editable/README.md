# Editable Pyodide Cells

`pyodide-editable` adds an editable Python cell directive to MyST sites. Each
cell is rendered in the browser with editor controls and executed with Pyodide,
so examples can run without a separate Jupyter server.

## Usage

Add the plugin to `myst.yml`:

```yaml
project:
  plugins:
    - plugins/pyodide-editable/pyodide-editable.mjs
```

Then add a cell to a page:

````markdown
```{pyodide}
print("Hello from Pyodide")
```
````

The longer directive form supports an optional stable id:

````markdown
:::{pyodide-cell}
:id: pandas-demo

import pandas as pd
df = pd.DataFrame({"x": [1, 2, 3]})
print(df)
:::
````

## Notes

The plugin uses an anywidget renderer for the browser UI. It bundles the local
Pyodide runner/transform helpers and loads Pyodide from jsDelivr. The first
execution can take a few seconds while Pyodide and common scientific packages
load.
