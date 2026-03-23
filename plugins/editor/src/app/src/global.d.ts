declare global {
    interface Window {
        __getEditorMarkdown?: () => string;
    }
}
export {};
