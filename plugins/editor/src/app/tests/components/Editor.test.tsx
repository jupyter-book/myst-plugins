import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "solid-js/web";
import {
  Editor,
  useEditorState,
  useEditorView,
  useDispatchCommand,
  useCommand,
  dispatchCommand,
} from "../../src/components/Editor";
import { schema } from "../../src/lib/schema";
import { Command } from "prosemirror-state";
import { createEffect } from "solid-js";

describe("<Editor />", () => {
  afterEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  // --- Basic logic for Editor component ---

  it("renders without crashing", () => {
    expect(() =>
      render(() => <Editor schema={schema} />, document.body),
    ).not.toThrow();
  });

  it("mounts the editor container in the DOM", () => {
    render(() => <Editor schema={schema} />, document.body);
    const divs = document.body.querySelectorAll("div");
    expect(divs.length).toBeGreaterThan(0);
  });

  it("provides editor context to children", () => {
    let contextAvailable = false;
    function DummyChild() {
      contextAvailable = !!useEditorState();
      return null;
    }
    render(
      () => (
        <Editor schema={schema}>
          <DummyChild />
        </Editor>
      ),
      document.body,
    );
    expect(contextAvailable).toBe(true);
  });

  it("renders children", () => {
    render(
      () => (
        <Editor schema={schema}>
          <span data-testid="child">Hello</span>
        </Editor>
      ),
      document.body,
    );
    expect(document.querySelector('[data-testid="child"]')).not.toBeNull();
  });

  // --- Logic specific to the Editor ---

  it("useEditorView provides the EditorView instance", () => {
    let viewAvailable = false;
    function DummyChild() {
      viewAvailable = !!useEditorView();
      return null;
    }
    render(
      () => (
        <Editor schema={schema}>
          <DummyChild />
        </Editor>
      ),
      document.body,
    );
    expect(viewAvailable).toBe(true);
  });

  it("dispatchCommand executes a command", () => {
    let called = false;
    const dummyCommand: Command = () => {
      called = true;
      return true;
    };
    function DummyChild() {
      const view = useEditorView();
      createEffect(() => {
        // Ensure editor content is available before dispatching
        if (view && view()) {
          dispatchCommand(dummyCommand);
        }
      });
      return null;
    }
    render(
      () => (
        <Editor schema={schema}>
          <DummyChild />
        </Editor>
      ),
      document.body,
    );
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(called).toBe(true);
        resolve(undefined);
      }, 10);
    });
  });

  it("useDispatchCommand returns a function that dispatches a command", () => {
    let called = false;
    const dummyCommand: Command = () => {
      called = true;
      return true;
    };
    function DummyChild() {
      const dispatch = useDispatchCommand();
      setTimeout(() => dispatch(dummyCommand), 0);
      return null;
    }
    render(
      () => (
        <Editor schema={schema}>
          <DummyChild />
        </Editor>
      ),
      document.body,
    );
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(called).toBe(true);
        resolve(undefined);
      }, 10);
    });
  });

  it("useCommand returns the result of a command", () => {
    const dummyCommand: Command = () => true;
    let result: unknown;
    function DummyChild() {
      result = useCommand(dummyCommand)();
      return null;
    }
    render(
      () => (
        <Editor schema={schema}>
          <DummyChild />
        </Editor>
      ),
      document.body,
    );
    expect(result).toBe(true);
  });
});
