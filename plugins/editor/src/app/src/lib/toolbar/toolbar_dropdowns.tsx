import { createSignal, JSX, Show } from "solid-js";
import { Button, Form, Modal } from "solid-bootstrap";
import {
  useEditorState,
  useDispatchCommand,
  EditorContextType,
} from "../../components/Editor";
import {
  setParagraph,
  setHeading,
  toggleBulletList,
  toggleOrderedList,
  insertLink,
  insertImage,
  insertMath,
  insertTable,
} from "./toolbar_commands";
import { ToolbarDropdown } from "../../components/toolbar/ToolbarDropdown";
import { TableGridSelector } from "../../components/toolbar/TableGridSelector";
import { getCurrentListType } from "./toolbar_utils";

// Header (heading) options for the header dropdown, with live preview labels
export const HEADER_OPTIONS: { label: JSX.Element; value: number | string }[] =
  [
    {
      label: <span class="toolbar-header-option-h1">Heading 1</span>,
      value: 1,
    },
    {
      label: <span class="toolbar-header-option-h2">Heading 2</span>,
      value: 2,
    },
    {
      label: <span class="toolbar-header-option-h3">Heading 3</span>,
      value: 3,
    },
    {
      label: <span class="toolbar-header-option-normal">Normal</span>,
      value: "paragraph",
    },
  ];

// --- Signals for Table Grid Selector popup state and position ---
const [showTableSelector, setShowTableSelector] = createSignal(false);
const [hoverX, setHoverX] = createSignal(0);
const [hoverY, setHoverY] = createSignal(0);
const [showMathModal, setShowMathModal] = createSignal(false);
const [mathEquation, setMathEquation] = createSignal("E=mc^2");
const [mathLabel, setMathLabel] = createSignal("");
let insertButtonRef: HTMLButtonElement | undefined;
const [_selectorPos, setSelectorPos] = createSignal<{
  top: number;
  left: number;
}>({ top: 0, left: 0 });
const modalContainer = () =>
  typeof document !== "undefined"
    ? document.querySelector(".extension_name_css") ?? document.body
    : undefined;

/**
 * Collection of toolbar dropdown JSX elements and a factory for creating them.
 *
 * - Each dropdown (header, list, insert) is a JSX element configured with options, icons, and handlers.
 * - The `createDropdowns` function initializes all dropdowns using the current editor context.
 *
 * @property {JSX.Element} headerDropdown - Dropdown for selecting heading levels and normal text.
 * @property {JSX.Element} listDropdown - Dropdown for toggling bullet and ordered lists.
 * @property {JSX.Element} insertDropdown - Dropdown for inserting links, images, equations, and tables.
 * @method createDropdowns
 *   @param {EditorContextType} ctx - The editor context providing state and actions.
 *   @description Initializes all toolbar dropdowns with the current editor state and handlers.
 */
export const toolbarDropdowns: {
  headerDropdown?: JSX.Element;
  listDropdown?: JSX.Element;
  insertDropdown?: JSX.Element;
  createDropdowns: (ctx: EditorContextType) => void;
} = {
  createDropdowns(ctx: EditorContextType) {
    const { openDropdown } = ctx;
    const editorStateAccessor = useEditorState();
    const dispatchCommand = useDispatchCommand();

    // --- Header Dropdown (with labels) ---
    this.headerDropdown = (
      <ToolbarDropdown
        icon=""
        title={(() => {
          if (editorStateAccessor && editorStateAccessor()) {
            const { $from } = editorStateAccessor().selection;
            const node = $from.parent;
            if (node.type.name === "heading") {
              return `Heading ${node.attrs.level}`;
            }
            return "Normal";
          }
          return "Normal";
        })()}
        options={HEADER_OPTIONS.map((opt) => ({
          label: opt.label,
          icon: "",
          onClick: () => {
            if (opt.value === "paragraph") {
              dispatchCommand(setParagraph());
            } else {
              dispatchCommand(setHeading(opt.value as number));
            }
          },
        }))}
        showTableSelector={() => openDropdown() === "header"}
        setOpenRef={(fn) => {
          fn(openDropdown() === "header");
        }}
      />
    );

    // --- List Dropdown (icons only) ---
    this.listDropdown = (
      <ToolbarDropdown
        icon={(() => {
          if (editorStateAccessor && editorStateAccessor()) {
            const type = getCurrentListType(editorStateAccessor());
            return type === "ordered" ? "bi-list-ol" : "bi-list-ul";
          }
          return "bi-list-ul";
        })()}
        options={[
          {
            icon: "bi-list-ul",
            onClick: () => {
              const state = editorStateAccessor && editorStateAccessor();
              if (state) dispatchCommand(toggleBulletList(state.schema));
            },
          },
          {
            icon: "bi-list-ol",
            onClick: () => {
              const state = editorStateAccessor && editorStateAccessor();
              if (state) dispatchCommand(toggleOrderedList(state.schema));
            },
          },
        ]}
      />
    );

    const handleInsertMath = () => {
      const equation = mathEquation().trim();
      if (!equation) return;
      const label = mathLabel().trim();
      dispatchCommand(insertMath(equation, label || undefined));
      setShowMathModal(false);
    };

    // --- Insert Dropdown (icons only) ---
    this.insertDropdown = (
      <>
        <ToolbarDropdown
          icon="bi-plus-lg"
          options={[
            {
              icon: "bi-link-45deg",
              onClick: () => {
                const url = prompt("Enter link URL:");
                if (!url) return;
                const text = prompt("Enter link text (displayed):", url) || url;
                dispatchCommand(insertLink(url, text));
              },
            },
            {
              icon: "bi-image",
              onClick: () => {
                const url = prompt("Enter image URL:");
                if (url) dispatchCommand(insertImage(url));
              },
            },
            {
              icon: "bi-calculator",
              onClick: () => {
                setShowMathModal(true);
              },
            },
            {
              icon: "bi-table",
              onClick: () => {
                if (insertButtonRef) {
                  const rect = insertButtonRef.getBoundingClientRect();
                  setSelectorPos({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                  });
                }
                setShowTableSelector(true);
              },
            },
          ]}
          setButtonRef={(el) => {
            insertButtonRef = el;
          }}
        >
          <Show when={showTableSelector()}>
            <TableGridSelector
              show={showTableSelector()}
              position={_selectorPos()}
              hoverX={hoverX()}
              hoverY={hoverY()}
              setHoverX={setHoverX}
              setHoverY={setHoverY}
              onSelect={(rows, cols) => {
                setShowTableSelector(false);
                dispatchCommand(insertTable(rows, cols));
              }}
              onClose={() => setShowTableSelector(false)}
            />
          </Show>
        </ToolbarDropdown>
        <Modal
          show={showMathModal()}
          onHide={() => setShowMathModal(false)}
          centered
          size="lg"
          container={modalContainer()}
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <i class="bi bi-calculator me-2" />
              Insert equation
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form class="d-grid gap-3">
              <Form.Group>
                <Form.Label class="fw-semibold">Equation</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={mathEquation()}
                  placeholder="E=mc^2"
                  onInput={(e) => setMathEquation(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleInsertMath();
                    }
                  }}
                />
                <Form.Text>Use Ctrl/Command + Enter to insert.</Form.Text>
              </Form.Group>
              <Form.Group>
                <Form.Label class="fw-semibold">Label (optional)</Form.Label>
                <Form.Control
                  type="text"
                  value={mathLabel()}
                  placeholder="my-equation"
                  onInput={(e) => setMathLabel(e.currentTarget.value)}
                />
                <Form.Text>
                  Saved as <code>:label:</code> in MyST.
                </Form.Text>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={() => setShowMathModal(false)}
            >
              Cancel
            </Button>
            <Button variant="dark" onClick={handleInsertMath}>
              Insert equation
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  },
};
