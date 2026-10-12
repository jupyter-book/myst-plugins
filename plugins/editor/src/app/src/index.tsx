/* @refresh reload */
import { Suspense } from "solid-js";
import { render } from "solid-js/web";

import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import App from "./App";
import {
  getRepositoryLink,
  getCurrentFileHref,
  parseOwnerRepoFromHref,
  setCurrentFileHref, // <--- Add this line
} from "./lib/github/GithubUtility";
import { github } from "./lib/github/githubInteraction";
import { saveEditorContentToDatabase } from "./components/Editor";

const root = document.getElementById("root");

if (!(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
  );
}
// 1. Get arguments from your Iframe URL
const urlParams = new URLSearchParams(window.location.search);
const pOwner  = urlParams.get('owner');
const pRepo   = urlParams.get('repo');
const pFile   = urlParams.get('file'); // e.g., "content/intro.md"
const pBranch = urlParams.get('branch') || "main";

console.log("[wizard] Params:", {pOwner, pRepo, pFile, pBranch});

// 2. Initialize the GitHub state
if (pOwner && pRepo) {
    // Set the core repository info
    github.setOwner(pOwner);
    github.setRepo(pRepo);
    github.setBranch(pBranch);
    
    // If a specific file is provided, we "fake" the edit link 
    // so the GithubUtility signals pick it up.
    if (pFile) {
        const fakeEditHref = `https://github.com/${pOwner}/${pRepo}/edit/${pBranch}/${pFile}`;
        setCurrentFileHref(fakeEditHref); 
        console.log("Forcing editor to file:", pFile);
    }
} else {
    console.log("oops");
}

window.addEventListener("beforeunload", async () => {
  await saveEditorContentToDatabase();
});

render(
  () => (
    <Suspense>
      <App />
    </Suspense>
  ),
  root!,
);
