---
updated: October 7, 2025
abstract: page about updated date
---

# Updated-date

This plugin lets you show the **last updated date** of a page using frontmatter metadata. Include the `updated` field in your page’s frontmatter:

```yaml
---
updated: October 7, 2025
---
```

This date will appear automatically on the page.

To correctly position the update date below the title, add the following CSS to your stylesheet:

```css 
/* Remove extra spacing from the frontmatter container */
#skip-to-frontmatter {
  margin-bottom: 0;
}
```
⚠️ Important: Without this CSS rule, there may be extra space between the title and the update date.
