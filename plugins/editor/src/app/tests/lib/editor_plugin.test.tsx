import { describe, it, expect } from "vitest";
import { EditorState, Plugin, TextSelection } from "prosemirror-state";
import { schema } from "../../src/lib/schema";
import { preserveMarksPlugin } from "../../src/lib/toolbar/editor_plugins";

// --- Helper to create editor state with bold mark ---
function createStateWithBoldMark(
  preserveMarksPlugin: () => Plugin,
  textNodes = [schema.text("bold", [schema.marks.strong.create()])],
  selectionPos?: number,
) {
  const paragraph = schema.node("paragraph", undefined, textNodes);
  const root = schema.node("root", undefined, [paragraph]);
  const paraPos = 1;
  const endOfParagraph = paraPos + paragraph.nodeSize - 2;
  const selPos = selectionPos ?? endOfParagraph;

  const state = EditorState.create({
    doc: root,
    selection: TextSelection.create(root, selPos),
    plugins: [preserveMarksPlugin()],
  });
  return { state };
}

describe("preserveMarksPlugin", () => {
  it("preserves marks when pressing Enter at the end of a marked text", () => {
    const { state } = createStateWithBoldMark(preserveMarksPlugin);

    let newTr = state.tr.split(state.selection.from);
    newTr = newTr.setSelection(
      TextSelection.create(newTr.doc, newTr.selection.from),
    );

    const plugin = preserveMarksPlugin();
    const newState = state.apply(newTr);
    const appendedTr = plugin.spec.appendTransaction?.(
      [newTr],
      state,
      newState,
    );
    if (appendedTr) {
      const finalState = newState.apply(appendedTr);
      const marks = finalState.storedMarks;
      expect(marks && marks.length).toBeGreaterThan(0);
      expect(marks?.[0].type.name).toBe("strong");
    } else {
      throw new Error("preserveMarksPlugin did not append a transaction");
    }
  });

  it("does not preserve marks if not at the start of a new textblock", () => {
    const { state } = createStateWithBoldMark(
      preserveMarksPlugin,
      [
        schema.text("bold", [schema.marks.strong.create()]),
        schema.text(" normal"),
      ],
      3, // selection in the middle
    );

    const tr = state.tr.insertText("\n", 3);
    const plugin = preserveMarksPlugin();
    const appendedTr = plugin.spec.appendTransaction?.(
      [tr],
      state,
      state.apply(tr),
    );
    expect(appendedTr).toBeNull();
  });
});
