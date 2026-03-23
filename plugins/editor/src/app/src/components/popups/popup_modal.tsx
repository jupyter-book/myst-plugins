import { createSignal, JSX, onCleanup, Show } from "solid-js";
import { Portal, render } from "solid-js/web";

/**
 * Shows a popup that blocks all interaction with other UI elements.
 * @param content the content to show in the modal popup.
 */
export function showModal(content: JSX.Element | string) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const Modal = () => {
    const [open, setOpen] = createSignal(true);
    onCleanup(() => container.remove());

    return (
      <Show when={open()}>
        <Portal mount={container}>
          <div
            style={{
              position: "fixed",
              top: "0",
              left: "0",
              width: "100vw",
              height: "100vh",
              "background-color": "rgba(0,0,0,0.4)",
              display: "flex",
              "justify-content": "center",
              "align-items": "center",
              "z-index": "1000",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: "24px",
                "border-radius": "8px",
                "min-width": "300px",
                "box-shadow": "0 2px 10px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {content}
              <button onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </Portal>
      </Show>
    );
  };

  render(() => <Modal />, container);
}
