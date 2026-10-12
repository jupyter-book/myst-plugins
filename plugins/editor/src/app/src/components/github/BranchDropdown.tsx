import { Component, createSignal, For, createEffect, on } from "solid-js";
import { database } from "../../lib/localStorage/database";
import { github } from "../../lib/github/githubInteraction";
import { GitHubUser, user } from "../../lib/github/GithubLogin";
import { saveEditorContentToDatabase } from "../Editor";

export const BranchDropdown: Component = () => {
  const [branches, setBranches] = createSignal<string[]>([]);
  const [open, setOpen] = createSignal(false);
  const [showInput, setShowInput] = createSignal(false);
  const [newBranchName, setNewBranchName] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);

  const initialise = async () => {
    const localBranches = await database.loadLocalbranches("markdown");
    const remoteBranches = await github.fetchRemoteBranches();

    console.log("LOCAL  →", localBranches);
    console.log("REMOTE →", remoteBranches);

    const deduped = remoteBranches.filter((rb) => !localBranches.includes(rb));
    console.log("FILTERED REMOTE (not in local) →", deduped);

    const allBranches = [...localBranches, ...deduped];
    console.log("COMBINED ALL →", allBranches);

    setBranches(allBranches);
  };
  createEffect(
    on(
      () => user(),
      (u: GitHubUser | null) => {
        if (u == null) {
          //
        }
        initialise().then(() => {
          if (branches().length != 0) {
            if (github.getBranch() == "") {
              database
                .loadFrom<string>(
                  "metadata",
                  github.getRepo(),
                  "branch",
                  "selected_branch",
                )
                .then((value) => {
                  if (value === undefined) {
                    github.setBranch(branches()[0]); // set branch to first branch
                  } else {
                    github.setBranch(value); //set branch to stored value
                    if (!branches().includes(value)) {
                      setBranches([...branches(), value]);
                    }
                  }
                });
            }
          } else {
            //resolve no branches edge-case
            setBranches(["main"]);
            github.setBranch(branches()[0]);
          }
        });
      },
    ),
  );

  // When a branch is selected, update state and localStorage
  const handleSelect = async (b: string) => {
    console.log("saving before changing branch...");
    await saveEditorContentToDatabase();
    github.setBranch(b);
    setOpen(false);
    setShowInput(false);
    setError(null);
  };

  // Add a new branch locally (not on GitHub)
  const handleAddLocalBranch = async () => {
    setError(null);
    const name = newBranchName().trim();
    if (!name) {
      setError("Branch name cannot be empty.");
      return;
    }
    if (branches().includes(name)) {
      // If branch exists, just switch to it
      handleSelect(name);
      setNewBranchName("");
      return;
    }
    setBranches([name, ...branches()]);
    handleSelect(name);
    setNewBranchName("");
  };

  return (
    <div class="dropdown me-2">
      <button
        class="btn btn-sm dropdown-toggle d-flex align-items-center px-1"
        type="button"
        id="branchDropdown"
        aria-expanded={open()}
        onClick={() => setOpen(!open())}
        style={{
          "min-width": "unset",
          padding: "2px 6px",
          "font-size": "0.95em",
          height: "28px",
          "line-height": "1",
        }}
      >
        <i
          class="bi bi-git"
          style={{ "font-size": "1.1em", "margin-right": "0.3em" }}
        />
        <span
          style={{
            "max-width": "80px",
            overflow: "hidden",
            "text-overflow": "ellipsis",
            "white-space": "nowrap",
          }}
        >
          {github.getBranch()}
        </span>
      </button>
      <ul
        class={`dropdown-menu dropdown-menu-end p-2${open() ? " show" : ""}`}
        aria-labelledby="branchDropdown"
        style={{ "min-width": "220px", left: "auto", right: 0 }}
      >
        <For each={branches()}>
          {(b) => (
            <li>
              <button
                class={`dropdown-item${b === github.getBranch() ? " active" : ""}`}
                type="button"
                onClick={() => handleSelect(b)}
              >
                {b}
              </button>
            </li>
          )}
        </For>
        <li>
          <hr class="dropdown-divider" />
        </li>
        <li>
          {!showInput() ? (
            <button
              class="dropdown-item text-primary"
              type="button"
              onClick={() => {
                setShowInput(true);
                setError(null);
                setNewBranchName("");
              }}
            >
              + Add local branch
            </button>
          ) : (
            <div class="px-2 py-1">
              <input
                type="text"
                class="form-control form-control-sm mb-1"
                placeholder="New branch name"
                value={newBranchName()}
                onInput={(e) => setNewBranchName(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddLocalBranch();
                  if (e.key === "Escape") setShowInput(false);
                }}
                autofocus
              />
              <div class="d-flex gap-1">
                <button
                  class="btn btn-sm btn-primary"
                  type="button"
                  onClick={handleAddLocalBranch}
                >
                  Add
                </button>
                <button
                  class="btn btn-sm btn-secondary"
                  type="button"
                  onClick={() => setShowInput(false)}
                >
                  Cancel
                </button>
              </div>
              {error() && <div class="text-danger small mt-1">{error()}</div>}
            </div>
          )}
        </li>
      </ul>
    </div>
  );
};
