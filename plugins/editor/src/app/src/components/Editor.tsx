import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
  ParentComponent,
  Setter,
  untrack,
  useContext,
} from "solid-js";
import type { Schema } from "prosemirror-model";
import { Command, EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { history, redo, undo } from "prosemirror-history";
import { baseKeymap } from "prosemirror-commands";
import {
  currentFileHref,
  getFilePathFromHref,
} from "../lib/github/GithubUtility";
import { database } from "../lib/localStorage/database";
import { parseMyst, proseMirrorToMarkdown } from "../lib/parser";
import { ImageNodeView } from "./toolbar/nodeviews/ImageNodeView";
import { MathNodeView } from "./toolbar/nodeviews/MathNodeView";
import {
  customListKeymap,
  tableAndCodeExitKeymap,
  codeBlockKeymap,
  mathDeleteKeymap,
  referenceLinkInputPlugin,
  referenceLinkNormalizePlugin,
  //tableAfterDeleteKeymap,
  preserveMarksPlugin,
  formattingKeymap,
  tableDeleteKeymap,
} from "../lib/toolbar/editor_plugins";
import { tableEditing } from "prosemirror-tables";
import { github } from "../lib/github/githubInteraction";
import type { FormatPainterState } from "../lib/toolbar/toolbar_utils";

/**
 * Editor is the main ProseMirror-based editor component.
 *
 * - Provides all editor and toolbar state via context (`editorContext`), including editor state, view, format painter, and dropdown state.
 * - Handles initialization, loading, and saving of document content.
 * - Registers custom node views (math, image) and ProseMirror plugins for rich editing features.
 * - Exports utility hooks and functions for toolbar and command integration:
 *   - `useEditorState()`: Access the current editor state from context.
 *   - `useEditorView()`: Access the current EditorView from context.
 *   - `dispatchCommand(cmd)`: Dispatch a ProseMirror command using the current view.
 *   - `useDispatchCommand()`: Returns a function to dispatch commands with focus management.
 *   - `getEditorContentAsMarkdown()`: Get the current document as markdown.
 *   - `saveEditorContentToDatabase()`: Save the current document to local storage.
 *
 * Usage: Wrap your app or editor UI in the `<Editor>` component and use the context or exported hooks to interact with the editor state and commands.
 */

export interface EditorProps {
  schema: Schema;
}

export interface EditorContextType {
  state: Accessor<EditorState>;
  setState: Setter<EditorState>;
  view: Accessor<EditorView>;
  setView: Setter<EditorView>;
  formatPainter: Accessor<FormatPainterState>;
  setFormatPainter: Setter<FormatPainterState>;
  openDropdown: Accessor<string | null>;
  setOpenDropdown: Setter<string | null>;
}

export const editorContext = createContext<EditorContextType>();

export function useEditorState() {
  const ctx = useContext(editorContext);
  if (!ctx) throw new Error("Editor state used outside of editor context");
  const currentState =
    typeof ctx.state === "function" ? ctx.state : () => ctx.view().state;
  return currentState;
}

export function useEditorView() {
  const ctx = useContext(editorContext);
  if (!ctx) throw new Error("Editor state used outside of editor context");
  return ctx.view;
}
let globalEditorView: EditorView | null = null;

export function useCommand(cmd: Command) {
  const output = createMemo(() => {
    const ctx = useContext(editorContext);
    if (!ctx) throw new Error("Editor state used outside of editor context");

    const currentState =
      typeof ctx.state === "function" ? ctx.state() : ctx.view().state;
    const res = cmd(currentState, undefined, ctx.view());
    console.log("a", res);
    return res;
  });
  return output;
}

export function dispatchCommand(cmd: Command) {
  const ctx = useContext(editorContext);
  if (!ctx) throw new Error("Editor context used outside of editor");

  const currentState =
    typeof ctx.state === "function" ? ctx.state() : ctx.view().state;
  const view = ctx.view();
  return cmd(currentState, view.dispatch, view);
}

// This is a wrapper around dispatchCommand that returns a function
export function useDispatchCommand() {
  const ctx = useContext(editorContext);
  if (!ctx) throw new Error("Editor context used outside of editor");
  return (cmd: Command) => {
    const currentState =
      typeof ctx.state === "function" ? ctx.state() : ctx.view().state;
    const view = ctx.view();
    const result = cmd(currentState, view.dispatch, view);

    view.focus();
    return result;
  };
}

export let state: Accessor<EditorState>;
export let setState: Setter<EditorState>;

export const Editor: ParentComponent<EditorProps> = (props) => {
  const [ref, setRef] = createSignal<HTMLDivElement>();

  const [stateSignal, setStateSignal] = createSignal<EditorState>(
    untrack(() => EditorState.create({ schema: props.schema, plugins: [] })),
    {
      equals: false,
    },
  );
  state = stateSignal;
  setState = setStateSignal;

  const [viewSignal, setView] = createSignal<EditorView>(
    null as unknown as EditorView,
  );
  const [formatPainter, setFormatPainter] =
    createSignal<FormatPainterState>(null);
  const [openDropdown, setOpenDropdown] = createSignal<string | null>(null);

  const editorState = createMemo(() =>
    EditorState.create({
      schema: props.schema,
      plugins: [
        history(),
        customListKeymap(props.schema),
        preserveMarksPlugin(),
        referenceLinkInputPlugin(props.schema),
        referenceLinkNormalizePlugin(props.schema),
        codeBlockKeymap(props.schema),
        tableAndCodeExitKeymap(props.schema),
        mathDeleteKeymap(props.schema),
        tableDeleteKeymap(),
        //tableAfterDeleteKeymap(props.schema),
        tableEditing(),
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
          "Mod-Shift-z": redo,
        }),
        keymap(baseKeymap),
        formattingKeymap(props.schema),
        new Plugin({
          view() {
            return {
              update(view, _prevState) {
                setState(view.state);
              },
            };
          },
        }),
      ],
    }),
  );

  const view = createMemo(() => {
    const v = new EditorView(ref()!, {
      state: editorState(),
      nodeViews: {
        math(node, view, getPos) {
          const safeGetPos = () => {
            const pos = getPos?.();
            if (typeof pos !== "number") {
              throw new Error("getPos is undefined or not a number");
            }
            return pos;
          };
          return new MathNodeView(node, view, safeGetPos);
        },
        image(node, view, getPos) {
          const safeGetPos = () => {
            const pos = getPos?.();
            if (typeof pos !== "number")
              throw new Error("getPos is undefined or not a number");
            return pos;
          };
          return new ImageNodeView(node, view, safeGetPos);
        },
      },
    });
    setView(v); // <-- This ensures viewSignal is always the real view
    return v;
  });
  onCleanup(() => view().destroy());

  onMount(() => {
    globalEditorView = view();

    const el = ref();
    if (!el) return;
    el.addEventListener("click", (event) => {
      const e = event as MouseEvent;
      // Check for Ctrl (Windows/Linux) or Meta (Mac)
      if ((e.ctrlKey || e.metaKey) && e.target instanceof HTMLElement) {
        const link = e.target.closest("a");
        if (link && link.href) {
          window.open(link.href, "_blank");
          e.preventDefault();
        }
      }
    });
  });

  // Add this effect to reload file when branch changes
  createEffect(
    on(
      () => github.getBranch(),
      (branch: string) => {
        if (!branch) return;
        loadCurrentFileIntoEditor();
      },
    ),
  );

  // Add this method to load and parse the current file into the editor
  async function loadCurrentFileIntoEditor() {
    const fileHref = currentFileHref();
    const filePath = getFilePathFromHref(fileHref);
    if (!filePath) return;

    // Try to load markdown content from the database for the current branch/repo
    let markdown = await database.load<string>("markdown", filePath);

    // Debugging stuf
    // if (markdown) console.log("Database markdown: \n" + markdown);

    // If not found or empty, try to fetch from GitHub
    if (!markdown) {
      if (github.getBranch() != "") {
        // Try to fetch from the current branch first (and fallback to default branch)
        try {
          markdown = await github.fetchFileFromBranch(
            filePath,
            github.getBranch(),
          );
        } catch (e) {
          console.trace(e);
          markdown = await github.fetchFileFromBranch(
            filePath,
            (await github.fetchRepoInfo()).default_branch,
          );
        }
      }

      // Debugging stuff
      // console.log("Git markdown: \n" + markdown);
    }

    if (!markdown) return;

    // Parse markdown into a ProseMirror Node
    const doc = parseMyst(markdown);

    console.log("doc", doc, "and markdown: ", markdown);

    // Debugging
    // console.log("Parsed: \n" + doc);

    // Get the current view instance
    const editorView = view();

    // Create new state
    const newState = EditorState.create({
      schema: editorView.state.schema,
      doc,
      plugins: editorView.state.plugins,
    });

    // Debugging stuff
    // console.log("New doc created:", newState.doc);

    // Set the new state
    editorView.updateState(newState);
    setState(newState);

    // save content
    console.log("saving after loading...");
    await saveEditorContentToDatabase();
  }

  return (
    <editorContext.Provider
      value={{
        state: stateSignal,
        setState: setStateSignal,
        view: viewSignal,
        setView,
        formatPainter,
        setFormatPainter,
        openDropdown,
        setOpenDropdown,
      }}
    >
      <>
        {props.children}
        <div ref={setRef} />
      </>
    </editorContext.Provider>
  );
};

// Optionally export for use elsewhere
export function getEditorContentAsMarkdown(): string {
  if (!globalEditorView) {
    console.warn(" getEditorContentAsMarkdown: no view");
    return "";
  }
  return proseMirrorToMarkdown(globalEditorView.state.doc);
}

export async function saveEditorContentToDatabase() {
  const fileHref = currentFileHref();
  const filePath = getFilePathFromHref(fileHref);
  if (!filePath) return;
  const content = getEditorContentAsMarkdown();

  console.log("saving...");
  console.log("file path: " + filePath);
  console.log("content: " + content);

  if (filePath && content && database.isInitialised()) {
    await database.save<string>("markdown", filePath, content);
  }
}
