import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "solid-js/web";
import App from "../src/App";
import "fake-indexeddb/auto"; // requried to use the database in tests

describe("<App />", () => {
  afterEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("renders without crashing", () => {
    expect(() => render(() => <App />, document.body)).not.toThrow();
  });

  it("mounts the App component in the DOM", () => {
    render(() => <App />, document.body);
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it("renders the editor root element", () => {
    render(() => <App />, document.body);
    const pmRoot = document.querySelector(".ProseMirror");
    expect(pmRoot).not.toBeNull();
    expect(pmRoot?.getAttribute("contenteditable")).toBe("true");
  });

  it("renders the toolbar", () => {
    render(() => <App />, document.body);
    const toolbar = document.querySelector(".d-flex.align-items-center");
    expect(toolbar).not.toBeNull();
  });
});
