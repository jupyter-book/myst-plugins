function render({ el }) {
  const scriptId = "hypothesis-embed";

  if (!document.getElementById(scriptId)) {
    const script = document.createElement("script");

    script.id = scriptId;
    script.src = "https://hypothes.is/embed.js";
    script.async = true;

    document.head.appendChild(script);
  }

  el.textContent = "";
}

export default { render };