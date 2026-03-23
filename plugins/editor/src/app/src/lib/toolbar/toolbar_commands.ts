import {
    lift,
    toggleMark,
    wrapIn,
    setBlockType,
    autoJoin,
} from "prosemirror-commands";
import { schema } from "../schema";
import { EditorState, Transaction } from "prosemirror-state";
import { MarkType, Schema, NodeType } from "prosemirror-model";
import {
    wrapInList,
    liftListItem,
    sinkListItem,
} from "prosemirror-schema-list";
import { getCurrentListType } from "./toolbar_utils";

// === MARK COMMANDS ===
export const toggleBold = toggleMark(schema.marks.strong);
export const toggleItalic = toggleMark(schema.marks.emphasis);
export const toggleSuperscript = toggleMark(schema.marks.superscript);
export const toggleSubscript = toggleMark(schema.marks.subscript);
export const toggleStrikethrough = toggleMark(schema.marks.strikethrough);
export const toggleInlineCode = toggleMark(schema.marks.code);

// === BLOCK COMMANDS ===
export const setBlockquote = wrapIn(schema.nodes.blockquote);
export const setCodeBlock = setBlockType(schema.nodes.code_block);
export function setHeading(level: number) {
    return setBlockType(schema.nodes.heading, { level });
}
export function setParagraph() {
    return setBlockType(schema.nodes.paragraph);
}

// === LIST COMMANDS ===
/**
 * Wraps the current selection in a bullet list.
 */
export const wrapBulletList = (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
) => wrapInList(schema.nodes.list, { ordered: false })(state, dispatch);

/**
 * Wraps the current selection in an ordered list.
 */
export const wrapOrderedList = (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
) => wrapInList(schema.nodes.list, { ordered: true })(state, dispatch);

export const increaseIndent = () => sinkListItem(schema.nodes.listItem);
export const decreaseIndent = () => liftListItem(schema.nodes.listItem);

/**
 * Toggles a bullet list for the current selection.
 * If already in a bullet list, removes it; otherwise, wraps in a bullet list.
 * @param {Schema} schema - The ProseMirror schema.
 * @returns {Command}
 */
export function toggleBulletList(schema: Schema) {
    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        const { listItem, list } = schema.nodes;
        if (selectionHasList(state, listItem)) {
            // Remove all lists in selection
            return liftListItems(state, dispatch) || false;
        } else {
            // Wrap all blocks in a bullet list and auto-join adjacent lists
            return autoJoin(
                wrapInList(list, { ordered: false }),
                (before, after) =>
                    before.type === after.type &&
                    before.type === list &&
                    before.attrs.ordered === after.attrs.ordered,
            )(state, dispatch);
        }
    };
}

/**
 * Toggles an ordered list for the current selection.
 * If already in an ordered list, removes it; otherwise, wraps in an ordered list.
 * @param {Schema} schema - The ProseMirror schema.
 * @returns {Command}
 */
export function toggleOrderedList(schema: Schema) {
    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        const listType = getCurrentListType(state);
        if (listType === "ordered") {
            // Already in ordered list: remove
            return liftListItem(schema.nodes.listItem)(state, dispatch);
        } else if (listType === "bullet") {
            // In bullet list: lift out, then wrap as ordered
            if (dispatch) {
                liftListItem(schema.nodes.listItem)(state, dispatch);
                autoJoin(
                    wrapInList(schema.nodes.list, { ordered: true }),
                    (before, after) =>
                        before.type === after.type &&
                        before.type === schema.nodes.list &&
                        before.attrs.ordered === after.attrs.ordered,
                )(state, dispatch);
            }
            return true;
        } else {
            // Not in a list: wrap as ordered
            return autoJoin(
                wrapInList(schema.nodes.list, { ordered: true }),
                (before, after) =>
                    before.type === after.type &&
                    before.type === schema.nodes.list &&
                    before.attrs.ordered === after.attrs.ordered,
            )(state, dispatch);
        }
    };
}

// === BLOCKQUOTE & CODE BLOCK TOGGLE COMMANDS ===
/**
 * Toggles a blockquote for the current selection.
 * If already in a blockquote, lifts out; otherwise, wraps in a blockquote.
 * @param {EditorState} state
 * @param {function} [dispatch]
 * @returns {boolean}
 */
export function toggleBlockquote(
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
) {
    const { schema } = state;
    const { from, to } = state.selection;
    let inBlockquote = false;

    state.doc.nodesBetween(from, to, (node) => {
        if (node.type === schema.nodes.blockquote) inBlockquote = true;
    });

    if (inBlockquote) {
        // If already in blockquote, lift out
        return lift(state, dispatch);
    } else {
        // Otherwise, wrap in blockquote
        return wrapIn(schema.nodes.blockquote)(state, dispatch);
    }
}

/**
 * Toggles a code block for the current selection.
 * If already in a code block, sets to paragraph; otherwise, sets to code block.
 * @param {EditorState} state
 * @param {function} [dispatch]
 * @returns {boolean}
 */
export function toggleCodeBlock(
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
) {
    const { schema } = state;
    const { from, to } = state.selection;
    let allCode = true;

    state.doc.nodesBetween(from, to, (node) => {
        if (node.isTextblock && node.type !== schema.nodes.code_block)
            allCode = false;
    });

    if (allCode) {
        // If all are code blocks, set them back to paragraph
        return setBlockType(schema.nodes.paragraph)(state, dispatch);
    } else {
        // Otherwise, set all to code block
        return setBlockType(schema.nodes.code_block)(state, dispatch);
    }
}

// === LINK/IMAGE/MATH/TABLE COMMANDS ===
/**
 * Inserts a link at the current selection.
 * @param {string} [url=""] - The link URL.
 * @param {string} [title=""] - The link title.
 * @returns {Command}
 */
export function insertLink(url = "", title = "") {
    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        const { from, to, empty } = state.selection;
        const markType: MarkType = schema.marks.link;
        let tr = state.tr;

        if (empty) {
            const textNode = state.schema.text(title || url);
            tr = tr.insert(from, textNode);
            tr = tr.addMark(
                from,
                from + (title || url).length,
                markType.create({ url, title, reference: null }),
            );
        } else {
            tr = tr.addMark(from, to, markType.create({ url, title }));
        }

        if (dispatch) dispatch(tr.scrollIntoView());
        return true;
    };
}

/**
 * Inserts an image at the current selection.
 * @param {string} url - The image URL.
 * @param {string} [alt=""] - The alt text.
 * @param {string} [title=""] - The image title.
 * @returns {Command}
 */
export function insertImage(url: string, alt = "", title = "") {
    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        const { schema, selection } = state;
        const imageNode = schema.nodes.image.create({
            url,
            alt,
            title,
            reference: null,
        });

        // If selection is empty, try to insert as a block
        if (selection.empty) {
            // Insert image as a new block after the current block
            const { $from } = selection;
            const pos = $from.after();
            if (dispatch) {
                dispatch(state.tr.insert(pos, imageNode).scrollIntoView());
            }
            return true;
        } else {
            // Replace selection with image
            if (dispatch) {
                dispatch(
                    state.tr.replaceSelectionWith(imageNode).scrollIntoView(),
                );
            }
            return true;
        }
    };
}

/**
 * Inserts a math node at the current selection.
 * @param {string} [equation=""] - The LaTeX equation.
 * @param {string} [label] - Optional MyST label for the equation.
 * @returns {Command}
 */
export function insertMath(equation: string = "", label?: string) {
    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        const { schema } = state;
        const attrs = label ? { enumerated: false, label } : { enumerated: false };
        const mathNode = schema.nodes.math.create(
            attrs,
            schema.text(equation),
        );
        if (dispatch) {
            dispatch(state.tr.replaceSelectionWith(mathNode).scrollIntoView());
        }
        return true;
    };
}

/**
 * Inserts a table with the given number of rows and columns at the current selection.
 * @param {number} rows - Number of rows.
 * @param {number} cols - Number of columns.
 * @returns {Command}
 */
export function insertTable(rows: number, cols: number) {
    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        const { table, tableRow, tableCell, paragraph } = schema.nodes;

        const rowNodes = [];

        for (let r = 0; r < rows; r++) {
            const cellNodes = [];
            for (let c = 0; c < cols; c++) {
                const cellContent = paragraph.create();
                cellNodes.push(tableCell.create(null, cellContent));
            }
            rowNodes.push(tableRow.create(null, cellNodes));
        }

        const tableNode = table.create(null, rowNodes);
        const before = paragraph.create();
        const after = paragraph.create();

        const content = state.schema.nodes.root
            ? state.schema.nodes.root.create(null, [before, tableNode, after])
            : state.schema.nodes.doc.create(null, [before, tableNode, after]);

        if (dispatch) {
            const tr = state.tr.replaceSelectionWith(content).scrollIntoView();
            dispatch(tr);
        }

        return true;
    };
}

// === PRIVATE/HELPER FUNCTIONS ===

/**
 * Checks if the current selection contains any list items of the given type.
 * @param {EditorState} state - The editor state.
 * @param {NodeType} listItemType - The list item node type to check for.
 * @returns {boolean} True if any list items of the given type are found in the selection.
 */
function selectionHasList(state: EditorState, listItemType: NodeType) {
    let found = false;
    state.doc.nodesBetween(state.selection.from, state.selection.to, (node) => {
        if (node.type === listItemType) found = true;
    });
    return found;
}

/**
 * Lifts all list items in the current selection out of their lists.
 * @param {EditorState} state - The editor state.
 * @param {function} [dispatch] - Optional dispatch function for transactions.
 * @returns {boolean} True if any list items were lifted.
 */
function liftListItems(
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
) {
    const { tr, selection, schema } = state;
    let modified = false;
    state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
        if (node.type === schema.nodes.listItem) {
            const $pos = tr.doc.resolve(tr.mapping.map(pos));
            const range = $pos.blockRange();
            if (range) {
                tr.lift(range, 0);
                modified = true;
            }
        }
    });
    if (modified && dispatch) dispatch(tr.scrollIntoView());
    return modified;
}
