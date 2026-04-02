console.log("[wizard] Script loaded (updated).");

let isEditorMode = false;
let iframeElement = null;
let originalContent = null;
let owner = "unknown";
let repo = "unknown";
let filePath = "not found";
let container = null;
let footerLinks = null;
let giscus = null;
let loaderElement = null;

let hasError = false;
let errorMessage = ""; 

// check if metadata is present (owner, repo, file)
const parseMetadata = function() {

    const repoAnchor = document.querySelector('a[title*="GitHub Repository:"]');
    const fileAnchor = document.querySelector('a[title="Edit This Page"]');

    if (!repoAnchor || !fileAnchor) {
        console.warn("[wizard] Could not find necessary metadata anchors.");
        console.log("[wizard] Repo Anchor Found:", !!repoAnchor);
        console.log("[wizard] File Anchor Found:", !!fileAnchor);
        hasError = true;
        errorMessage = "Could not find github information, have you linked your repository in myst.yml?";
        return false;
    }

    // Parse Owner and Repo
    const repoMatch = repoAnchor.href.match(/github\.com\/([^/]+)\/([^/]+)/);
    
    if (repoMatch) {
        owner = repoMatch[1];
        repo = repoMatch[2];
    } 

    // Parse File Path
    const fileUrlParts = fileAnchor.href.split('/edit/');
    if (fileUrlParts.length > 1) {
        // Skips branch name to get the path
        filePath = fileUrlParts[1].split('/').slice(1).join('/');
    }

    console.log(`[wizard] Parsed Metadata - Owner: ${owner}, Repo: ${repo}, File: ${filePath}`);
    return true;
};

// See https://www.w3schools.com/howto/tryit.asp?filename=tryhow_css_switch for toggle button
const createToggleButton = function() {
        // Create slider markup: <label class="switch"><input type="checkbox"><span class="slider round"></span></label>
        const wrapper = document.createElement('label');
        wrapper.className = 'switch';

        wrapper.id = "wizard-toggler"

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('aria-label', 'Toggle wizard editor');

        const slider = document.createElement('span');
        slider.className = 'slider round';

        // Keep a reference to checkbox so other functions can check/modify it
        wrapper.appendChild(checkbox);
        wrapper.appendChild(slider);

        // When changed, toggle view
        checkbox.addEventListener('change', () => {
                if (hasError) alert(`Wizard Error: ${errorMessage}`);
                if (checkbox.checked) showEditor(); else showOriginal();
        });

        // expose the checkbox for external sync
        wrapper._checkbox = checkbox;
        return wrapper;
};

const injectToggleStyles = function() {
    if (document.getElementById('wizard-toggle-styles')) return;
    const style = document.createElement('style');
    style.id = 'wizard-toggle-styles';
    style.textContent = `
.switch {
    position: relative;
    display: inline-block;
    /* 60px * 0.7 = 42px */
    width: 42px; 
    /* 34px * 0.7 = 23.8px */
    height: 24px; 
}
.switch input { 
    opacity: 0;
    width: 0;
    height: 0;
}
.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    -webkit-transition: .4s;
    transition: .4s;
}
.slider:before {
    position: absolute;
    content: "";
    /* 26px * 0.7 = 18.2px */
    height: 18px;
    width: 18px;
    /* Adjusted spacing to keep it centered */
    left: 3px;
    bottom: 3px;
    background-color: white;
    -webkit-transition: .4s;
    transition: .4s;
}
input:checked + .slider { background-color: #2196F3; }
input:focus + .slider { box-shadow: 0 0 1px #2196F3; }

/* Translation: (Width 42px) - (Circle 18px) - (Left margin 3px * 2) = 18px */
input:checked + .slider:before { 
    -webkit-transform: translateX(18px); 
    -ms-transform: translateX(18px); 
    transform: translateX(18px); 
}

.slider.round { border-radius: 24px; }
.slider.round:before { border-radius: 50%; }
`;
    document.head.appendChild(style);
};

const hideOriginalContent = function() {
    container = document.querySelector('article') || document.body;
    
    // Store original content
    originalContent = container.innerHTML;
    
    // Identify elements to protect
    footerLinks = container.querySelector('.myst-footer-links');
    giscus = document.getElementById('giscus_container');

    // Clear container safely
    const children = Array.from(container.children);
    children.forEach(child => {
        if (child === footerLinks || child === giscus || (giscus && child.contains(giscus))) {
            return; 
        }
        container.removeChild(child);
    });
};

const showEditor = function() {
    if (isEditorMode) return;
    
    hideOriginalContent();
    
    // 3. Construct Iframe
    const iframeBase = 'https://luukfroling.github.io/Wizard-jb2/';
    const finalUrl = `${iframeBase}?owner=${owner}&repo=${repo}&file=${filePath}`;
    
    console.log("[wizard] Iframe URL:", finalUrl);

    iframeElement = document.createElement('iframe');
    iframeElement.src = finalUrl;
    iframeElement.style.width = "100%";
    iframeElement.style.height = "800px";
    iframeElement.style.border = "none";
    iframeElement.style.borderRadius = "8px";

    // Inject Iframe at the top
    container.prepend(iframeElement);
    window.scrollTo(0, 0);
    
    isEditorMode = true;
    // sync toggle checkbox if present
    try {
        const nav = document.querySelector('div.flex.items-center.flex-grow.w-auto');
        const label = nav && nav.querySelector('label.switch');
        if (label && label._checkbox) label._checkbox.checked = true;
    } catch (e) {}
    console.log("[wizard] Editor view activated.");
};

const showOriginal = function() {
    if (!isEditorMode) return;
    
    container = document.querySelector('article') || document.body;
    
    // Remove iframe
    if (iframeElement && iframeElement.parentNode) {
        iframeElement.parentNode.removeChild(iframeElement);
    }
    
    // Restore original content
    if (originalContent) {
        container.innerHTML = originalContent;
    }
    
    isEditorMode = false;
    // sync toggle checkbox if present
    try {
        const nav = document.querySelector('div.flex.items-center.flex-grow.w-auto');
        const label = nav && nav.querySelector('label.switch');
        if (label && label._checkbox) label._checkbox.checked = false;
    } catch (e) {}
    console.log("[wizard] Original view restored.");
};

const toggleView = function() {
    if (isEditorMode) {
        showOriginal();
    } else {
        showEditor();
    }
};

const addToggleButton = function() {
    // Find the navbar container
    const navbarContainer = document.querySelector('div.flex.items-center.flex-grow.w-auto');
    
    if (!navbarContainer) {
        console.warn("[wizard] Could not find navbar container.");
        return;
    }
    
    // Create and insert the toggle button before the theme button
    const themeButton = navbarContainer.querySelector('.myst-theme-button');
    const toggleButton = createToggleButton();
    
    if (themeButton) {
        themeButton.parentNode.insertBefore(toggleButton, themeButton);
    } else {
        navbarContainer.appendChild(toggleButton);
    }
    
    console.log("[wizard] Toggle button added to navbar.");
};


function render({ model, el }) {   
    if (!parseMetadata()) {
        return;
    }

    // Check if wizard toggler exists
    if(document.getElementById("wizard-toggler") == null){
        injectToggleStyles();
        addToggleButton();
    } else {
        console.log("[wizard] Toggle button already exists, skipping creation.");
    }



}
export default { render };