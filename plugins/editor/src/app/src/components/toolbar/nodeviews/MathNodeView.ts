import katex from "katex";
import { NodeView, EditorView } from "prosemirror-view";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { showHintTooltip, hideHintTooltip } from "../HintTooltip";

/**
 * NodeView for rendering and editing math equations in the editor.
 *
 * - **Toolbar Integration:** Used automatically when a math node is inserted via the toolbar.
 * - **Functionality:** Renders math using KaTeX; supports inline editing on double-click; shows a tooltip on hover.
 * - **State:** Equation content is stored in the ProseMirror document; editing state is local to the NodeView.
 */
export class MathNodeView implements NodeView {
    dom: HTMLElement;
    renderSpan: HTMLElement;
    input: HTMLTextAreaElement | null = null;
    editing = false;
    view: EditorView;
    getPos: () => number;
    label?: string;

    constructor(node: ProseMirrorNode, view: EditorView, getPos: () => number) {
        this.view = view;
        this.getPos = getPos;
        this.label = node.attrs.label;

        this.dom = document.createElement("span");
        this.dom.className = "math-node";
        this.renderSpan = document.createElement("span");
        this.renderSpan.className = "math-render";
        this.dom.appendChild(this.renderSpan);

        this.renderMath(node.textContent);

        this.renderSpan.addEventListener("mouseenter", (_e) => {
            const rect = this.renderSpan.getBoundingClientRect();
            const hintText = this.label
                ? `Label: ${this.label}\nDouble click to edit inline\nCtrl + Backspace to delete`
                : "Double click to edit inline\nCtrl + Backspace to delete";
            showHintTooltip(
                hintText,
                rect.bottom + window.scrollY + 10,
                rect.left + window.scrollX + rect.width / 2,
            );
        });
        this.renderSpan.addEventListener("mouseleave", hideHintTooltip);

        this.renderSpan.addEventListener("dblclick", () =>
            this.startEdit(node),
        );
    }

    startEdit(node: ProseMirrorNode) {
        if (this.editing) return;
        this.editing = true;
        hideHintTooltip();
        const textarea = document.createElement("textarea");
        textarea.value = node.textContent;
        textarea.className = "math-input";
        textarea.rows = 1;

        // Auto-grow up to 3 lines
        const autoGrow = () => {
            textarea.rows = 1;
            const lines = textarea.value.split("\n").length;
            textarea.rows = Math.min(3, Math.max(1, lines));
        };
        textarea.addEventListener("input", autoGrow);
        autoGrow();

        this.dom.replaceChild(textarea, this.renderSpan);
        textarea.focus();
        textarea.select();

        textarea.addEventListener("blur", () => this.finishEdit());
        textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.finishEdit();
            }
        });

        this.input = textarea;
    }

    finishEdit() {
        if (!this.input) return;
        const latex = this.input.value;
        const pos = this.getPos();
        this.view.dispatch(
            this.view.state.tr.replaceWith(
                pos + 1,
                pos + this.view.state.doc.nodeAt(pos)!.nodeSize - 1,
                this.view.state.schema.text(latex),
            ),
        );
        this.dom.replaceChild(this.renderSpan, this.input);
        this.input = null;
        this.editing = false;
        this.renderMath(latex);
    }

    renderMath(latex: string) {
        try {
            this.renderSpan.innerHTML = katex.renderToString(latex, {
                throwOnError: false,
                displayMode: true,
            });
        } catch (_e) {
            this.renderSpan.textContent = latex;
        }
    }

    update(node: ProseMirrorNode) {
        if (!this.editing) {
            this.renderMath(node.textContent);
        }
        this.label = node.attrs.label;
        return true;
    }
}
