# myst-plugins

This is (as yet) a non-official repository for MyST plugins.

## Contribute
We welcome new plugins! To share your plugin, please fork this repository, add your plugin, update the gallery table below and include an example page to demonstrate its output, then submit a pull request. Edits and improvements to existing plugins are also encouraged.

We distinguish three levels of plugin maturity:  
* in development: the plugin is still being developed and may have bugs or incomplete features. It may not be fully documented or tested. Use at your own risk.
* tested: the plugin has been tested - at least by two developers - and is functional, but may not be fully documented or may have some limitations. Use with caution.
* stable: the plugin is stable, well-documented, and has been tested by multiple users. It is ready for production use.

Once a plugin reaches the stable level, we will create a release for it - it then becomes available through an url. All other levels require a download from this git repository.

## Gallery of plugins
|name|functionalities|type|requirements|status|maintainer(s)|Embed link|
|---|---|---|---|---|---|---|
| experiment-admonition | A custom admonition with its transform for converting to pdf | directive & transform | requires custom css | stable | Luuk Fröling & Freek Pols | [Link](https://github.com/jupyter-book/myst-plugins/releases/download/Admonitions/experiment-admonition.mjs) |
| intermezzo-admonition | A custom admonition with its transform for converting to pdf | directive & transform | requires custom css | stable | Luuk Fröling & Freek Pols | [Link](https://github.com/jupyter-book/myst-plugins/releases/download/Admonitions/intermezzo-admonition.mjs) |
| example-admonition | A custom admonition with its transform for converting to pdf | directive & transform | requires custom css | stable | Luuk Fröling & Freek Pols | [Link](https://github.com/jupyter-book/myst-plugins/releases/download/Admonitions/example-admonition.mjs) |
| ex-and-sol-pdf | A plugin that converts exercises and solutions to numbered exercises and solutions in both LaTeX and Typst pdf | transform | |stable |Luuk Fröling & Freek Pols | [Link](https://github.com/jupyter-book/myst-plugins/releases/download/exercise-and-solution-pdf/exercise-admonition-pdf.mjs) |
| updated-date-frontmatter | A plugin which adds the date of the last update to the top of the page | | |stable |Luuk Fröling & Freek Pols | [Link](https://github.com/jupyter-book/myst-plugins/releases/download/updated-date-frontmatter/update-date-frontmatter.mjs) |
| iframe | A plugin that replaces iframe elements with a qr code as figure and a caption with the link so that it is accessible in pdf format | transform | | in development |Luuk Fröling & Freek Pols | [Link](https://github.com/jupyter-book/myst-plugins/releases/download/iframe-to-qr-pdf/iframe-to-qr-pdf.mjs) |
| picsum | A plugin that adds a directive to include random images from picsum.photos | directive | | stable | Angus Hollands | - |
| typst-conversion-support | A plugin that converts missing conversions from Latex to Typst | transform | | in development | Freek Pols | - |

