import { createSignal } from "solid-js";
import { Button, Form } from "solid-bootstrap";
import { showModal } from "../popups/popup_modal"; // <-- import showModal

type Props = {
  onTokenSet: (token: string) => Promise<boolean> | boolean;
};

export const GitHubTokenInput = (props: Props) => {
  const [token, setToken] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);

  const handleSave = async () => {
    if (token().trim()) {
      try {
        const result = await props.onTokenSet(token());
        if (result === false) {
          setError("The token was invalid. Please try again.");
        } else {
          setError(null);
        }
      } catch {
        setError("The token was invalid. Please try again.");
      }
    }
  };

  // Instructions for creating a fine-grained PAT
  const handleShowInstructions = () => {
    showModal(
      <div style={{ color: "#000" }}>
        <h2 style={{ color: "#000" }}>
          How to Create a GitHub Fine-Grained Personal Access Token
        </h2>
        <ol
          style={{ color: "#000", "text-align": "left", "margin-left": "1em" }}
        >
          <li>
            Click{" "}
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 underline text-sm"
            >
              here
            </a>{" "}
            to open the token creation menu.
          </li>
          <li>
            <b>Name</b> your token and set an <b>expiration</b> if desired.
          </li>
          <li>
            Under <b>Resource owner</b>, select <b>Your account</b>, if it was
            not already preselected.
          </li>
          <li>
            Under <b>Repository access</b>, choose <b>All repositories</b>.
          </li>
          <li>
            Under <b>Repository permissions</b>, set <b>Contents</b> to{" "}
            <b>Read and write</b>.
          </li>
          <li>
            Scroll down and click <b>Generate token</b>.
          </li>
          <li>
            <b>Copy</b> the token and paste it here.
          </li>
        </ol>
        <div style={{ "font-size": "0.95em", color: "#b91c1c" }}>
          <b>Note:</b> This token will not be visible again. If you want to use
          it more, save it somewhere.
        </div>
      </div>,
    );
  };

  return (
    <Form class="d-grid gap-3">
      <div>
        <h2 class="h5 fw-semibold mb-2">Enter GitHub Access Token</h2>
        <Form.Control
          type="password"
          placeholder="Paste fine grained PAT here"
          value={token()}
          onInput={(e) => setToken(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSave();
            }
          }}
        />
      </div>
      <Button variant="dark" onClick={handleSave}>
        Save Token
      </Button>
      {error() && <div class="text-danger">{error()}</div>}
      <div class="d-flex flex-column gap-1">
        <a
          href="https://github.com/settings/personal-access-tokens/new"
          target="_blank"
          rel="noopener noreferrer"
          class="link-primary small"
        >
          Don&apos;t have an access token?
        </a>
        <span
          onClick={handleShowInstructions}
          class="link-primary small"
          role="button"
          tabindex={0}
        >
          How to create an access token?
        </span>
      </div>
    </Form>
  );
};
