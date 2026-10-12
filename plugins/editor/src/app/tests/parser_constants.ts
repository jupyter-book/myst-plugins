export const EXAMPLE_1 = String.raw`
# Setting up global equations directly
Now that you've seen the final matrix formulation, let's set up a procedure to find it directly!

::::::{topic} Learning objective
You'll look into how to setup the global formulation directly
::::::

We'll do that for the same structure as before:

\`\`\`{figure} extension2fields.svg
:name: extension2fields2
:align: center

Extension bar with nodal load
\`\`\`

## 1. Identify degrees of freedom
The nodal displacement are the degrees of freedom. Let's define all of them, even though some seem to be fixed:

\`\`\`{figure} assembly1.svg
:name: assembly1
:align: center
\`\`\`

## 2. Initialize the system with zeros
As the amount of degrees of freedom is known, the size of our global matrices and vectors are defined and they can be initialized with zeros:

$$
      \begin{bmatrix}
	0 & 0 & 0\\[12pt]
	0 & 0 & 0\\[12pt]
	0 & 0 & 0\\
      \end{bmatrix}
      \begin{bmatrix}
	u_1\\[12pt]u_2\\[12pt]u_3
      \end{bmatrix}
      =
      \begin{bmatrix}
	0\\[12pt]0\\[12pt]0
      \end{bmatrix}
      $$

## 3. Assemble stiffness, element by element
Now let's add the local stiffness matrices element by element. We can use the default stiffness matrix $\cfrac{EA}{\ell}\begin{bmatrix} 1&-1\\-1&1 \end{bmatrix}$ and places its parts in the global stiffness matrix where the index of the displacement (columns) and forces (rows) match.

### Element $(1)$
The first element links the first and second nodal displacement with the first and second nodal forces:

\`\`\`{figure} assembly2.svg
:name: assembly2
:align: center
\`\`\`
$$
      \begin{bmatrix}
	\cA{\cfrac{EA_1}{\ell_1}} & \cA{-\cfrac{EA_1}{\ell_1}} & 0\\[12pt]
	\cA{-\cfrac{EA_1}{\ell_1}} & \cA{\cfrac{EA_1}{\ell_1}} & 0\\[12pt]
	0 & 0 & 0\\
      \end{bmatrix}
      \begin{bmatrix}
	u_1\\[12pt]u_2\\[12pt]u_3
      \end{bmatrix}
      =
      \begin{bmatrix}
	0\\[12pt]0\\[12pt]0\\
      \end{bmatrix}
      $$

### Element $(2)$
Now let's add the second element, linking the second and third nodal displacements with the second and third nodal forces:

\`\`\`{figure} assembly3.svg
:name: assembly3
:align: center
\`\`\`

$$
      \begin{bmatrix}
	\cA{\cfrac{EA_1}{\ell_1}} & \cA{-\cfrac{EA_1}{\ell_1}} & 0\\
	\cA{-\cfrac{EA_1}{\ell_1}} & \cA{\cfrac{EA_1}{\ell_1}} + \cB{\cfrac{EA_2}{\ell_2}} & \cB{-\cfrac{EA_2}{\ell_2}}\\
	0 & \cB{-\cfrac{EA_2}{\ell_2}} & \cB{\cfrac{EA_2}{\ell_2}}\\
      \end{bmatrix}
      \begin{bmatrix}
	u_1\\[12pt]u_2\\[12pt]u_3
      \end{bmatrix}
      =
      \begin{bmatrix}
	0\\[12pt]0\\[12pt]0
      \end{bmatrix}
      $$

## 4. Apply external loads
Now, the external loads can be applied. These external loads are called Neumann boundary conditions. These act directly on our nodes, so can be directly added to the global force vector. The sign of the forces to be added aligns with the positive direction of the nodal displacements.

\`\`\`{figure} assembly4.svg
:name: assembly4
:align: center
\`\`\`

$$
      \begin{bmatrix}
	\cA{\cfrac{EA_1}{\ell_1}} & \cA{-\cfrac{EA_1}{\ell_1}} & 0\\
	\cA{-\cfrac{EA_1}{\ell_1}} & \cA{\cfrac{EA_1}{\ell_1}} + \cB{\cfrac{EA_2}{\ell_2}} & \cB{-\cfrac{EA_2}{\ell_2}}\\
	0 & \cB{-\cfrac{EA_2}{\ell_2}} & \cB{\cfrac{EA_2}{\ell_2}}\\
      \end{bmatrix}
      \begin{bmatrix}
	u_1\\[12pt]u_2\\[12pt]u_3
      \end{bmatrix}
      =
      \begin{bmatrix}
	0\\[12pt]0\\[12pt]F
      \end{bmatrix}
      $$

## 5. Apply prescribed displacements
Now, the external loads can be applied. These external loads are called Neumann boundary conditions. These act directly on our nodes, so can be directly added to the global force vector. The sign of the forces to be added aligns with the positive direction of the nodal displacements.

The Neumann boundary condition causes a prescribed displacement $u_1 = 0$

\`\`\`{figure} assembly5.svg
:name: assembly5_1
:align: center
\`\`\`

$$
      \begin{bmatrix}
	\cA{\cfrac{EA_1}{\ell_1}} & \cA{-\cfrac{EA_1}{\ell_1}} & 0\\
	\cA{-\cfrac{EA_1}{\ell_1}} & \cA{\cfrac{EA_1}{\ell_1}} + \cB{\cfrac{EA_2}{\ell_2}} & \cB{-\cfrac{EA_2}{\ell_2}}\\
	0 & \cB{-\cfrac{EA_2}{\ell_2}} & \cB{\cfrac{EA_2}{\ell_2}}\\
      \end{bmatrix}
      \begin{bmatrix}
	0\\[12pt]u_2\\[12pt]u_3
      \end{bmatrix}
      =
      \begin{bmatrix}
	0\\[12pt]0\\[12pt]F
      \end{bmatrix}
      $$

However, it also adds a force:

\`\`\`{figure} assembly5_2.svg
:name: assembly52
:align: center
\`\`\`

$$
      \begin{bmatrix}
	\cA{\cfrac{EA_1}{\ell_1}} & \cA{-\cfrac{EA_1}{\ell_1}} & 0\\
	\cA{-\cfrac{EA_1}{\ell_1}} & \cA{\cfrac{EA_1}{\ell_1}} + \cB{\cfrac{EA_2}{\ell_2}} & \cB{-\cfrac{EA_2}{\ell_2}}\\
	0 & \cB{-\cfrac{EA_2}{\ell_2}} & \cB{\cfrac{EA_2}{\ell_2}}\\
      \end{bmatrix}
      \begin{bmatrix}
	0\\[12pt]u_2\\[12pt]u_3
      \end{bmatrix}
      =
      \begin{bmatrix}
	H\\[12pt]0\\[12pt]F
      \end{bmatrix}
      $$

## 6. Solve for the unknown nodal displacements
Finally, we can solve for the unknown nodal displacements. For now, we can solve this system by only taking into account the second and third row:

$$
\begin{bmatrix}
	    \cA{\displaystyle\cfrac{EA_1}{\ell_1}} + \cB{\displaystyle\cfrac{EA_2}{\ell_2}} & \cB{-\displaystyle\cfrac{EA_2}{\ell_2}}\\
	    \cB{-\displaystyle\cfrac{EA_2}{\ell_2}} & \cB{\displaystyle\cfrac{EA_2}{\ell_2}}\\
	  \end{bmatrix}
	  \begin{bmatrix}
	    u_2\\[14pt]u_3
	  \end{bmatrix}
	  =
	  \begin{bmatrix}
	    0\\[14pt]F
	  \end{bmatrix}
$$

This results in:
- $ u_2 = \displaystyle\cfrac{F\ell_1}{EA_1}$
- $u_3 = \displaystyle\cfrac{F\left(EA_1\ell_2 + EA_2\ell_1\right)}{EA_1\,EA_2}$

Later on, we'll introduce another way of solving the system of equations which allows for nonzero Dirichlet boundary conditions.`.replaceAll(
    "\\`",
    "`",
);

export const EXAMPLE_2 = `
(exercise_1)=
# Exercise 1: First file edit

Let's start with the most basic edit: add some text to a file and see that the website is updated.

::::::{topic} Exercise objective
Can you add some content to the intro page?
::::::

1. Go to the the file \`book/intro.md\` on your GitHub repository (\`https://github.com/<your_username>/<your_repo_name>\`) - {octicon}\`code;1em\` \`Code\` - \`Book\` - \`intro.md\` - {octicon}\`pencil;1em\` \`Edit this file\`
2. Add some text. Feeling brave? Have a look at the [MyST cheat sheet](https://jupyterbook.org/en/stable/reference/cheatsheet.html). Don't worry if that feels daunting, there will be exercises on this!
3. Click \`Commit changes\`
4. Add a message and description of your change. With this \`commit\` you save your changes to the git-timeline. Any commit can always be reverted. Therefore, it's useful to shortly explain what is included in your commit. Later on, you'll make commits which may contain changes to many different files. In that case, a descriptive commit message and description is even more useful!
5. Select \`Commit directly to the main branch\` (this adds your change your change to the default version instead of making a new one)
6. Click \`Commit changes\`.
7. Go to {octicon}\`play;1em\` \`Actions\` - The most recent workflow run \`Update intro.md / the commit message of the commit you just made\` - Wait for it to finish - In the summary, click on the link of your book shown in the table \`Branches deployed\` and under \`Primary book at root\`
8. Do you see your change? If you don't see it click \`CTRL\`+\`F5\`/\`Control\`+\`F5\`to refresh the page (your browser keeps a cached version of website you recently visit, but we actually want the most up-to-date version!).

\`\`\`\`{hint} Watch the steps in action below
class: dropdown

\`\`\`{figure} https://github.com/TeachBooks/template_figures/blob/main/excercise1.gif?raw=true
---
name: template_demo_public
---
Demonstration of all steps of this exercise, video available [here](https://youtu.be/gn1zBmmunco)
\`\`\`
\`\`\`\`

::::{card} Check your understanding
\`\`\`{h5p} https://home.teachbooks.io/wp-admin/admin-ajax.php?action=h5p_embed&id=2
\`\`\`
::::

::::{card} Check your understanding
\`\`\`{h5p} https://home.teachbooks.io/wp-admin/admin-ajax.php?action=h5p_embed&id=1
\`\`\`
::::
`;
