---
title: Editable Pyodide Cells
---

```{include} ../plugins/pyodide-editable/README.md
:start-line: 2
```

This page demonstrates two richer examples using Pyodide: a `pandas` data example and a `matplotlib` plot. Both the container `pyodide-cell` form and the fenced directive form are shown.

## Pandas example

```{pyodide}
import pandas as pd

data = {
    "City":        ["Delhi", "Mumbai", "Bengaluru", "Chennai"],
    "Population":  [32.9, 20.7, 13.2, 10.9],   # millions
    "Area_km2":    [1484, 603, 741, 426],
}

df = pd.DataFrame(data)
df["Density"] = (df["Population"] * 1e6 / df["Area_km2"]).round(0)
print(df.to_string(index=False))
print(f"\nMost dense: {df.loc[df.Density.idxmax(), 'City']}")
```

---

## Matplotlib plot

:::{pyodide-cell}
:id: matplotlib-demo

import numpy as np
import matplotlib.pyplot as plt

t = np.linspace(0, 4 * np.pi, 400)

fig, axes = plt.subplots(1, 2, figsize=(9, 3.5))

axes[0].plot(t, np.sin(t), color='steelblue', lw=2, label='sin(t)')
axes[0].plot(t, np.cos(t), color='tomato',    lw=2, label='cos(t)')
axes[0].set_title('Trigonometric functions')
axes[0].legend()
axes[0].grid(alpha=0.3)

axes[1].plot(t, np.exp(-0.2 * t) * np.sin(t * 3),
             color='seagreen', lw=2, label='damped oscillation')
axes[1].set_title('Damped oscillation')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
plt.show()
:::

