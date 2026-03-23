import { Component } from "solid-js";

/**
 * ToolbarButton renders a single toolbar button with icon and accessibility features.
 *
 * @param props.icon - Icon class for the button (e.g., "bi-type-bold").
 * @param props.label - Accessible label and tooltip text.
 * @param props.onClick - Called when the button is clicked.
 * @param props.active - If true, marks the button as active (pressed).
 * @param props.disabled - If true, disables the button.
 * @param props.onMouseOver - Optional mouse over handler.
 * @param props.onMouseOut - Optional mouse out handler.
 * @returns JSX.Element for the toolbar button.
 */
export const ToolbarButton: Component<{
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  onMouseOver?: (e: MouseEvent) => void;
  onMouseOut?: (e: MouseEvent) => void;
}> = (props) => (
  <button
    type="button"
    class="toolbar-btn btn btn-sm px-1"
    title={props.label}
    aria-pressed={props.active ? "true" : "false"}
    disabled={props.disabled}
    onClick={(e) => {
      e.preventDefault();
      props.onClick();
      (e.currentTarget as HTMLButtonElement).blur();
    }}
    onMouseUp={(e) => (e.currentTarget as HTMLButtonElement).blur()}
    onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).blur()}
    onMouseOver={(e) => props.onMouseOver?.(e)}
    onMouseOut={(e) => props.onMouseOut?.(e)}
  >
    <i class={`bi ${props.icon} fs-5`} />
    <span class="visually-hidden">{props.label}</span>
  </button>
);
