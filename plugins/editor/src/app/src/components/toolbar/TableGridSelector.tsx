import { JSX, For } from "solid-js";

export interface TableGridSelectorProps {
  show: boolean;
  position: { top: number; left: number };
  hoverX: number;
  hoverY: number;
  setHoverX: (x: number) => void;
  setHoverY: (y: number) => void;
  onSelect: (rows: number, cols: number) => void;
  onClose: () => void;
}

/**
 * TableGridSelector renders a popup grid for selecting table size in the toolbar.
 *
 * - Highlights cells up to the current hovered row and column.
 * - Calls setHoverX/setHoverY on cell hover to update the highlight.
 * - Calls onSelect with the selected size when a cell is clicked.
 * - Calls onClose when the mouse leaves the popup.
 *
 * @param props.show - Whether the selector is visible.
 * @param props.position - Popup position ({ top, left } in pixels).
 * @param props.hoverX - Current hovered column index.
 * @param props.hoverY - Current hovered row index.
 * @param props.setHoverX - Callback to update hovered column.
 * @param props.setHoverY - Callback to update hovered row.
 * @param props.onSelect - Called with (rows, cols) when a grid cell is clicked.
 * @param props.onClose - Called when the popup should close (e.g., mouse leaves).
 * @returns JSX.Element for the table grid selector popup.
 */
export function TableGridSelector(props: TableGridSelectorProps): JSX.Element {
  if (!props.show) return null;
  return (
    <div
      class="table-grid-selector-popup"
      style={{
        top: `${props.position.top}px`,
        left: `${props.position.left}px`,
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseLeave={props.onClose}
    >
      <div class="table-grid-selector-grid">
        <For each={[...Array(8)]}>
          {(_, r) => (
            <div class="table-grid-selector-row">
              <For each={[...Array(8)]}>
                {(_, c) => (
                  <TableGridCell
                    row={r()}
                    col={c()}
                    hoverX={props.hoverX}
                    hoverY={props.hoverY}
                    setHoverX={props.setHoverX}
                    setHoverY={props.setHoverY}
                    onSelect={props.onSelect}
                  />
                )}
              </For>
            </div>
          )}
        </For>
      </div>
      <div class="table-grid-selector-label">
        {props.hoverY + 1} × {props.hoverX + 1}
      </div>
    </div>
  );
}

/**
 * TableGridCell renders a single cell in the table grid selector.
 *
 * - Highlights itself if within the hovered area.
 * - Updates hoverX and hoverY on mouse enter.
 * - Calls onSelect with the selected size on mouse down.
 *
 * @param props.row - Row index of the cell.
 * @param props.col - Column index of the cell.
 * @param props.hoverX - Current hovered column index.
 * @param props.hoverY - Current hovered row index.
 * @param props.setHoverX - Callback to update hovered column.
 * @param props.setHoverY - Callback to update hovered row.
 * @param props.onSelect - Called with (rows, cols) when the cell is clicked.
 * @returns JSX.Element for a single grid cell.
 */
function TableGridCell(props: {
  row: number;
  col: number;
  hoverX: number;
  hoverY: number;
  setHoverX: (x: number) => void;
  setHoverY: (y: number) => void;
  onSelect: (rows: number, cols: number) => void;
}) {
  const selected = () => props.row <= props.hoverY && props.col <= props.hoverX;
  return (
    <div
      class={`table-grid-selector-cell${selected() ? " selected" : ""}`}
      onMouseEnter={() => {
        props.setHoverY(props.row);
        props.setHoverX(props.col);
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        props.onSelect(props.row + 1, props.col + 1);
      }}
    />
  );
}
