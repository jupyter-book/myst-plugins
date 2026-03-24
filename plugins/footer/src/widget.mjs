// Footer widget — renders in Shadow DOM via anywidget.
// CSS is injected via a <style> tag so the widget is fully self-contained
// I haven't figured out how to get this working with remove CSS thus far...
// __FOOTER_CSS__ is replaced with the contents of footer.css at build time (see build.mjs).

function render({ model, el }) {
  // Inject CSS into the shadow DOM (idempotent — skips if already present)
  if (!el.querySelector('style[data-footer]')) {
    const style = document.createElement('style');
    style.setAttribute('data-footer', '');
    style.textContent = __FOOTER_CSS__;
    el.prepend(style);
  }

  const title = model.get('title');
  const description = model.get('description');
  const logo = model.get('logo');
  const copyright = model.get('copyright');
  const links = model.get('links') || {};
  const icons = model.get('icons') || {};
  const iconSvgs = model.get('iconSvgs') || {};
  const hasBranding = title || logo || description || Object.keys(icons).length > 0;

  // This just builds the skeleton of the HTML for the footer, which we style with CSS.
  //
  // We build up the HTML of the footer based on which fields are present in the YAML.
  // This way we can do some semi-responsive behavior based on the config.
  // The {$ syntax lets us nest template conditions without using something like nunjucks}
  el.insertAdjacentHTML('beforeend', `
    <div class="footer">
      <div class="footer-columns">
        ${hasBranding ? `<div class="footer-branding">
          ${logo ? `<img src="${logo}" alt="${title || ''}" class="footer-logo">` : ''}
          ${title ? `<p class="footer-title">${title}</p>` : ''}
          ${description ? `<p class="footer-description">${description}</p>` : ''}
          ${Object.keys(icons).length ? `<div class="footer-icons">${Object.entries(icons).map(([k, v]) =>
            `<a href="${v}" target="_blank" rel="noopener noreferrer" title="${k}">${
              (iconSvgs[k] || '').replace(/<svg/g, '<svg width="20" height="20"')
            }</a>`
          ).join('')}</div>` : ''}
        </div>` : ''}
        ${Object.keys(links).length ? `<div class="footer-links">${Object.entries(links).map(([group, items]) =>
          `<div class="footer-link-group">
            <p class="footer-link-group-title">${group}</p>
            <ul>${(Array.isArray(items) ? items : []).flatMap(item =>
              Object.entries(item).map(([label, url]) =>
                `<li><a href="${url}"${url.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a></li>`
              )
            ).join('')}</ul>
          </div>`
        ).join('')}</div>` : ''}
      </div>
      ${copyright ? `<p class="footer-copyright">${copyright}</p>` : ''}
    </div>
  `);
}

export default { render };
