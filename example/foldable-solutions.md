# Foldable solutions

A [mystmd](mystmd.org) plugin enabling foldable reference solutions
(and notes for instructors) in a course web site.

## Use case

You are authoring course notes using MyST markdown / Jupyter, and
publishing it as a MyST website. You want to include the reference
solutions and notes for instructors directly in the course material to keep
things close together. You also want your students to be able to
freely access solutions, but not see them by default. Similarly, you
want your instructors to easily access notes for instructors.

## Proposed solution

1. Mark up the solutions with lines containing `BEGIN` `SOLUTION` and
   `END` `SOLUTION` markers. This follows nbgrader's convention; upon
   request, it would be easy to make it configurable to support other
   markers.

2. Mark up the notes for instructors in admonitions bearing titles of
   your choice (e.g. "Notes for instructors").

3. Create or update a file `footer.md`, typically at the root of your
   course directory, with the following content; uncomment and update
   any of the configurables, e.g. for internationalization. Default
   values are provided for English:

   ```` markown
   ```{anywidget} https://github.com/jupyter-book/myst-plugins/raw/refs/heads/main/plugins/foldable-solutions/foldable-solutions.mjs
   {
     // label and tooltip for the solution slider
     // "solutionsSliderLabel": "Solutions",
     // "solutionsSliderTooltip": "Cliquer pour afficher les solutions de référence pour tous les exercices",
     
     // label and tooltip for the notes for instructors slider
     // "solutionsTitle": "Solution",
     // "solutionsDisplayedTitle": "consultée",
     
     // label and tooltip for notes for instructors
     // "notesSliderLabel": "Notes enseignants",
     // "notesSliderTooltip": "Cliquer pour afficher les notes pour les enseignants",
     
     // Which admonitions should be considered as notes for instructor?
     // Currently this is defined by a list of admonition titles
     // "notesTitles": ["Note aux enseignants", "Notes aux enseignants", "À faire"],
   }
   ```
   ````

4. Include these in your myst.yml file,

   ```
   site:
     options:
       style: ./modules/foldable-solutions.css
   parts:
     footer: footer.md
   ```

You then get a web site where solutions and notes for instructors are
hidden by default. You can click on a solution to unfold it. Or use
the sliders in the top toolbar to unfold solutions and notes for instructors.

## Examples

:::{admonition} Exercise 1

What is the color of the white horse of Henri IV?

BEGIN SOLUTION

White!

END SOLUTION

:::

Here is a code cell with an embedded solution:

```{code-cell}
/** Distance de deux points sur une droite
 * @param a un entier: la coordonnée du premier point
 * @param b un entier: la coordonnée du deuxième point
 * @return la valeur absolue de la différence entre a et b
 **/
int distance(int a, int b) {
    /// BEGIN SOLUTION
    return abs(b - a);
    /// END SOLUTION
}
```

:::{admonition} Notes for instructors
These are some notes for instructors. They are folded by default.
:::

:::{admonition} Exercise 2

Write the first line of a simple `for` loop in Python

BEGIN SOLUTION

Here is an example :

```
for i in range(5):
```

END SOLUTION

:::

:::{admonition} Notes for instructors
Here are some more notes for instructors.
:::
