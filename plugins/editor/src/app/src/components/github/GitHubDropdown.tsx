import { createSignal } from "solid-js";
import { Modal } from "solid-bootstrap";
import { useGitHubAuth } from "../../lib/github/GithubLogin";
import { GitHubAuthPanel } from "./GitHubAuthPanel";
import { github } from "../../lib/github/githubInteraction";

export const GitHubDropdown = () => {
  const [open, setOpen] = createSignal(false);
  const { user, logout } = useGitHubAuth();
  const modalContainer = () =>
    typeof document !== "undefined"
      ? document.querySelector(".extension_name_css") ?? document.body
      : undefined;

  return (
    <div class="dropdown ms-auto" style={{ "margin-left": "auto" }}>
      <button
        class="btn btn-sm dropdown-toggle d-flex align-items-center"
        type="button"
        onClick={() => setOpen(!open())}
        aria-expanded={open()}
      >
        <i class="bi bi-github fs-5" />
        {/* Remove or comment out the span below */}
        {/* <span class="ms-2">GitHub</span> */}
      </button>
      <Modal
        show={open()}
        onHide={() => setOpen(false)}
        centered
        size="lg"
        container={modalContainer()}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i class="bi bi-github me-2" />
            GitHub
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <GitHubAuthPanel
            token={github.getAuth()}
            user={user()}
            onLogout={() => {
              logout();
              setOpen(false);
            }}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};
