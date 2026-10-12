import {
    Plugin,
    Transaction,
    EditorState,
    NodeSelection,
    TextSelection,
    Command,
} from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import {
    splitListItem,
    sinkListItem,
    liftListItem,
} from "prosemirror-schema-list";
import { Schema } from "prosemirror-model";
import { chainCommands } from "prosemirror-commands";
import {
    toggleBold,
    toggleItalic,
    toggleStrikethrough,
    toggleSuperscript,
    toggleSubscript,
} from "./toolbar_commands";
import {
    inLastTableCell,
    insertParagraphAfterTable,
    insertParagraphAfterCodeBlock,
    insertParagraphAfterBlockquote,
    deleteTable,
} from "./toolbar_utils";

/**
 * Plugin that preserves active formatting marks (like bold/italic) when starting a new paragraph.
 * Ensures formatting is not lost when pressing Enter at the start of a line.
 * @returns {Plugin} ProseMirror plugin instance.
 */
export function preserveMarksPlugin(): Plugin {
    return new Plugin({
        appendTransaction(transactions, oldState, newState) {
            const lastTr = transactions[transactions.length - 1];
            if (!lastTr || !lastTr.docChanged) return null;
            const { $from, empty } = newState.selection;
            if (!empty) return null;
            if ($from.parentOffset !== 0) return null;
            const prevStored = oldState.storedMarks;
            const prevMarks =
                prevStored && prevStored.length
                    ? prevStored
                    : oldState.selection.$from.marks();
            if (!prevMarks || prevMarks.length === 0) return null;
            return newState.tr.setStoredMarks(prevMarks);
        },
    });
}

/**
 * Normalizes reference link nodes, converting them back to plain text when they
 * no longer match the `[](#label)` pattern.
 * @param {Schema} schema - The ProseMirror schema.
 * @returns {Plugin} ProseMirror plugin for reference link normalization.
 */
export function referenceLinkNormalizePlugin(schema: Schema): Plugin {
    return new Plugin({
        appendTransaction(transactions, _oldState, newState) {
            if (!transactions.some((tr) => tr.docChanged)) return null;
            const referenceLink = schema.nodes.referenceLink;
            if (!referenceLink) return null;
            const replacements: { pos: number; size: number; text: string }[] =
                [];

            newState.doc.descendants((node, pos) => {
                if (node.type === referenceLink) {
                    const text = node.textContent;
                    if (!/^\[\]\(#.+\)$/.test(text)) {
                        replacements.push({
                            pos,
                            size: node.nodeSize,
                            text,
                        });
                    }
                }
            });

            if (replacements.length === 0) return null;

            const tr = newState.tr;
            for (let i = replacements.length - 1; i >= 0; i -= 1) {
                const { pos, size, text } = replacements[i];
                tr.replaceWith(
                    pos,
                    pos + size,
                    newState.schema.text(text),
                );
            }
            return tr;
        },
    });
}

// --- Keymaps ---

/**
 * Keymap for formatting shortcuts (bold, italic, strikethrough, superscript, subscript).
 * Enables standard hotkeys for text formatting in the editor.
 * @param {Schema} _schema - The ProseMirror schema.
 * @returns {Plugin} Keymap plugin for formatting.
 */
export function formattingKeymap(_schema: Schema): Plugin {
    return keymap({
        "Mod-b": toggleBold,
        "Mod-i": toggleItalic,
        "Mod-Shift-x": toggleStrikethrough,
        "Mod-.": toggleSuperscript,
        "Mod-,": toggleSubscript,
    });
}

/**
 * Keymap for list editing: handles Enter (split/lift), Tab (indent), and Shift-Tab (outdent) in lists.
 * @param {Schema} schema - The ProseMirror schema.
 * @returns {Plugin} Keymap plugin for list item editing.
 */
export function customListKeymap(schema: Schema): Plugin {
    return keymap({
        Enter: (state, dispatch) => {
            if (splitListItem(schema.nodes.listItem)(state, dispatch))
                return true;
            return liftListItem(schema.nodes.listItem)(state, dispatch);
        },
        Tab: sinkListItem(schema.nodes.listItem),
        "Shift-Tab": liftListItem(schema.nodes.listItem),
    });
}

/**
 * Keymap for exiting tables, code blocks, and blockquotes with Mod-Enter.
 * Inserts a new paragraph after the current block when at the end of a special block.
 * @param {Schema} schema - The ProseMirror schema.
 * @returns {Plugin} Keymap plugin for exiting blocks.
 */
export function tableAndCodeExitKeymap(_schema: Schema): Plugin {
    return keymap({
        "Mod-Enter": chainCommands((state, dispatch) => {
            if (inLastTableCell(state)) {
                return insertParagraphAfterTable()(state, dispatch);
            }
            if (state.selection.$from.parent.type.name === "code_block") {
                return insertParagraphAfterCodeBlock()(state, dispatch);
            }
            if (state.selection.$from.parent.type.name === "blockquote") {
                return insertParagraphAfterBlockquote()(state, dispatch);
            }
            return false;
        }),
    });
}

/**
 * Keymap for deleting the entire table with Mod-Backspace or Mod-Delete when the table is selected.
 * @returns {Plugin} Keymap plugin for table deletion.
 */
export function tableDeleteKeymap(): Plugin {
    return keymap({
        "Mod-Backspace": deleteTable(),
        "Mod-Delete": deleteTable(),
    });
}

/**
 * Plugin that converts typed `[](#label)` into a reference link node.
 * Keeps the displayed text as typed while preserving the markdown on save.
 * @param {Schema} schema - The ProseMirror schema.
 * @returns {Plugin} ProseMirror plugin for reference link handling.
 */
export function referenceLinkInputPlugin(schema: Schema): Plugin {
    return new Plugin({
        props: {
            handleTextInput(view, from, to, text) {
                const tr = view.state.tr.insertText(text, from, to);
                const $from = tr.doc.resolve(from + text.length);
                const start = Math.max(0, $from.pos - 64);
                const end = $from.pos;
                const recent = tr.doc.textBetween(start, end, "\n");
                const match = recent.match(/\[\]\(#([^)]+)\)$/);
                if (!match) {
                    view.dispatch(tr);
                    return true;
                }
                const label = match[1];
                const matchStart = end - match[0].length;
                const node = schema.nodes.referenceLink.create(
                    {},
                    schema.text(`[](#${label})`),
                );
                tr.replaceWith(matchStart, end, node);
                view.dispatch(tr);
                return true;
            },
        },
    });
}

/**
 * Keymap for deleting a math node with Mod-Backspace or Mod-Delete when the math node is selected.
 * @param {Schema} schema - The ProseMirror schema.
 * @returns {Plugin} Keymap plugin for math node deletion.
 */
export function mathDeleteKeymap(schema: Schema): Plugin {
    return keymap({
        "Mod-Backspace": (state, dispatch) => {
            const { $from } = state.selection;
            for (let d = $from.depth; d > 0; d--) {
                const node = $from.node(d);
                if (node.type === schema.nodes.math) {
                    const pos = $from.before(d);
                    if (dispatch) {
                        let tr = state.tr.setSelection(
                            NodeSelection.create(state.doc, pos),
                        );
                        tr = tr.deleteSelection();
                        dispatch(tr.scrollIntoView());
                    }
                    return true;
                }
            }
            return false;
        },
        "Mod-Delete": (state, dispatch) => {
            const { $from } = state.selection;
            for (let d = $from.depth; d > 0; d--) {
                const node = $from.node(d);
                if (node.type === schema.nodes.math) {
                    const pos = $from.before(d);
                    if (dispatch) {
                        let tr = state.tr.setSelection(
                            NodeSelection.create(state.doc, pos),
                        );
                        tr = tr.deleteSelection();
                        dispatch(tr.scrollIntoView());
                    }
                    return true;
                }
            }
            return false;
        },
    });
}

/**
 * Keymap for code block editing:
 * - Shift-Enter: Insert line break.
 * - Tab/Shift-Tab: Indent/unindent.
 * - Auto-closing pairs for brackets, quotes, and backticks.
 * @param {Schema} schema - The ProseMirror schema.
 * @returns {Plugin} Keymap plugin for code block editing.
 */
export function codeBlockKeymap(schema: Schema): Plugin {
    return keymap({
        "Shift-Enter": (state, dispatch) => {
            const { $from } = state.selection;
            for (let d = $from.depth; d > 0; d--) {
                if ($from.node(d).type === schema.nodes.code_block) {
                    if (dispatch) {
                        dispatch(
                            state.tr
                                .replaceSelectionWith(
                                    schema.nodes.break.create(),
                                )
                                .scrollIntoView(),
                        );
                    }
                    return true;
                }
            }
            if (dispatch) {
                dispatch(
                    state.tr
                        .replaceSelectionWith(schema.nodes.break.create())
                        .scrollIntoView(),
                );
            }
            return true;
        },
        Tab: (state, dispatch) => {
            const { $from, $to } = state.selection;
            for (let d = $from.depth; d > 0; d--) {
                if ($from.node(d).type === schema.nodes.code_block) {
                    if (dispatch) {
                        let tr = state.tr;
                        if (state.selection.empty) {
                            tr = tr.insertText("  ");
                        } else {
                            const start = $from.pos;
                            const end = $to.pos;
                            let text = state.doc.textBetween(start, end, "\n");
                            text = text.replace(/^/gm, "  ");
                            tr = tr.replaceSelectionWith(
                                state.schema.text(text),
                            );
                            tr = tr.setSelection(
                                TextSelection.create(
                                    tr.doc,
                                    start,
                                    start + text.length,
                                ),
                            );
                        }
                        dispatch(tr.scrollIntoView());
                    }
                    return true;
                }
            }
            return false;
        },
        "Shift-Tab": (state, dispatch) => {
            const { $from, $to } = state.selection;
            for (let d = $from.depth; d > 0; d--) {
                if ($from.node(d).type === schema.nodes.code_block) {
                    if (dispatch) {
                        let tr = state.tr;
                        const start = $from.pos;
                        const end = $to.pos;
                        let text = state.doc.textBetween(start, end, "\n");
                        text = text.replace(/^ {1,2}/gm, "");
                        tr = tr.replaceSelectionWith(state.schema.text(text));
                        tr = tr.setSelection(
                            TextSelection.create(
                                tr.doc,
                                start,
                                start + text.length,
                            ),
                        );
                        dispatch(tr.scrollIntoView());
                    }
                    return true;
                }
            }
            return false;
        },
        "(": autoClosePair("(", ")", schema),
        "[": autoClosePair("[", "]", schema),
        "{": autoClosePair("{", "}", schema),
        '"': autoClosePair('"', '"', schema),
        "'": autoClosePair("'", "'", schema),
        "`": autoClosePair("`", "`", schema),
    });
}

/**
 * Utility for auto-closing pairs like (), [], {}, "", '', and `` in code blocks.
 * Inserts both open and close character and places the cursor between them.
 * @param {string} open - The opening character.
 * @param {string} close - The closing character.
 * @param {Schema} schema - The ProseMirror schema.
 * @returns {Command} ProseMirror command for auto-closing pairs.
 */
function autoClosePair(open: string, close: string, schema: Schema): Command {
    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        const { $from } = state.selection;
        for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type === schema.nodes.code_block) {
                if (dispatch) {
                    const tr = state.tr.insertText(open + close);
                    const pos = state.selection.from + 1;
                    dispatch(
                        tr.setSelection(TextSelection.create(tr.doc, pos)),
                    );
                }
                return true;
            }
        }
        return false;
    };
}
