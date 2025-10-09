/* A plugin which allows the user to specify the date of the last update for each individual page.
*  The date is specified in the frontmatter of each page using the key "updated".
*/ 

// Code based on:
// issue https://github.com/jupyter-book/mystmd/issues/1616
// with code https://github.com/jupyter-book/myst-enhancement-proposals/blob/main/mep.mjs


import {readFileSync} from 'fs';
import yaml from 'js-yaml';

// helper: parse frontmatter from a Markdown file
function getFrontmatter(srcPath) {
  try {
    const text = readFileSync(srcPath, 'utf-8');
    const match = /^---\s*([\s\S]*?)---/.exec(text);
    if (!match) return null;
    return yaml.load(match[1]);
  } catch (err) {
    return null;
  }
}

const updateDateTransform = {
  name: 'update-date',
  doc: 'If frontmatter contains updated, add date to top of document',
  stage: 'document',
  plugin: (_opts, utils) => {
    return (node, file) => {
      if (!file.path) return node;

        // remove working directory from vfile
        const relativePath = file.path.replace(process.cwd(), '');

        // parse frontmatter manually from the source file.
        const fm = getFrontmatter(file.path);

        //Check if updated exists in frontmatter, if so add date to top of document
        if (fm?.updated) {

            // Add date node
            node.children.unshift({
                type: 'div',
                class: 'font-light text-sm mb-4 updated-date-container',
                children: [{
                    type: 'text',
                    value: `Updated: ${fm.updated}`
                }]
            });

        } else {
            
            // Add empty node to maintain spacing (see mb-4)
            node.children.unshift({
                type: 'div',
                class: 'font-light text-sm mb-4',
                children: []
            });

        };
        return node;
    };
  },
};

const plugin = {
  name: 'Update Date Plugin',
  transforms: [updateDateTransform],
};

export default plugin;
