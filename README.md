# myst-plugins

This is (as yet) a non-official repository for MyST plugins.

## Contribute
We welcome new plugins! To share your plugin, please fork this repository, add your plugin, update the gallery table below and include an example page to demonstrate its output (note that the toc is in the toc.yml file), then submit a pull request. Edits and improvements to existing plugins are also encouraged.

We distinguish three levels of plugin maturity:  
* in development: the plugin is still being developed and may have bugs or incomplete features. It may not be fully documented or tested. Use at your own risk.
* tested: the plugin has been tested - at least by two developers - and is functional, but may not be fully documented or may have some limitations. Use with caution.
* stable: the plugin is stable, well-documented, and has been tested by multiple users. It is ready for production use.

Once a plugin reaches the stable level, we will create a release for it - it then becomes available through an url. All other levels require a download from this git repository.

## Creating Releases

We use GitHub releases to share plugins in a way that others can reference and use.

Do do so, use the `src/release.py` script.
It will print a `gh` command to generate a release for the plugin you specify.
See the docstring of that script for usage information.

**Note:** Release tags are named after the plugin (e.g., `github-issue-table`), not semantic versions. Future releases of the same plugin should update the existing release or use dated tags if versioning is needed.

## Gallery of plugins
See the [plugin overview](plugin_overview.md) for a list of available plugins and their status.