# Jupyter Book 2 Wizard

An editing interface to edit Jupyter Books in the browser, based on the [TeachBook wizard](https://github.com/TeachBooks/Wizard/tree/main). 

⚠️ Currently it is not possible to add javascript to Jupyter Books ([see this issue](https://github.com/jupyter-book/mystmd/issues/1040)). As a temporary solution, this project uses GitHub actions to add the required JS file (`script/start_wizard.js`) to the book after building.  

# Add editor to Jupyter Book

Once GitHub pages are setup according to the [docs](https://mystmd.org/guide/deployment-github-pages), add the following section of code after 'Build HTML Assets' in `.github\workflows\deploy.yml`: 

```{code}
- name: Add wizard to book
    uses: luukfroling/Wizard-jb2/actions@main 
    with:
        script_url: "https://raw.githack.com/luukfroling/Wizard-jb2/main/script/start_wizard.js"
        html_dir: "_build/html"
```

The file should look like this: 

```{code}
- name: Build HTML Assets
  run: myst build --html

- name: Add wizard to book
    uses: luukfroling/Wizard-jb2/actions@main 
    with:
        script_url: "https://raw.githack.com/luukfroling/Wizard-jb2/main/script/start_wizard.js"
        html_dir: "_build/html"

- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: './_build/html'

```

An example can be found [here](https://github.com/luukfroling/Jupyter-book-editor/blob/main/.github/workflows/deploy.yml)

# Unknown nodetypes

As the wizard was originally designed for JB1, there will be unknown nodetypes which have not been tested/implemented yet. Please open an issue if any are found!

# Using the editor

After adding the extra steps to the gh-action, a toggle should appear on the top right in the navigation bar. 
 