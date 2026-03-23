import { Component, useContext } from "solid-js";
import "prosemirror-view/style/prosemirror.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { editorContext } from "../Editor";
import { toolbarButtons } from "../../lib/toolbar/toolbar_buttons";
import { toolbarDropdowns } from "../../lib/toolbar/toolbar_dropdowns";
import { GitHubDropdown } from "../github/GitHubDropdown";
import { ToolbarHintButton } from "./ToolbarHintButton";
import { BranchDropdown } from "../github/BranchDropdown";

// --- Main Toolbar Component ---
// The main toolbar with all formatting and insert controls
export const Toolbar: Component = () => {
  const ctx = useContext(editorContext);

  // Pass context state/handlers to buttons/dropdowns
  if (ctx) {
    toolbarButtons.createButtons(ctx);
    toolbarDropdowns.createDropdowns(ctx);
  }

  // --- Render Toolbar ---
  return (
    <div
      class="d-flex align-items-center p-2 border-bottom flex-wrap"
      style={{
        top: "48px",
        "z-index": 100,
        background: "var(--toolbar-bg)",
      }}
    >
      {toolbarButtons.undoButton}
      {toolbarButtons.redoButton}
      <div class="toolbar-separator" />
      {toolbarButtons.formatButton}
      <div class="toolbar-separator" />
      {toolbarButtons.boldButton}
      {toolbarButtons.italicsButton}
      {toolbarButtons.strikeThroughButton}
      {toolbarButtons.superscriptButton}
      {toolbarButtons.subscriptButton}
      <div class="toolbar-separator" />
      {toolbarDropdowns.headerDropdown}
      <div class="toolbar-separator" />
      {toolbarDropdowns.listDropdown}
      {toolbarButtons.indentButton}
      {toolbarButtons.outdentButton}
      {toolbarButtons.quoteButton}
      {toolbarButtons.codeButton}
      <div class="toolbar-separator" />
      {toolbarDropdowns.insertDropdown}
      <div class="toolbar-separator" />
      <ToolbarHintButton
        label="Editor usage hints"
        hint={`Ctrl + Enter: Exit table in new line
          Ctrl + Enter: Exit quote/codeblock
          Double click math: Edit inline
          Ctrl + Backspace: Delete math equation
          Ctrl + Backspace: Delete codeblock`}
      />
      <div class="ms-auto d-flex align-items-right">
        <BranchDropdown />
        <GitHubDropdown />
      </div>
    </div>
  );
};

export default Toolbar;
