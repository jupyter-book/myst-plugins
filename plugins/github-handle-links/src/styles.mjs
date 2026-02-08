// Plugin CSS defined as a JS string so it can be imported as an ES module.
// We can't use a .css file because MyST plugins must be loadable as .mjs —
// This string is injected into each page at build time
// via the math-node hack (see example/developer-tips.md).
export const HANDLE_STYLES = `
.github-handle-link .link-icon { display: none !important; }
.github-handle-avatar {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-size: cover;
  vertical-align: text-bottom;
  margin-right: 2px;
}`;
