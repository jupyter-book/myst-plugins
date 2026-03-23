import { createSignal, JSX, Show, onCleanup, createEffect } from "solid-js";
import { render } from "solid-js/web";

/**
 * Options for toast popups, currently only the duration.
 */
type ToastOptions = {
  /**
   * Duration before the toast popup automatically closes, in ms.
   */
  duration: number; // ms
};

/**
 * Gets the container that holds the toast popups.
 * @returns the container to put the popups in.
 */
function getToastContainer(): HTMLElement {
  const toastContainerId = "solid-toast-container";
  let container = document.getElementById(toastContainerId);
  if (!container) {
    container = document.createElement("div");
    container.id = toastContainerId;
    Object.assign(container.style, {
      position: "fixed",
      top: "16px",
      right: "16px",
      display: "flex",
      "flex-direction": "column",
      gap: "12px",
      "z-index": "9999",
    });
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Shows a toast popup.
 * @param message The message to display in the popup.
 * @param options The {@link ToastOptions} for the popup, defaults to 10 second duration.
 */
export function showToast(
  message: JSX.Element | string,
  options: ToastOptions = { duration: 10000 },
) {
  const container = getToastContainer();
  const toast = document.createElement("div");

  const Toast = () => {
    const [visible, setVisible] = createSignal(true);
    const [fadeLevel, setFadeLevel] = createSignal(1); // 1 = fully visible

    const fadeStart = options.duration * 0.75;

    // Manual close
    const close = () => setVisible(false);

    // Fade timer
    const start = performance.now();
    let animFrame: number;

    const updateFade = (now: number) => {
      const elapsed = now - start;

      if (elapsed >= fadeStart) {
        const fadeProgress = Math.min(
          (elapsed - fadeStart) / (options.duration - fadeStart),
          1,
        );
        const newOpacity = 1 - fadeProgress * 0.5; // fade to 50% opacity
        setFadeLevel(newOpacity);
      }

      if (elapsed >= options.duration) {
        setVisible(false);
      } else {
        animFrame = requestAnimationFrame(updateFade);
      }
    };

    animFrame = requestAnimationFrame(updateFade);

    // Clean up
    onCleanup(() => {
      cancelAnimationFrame(animFrame);
      toast.remove();
    });
    createEffect(() => {
      if (!visible()) {
        toast.remove();
      }
    });

    return (
      <Show when={visible()}>
        <div
          style={{
            padding: "12px 16px",
            background: `rgba(51,51,51,${fadeLevel()})`,
            color: "#fff",
            "border-radius": "6px",
            "box-shadow": "0 2px 6px rgba(0,0,0,0.2)",
            "font-size": "14px",
            "min-width": "180px",
            display: "flex",
            "justify-content": "space-between",
            "align-items": "center",
            gap: "8px",
            transition: "background 0.2s ease",
          }}
        >
          <span>{message}</span>
          <button
            style={{
              background: "transparent",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              "font-size": "16px",
            }}
            onClick={close}
          >
            ×
          </button>
        </div>
      </Show>
    );
  };

  render(() => <Toast />, toast);
  container.appendChild(toast);
}
