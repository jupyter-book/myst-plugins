import { schema } from "../schema";

import type {
    Node as MystNode,
    Block,
    Paragraph,
    Text,
    Definition,
    HTML,
    Root,
    Heading,
    ThematicBreak,
    Blockquote,
    List,
    ListItem,
    Code,
    InlineCode,
    Target,
    Directive,
    Admonition,
    AdmonitionTitle,
    Container,
    Math,
    InlineMath,
    Break,
    BlockBreak,
    Table,
    FootnoteDefinition,
    Image,
    Caption,
    Emphasis,
    Link,
    PhrasingContent,
    Strong,
    Subscript,
    Superscript,
    Underline,
    TableRow,
} from "myst-spec";
import { Mark, Node, Schema } from "prosemirror-model";
import { unified } from "unified";
import mystToMd from "myst-to-md";
import { Aside, CaptionNumber, Delete, TableCell } from "myst-spec-ext";

type ChildrenOf<T extends MystNode> = T extends { children: infer C }
    ? C
    : never;

type NodeName = typeof schema extends Schema<infer T> ? T : never;

/**
 * Convert all ProseMirror child nodes of node into corresponding MyST nodes.
 * @param node - A ProseMirror node
 * @returns Array of MyST AST nodes for each child
 */
function mystChildren(node: Node): MystNode[] {
    return node.children.map((x) => proseMirrorToMyst(x));
}

/**
 * Wrap a sequence of MyST phrasing content with a single mark.
 * @param mark - ProseMirror mark to convert
 * @param children - Array of existing PhrasingContent nodes
 * @returns A new PhrasingContent node with the given mark applied
 */
function wrapMark(mark: Mark, children: PhrasingContent[]): PhrasingContent {
    switch (mark.type.name) {
        case "code":
            return {
                type: "inlineCode",
                value: children.map((c) => (c as Text).value).join(""),
            } as InlineCode;

        case "unsupported": {
            // Get the new content
            const newTextContent = children
                .map((c) => (c as Text).value)
                .join("");
            if (mark.attrs.editable) {
                // Copy the MystNode and update its value
                const newMystNode = {
                    ...mark.attrs.myst,
                    value: newTextContent,
                };

                // Return with new text
                return newMystNode as PhrasingContent;
            } else {
                try {
                    // Try to parse the edited JSON.
                    return JSON.parse(newTextContent) as PhrasingContent;
                } catch (e) {
                    // If it fails copy the old one
                    console.warn(
                        "Could not parse edited unsupported inline JSON. Reverting to original.",
                        e,
                    );
                    return mark.attrs.myst as PhrasingContent;
                }
            }
        }
        case "strong":
            return { type: "strong", children } as Strong;

        case "em":
        case "emphasis":
            return { type: "emphasis", children } as Emphasis;

        case "superscript":
            return { type: "superscript", children } as Superscript;

        case "subscript":
            return { type: "subscript", children } as Subscript;

        case "underline":
            return { type: "underline", children } as Underline;

        case "strikethrough":
        case "delete":
            return {
                type: "delete",
                children,
            } as Delete as unknown as PhrasingContent;

        case "link": {
            const url = (mark.attrs.href ?? mark.attrs.url) as string;
            const title = (mark.attrs.title ?? "") as string;
            return { type: "link", url, title, children } as Link;
        }

        default:
            // fallback to plain text
            return {
                type: "text",
                value: children.map((c) => (c as Text).value).join(""),
            };
    }
}

function handleChildren<T extends MystNode>(node: Node): ChildrenOf<T> {
    // if this is an inline container (paragraph, heading, etc.)
    if (node.inlineContent) {
        return handleInline(node) as ChildrenOf<T>;
    } else {
        // block‐level
        return node.children.map((x) => proseMirrorToMyst(x)) as ChildrenOf<T>;
    }
}

const proseMirrorToMystHandlers = {
    code_block: (node: Node): Code => ({
        type: "code",
        lang: node.attrs.lang,
        meta: node.attrs.meta,
        value: node.textContent,
    }),
    unsupported_block: (node: Node) => {
        if (node.attrs.editable) {
            const newContent = node.textContent;
            const newMystNode = {
                ...node.attrs.myst,
                value: newContent,
            };
            return newMystNode as MystNode;
        } else {
            // Dangerous! User might fuck up but I think this should be safe
            const editedJson = node.textContent;
            try {
                // Try to parse the edited JSON.
                return JSON.parse(editedJson) as MystNode;
            } catch (e) {
                // If parsing fails, log a warning and revert to the original node.
                console.warn(
                    "Could not parse edited JSON. Copying the original.",
                    e,
                );
                return node.attrs.myst as MystNode;
            }
        }
    },
    root: (node: Node): Root => ({
        type: "root",
        children: handleChildren<Root>(node),
    }),
    block: (node: Node): Block => ({
        type: "block",
        children: handleChildren<Block>(node),
    }),
    paragraph: (node: Node): Paragraph => ({
        type: "paragraph",
        children: handleChildren<Paragraph>(node),
    }),
    definition: (node: Node): Definition => ({
        type: "definition",
        url: node.attrs.url as string,
        identifier: node.attrs.identifier as string,
    }),
    heading: (node: Node): Heading => ({
        type: "heading",
        depth: node.attrs.level as number,
        children: handleChildren<Heading>(node),
    }),
    thematicBreak: (_node: Node): ThematicBreak => ({
        type: "thematicBreak",
    }),
    blockquote: (node: Node): Blockquote => ({
        type: "blockquote",
        children: handleChildren<Blockquote>(node),
    }),
    list: (node: Node): List => ({
        type: "list",
        start: node.attrs.start as number,
        ordered: node.attrs.ordered as boolean,
        spread: node.attrs.spread as boolean,
        children: handleChildren<List>(node),
    }),
    listItem: (node: Node): ListItem => ({
        type: "listItem",
        spread: node.attrs.spread,
        children: handleChildren<ListItem>(node),
    }),
    text: (node: Node): Text => ({
        type: "text",
        value: node.text!,
    }),
    html: (node: Node): HTML => ({
        type: "html",
        value: node.textContent,
    }),
    referenceLink: (node: Node): Link => {
        const match = node.textContent.match(/^\[\]\(#([^)]+)\)$/);
        const label = match?.[1] ?? "";
        return {
            type: "link",
            url: `#${label}`,
            title: "",
            children: [{ type: "text", value: "" }],
        } as Link;
    },
    target: (node: Node): Target => ({
        type: "mystTarget",
        label: node.attrs.label,
    }),
    directive: (node: Node): Directive => ({
        type: "mystDirective",
        name: node.attrs.name as string,
        args: node.attrs.args as string,
        value: node.attrs.value as string,
        children: handleChildren<Directive>(node),
    }),
    admonition: (node: Node): Admonition => ({
        type: "admonition",
        kind: node.attrs.kind,
        ...(node.attrs.class && { class: node.attrs.class }),
        children: mystChildren(node) as ChildrenOf<Admonition>,
    }),
    admonitionTitle: (node: Node): AdmonitionTitle => ({
        type: "admonitionTitle",
        children: handleChildren<AdmonitionTitle>(node),
    }),
    container: (node: Node): Container => ({
        type: "container",
        kind: node.attrs.kind,
        children: handleChildren<Container>(node),
    }),
    math: (node: Node): Math => ({
        type: "math",
        value: node.textContent,
        enumerated: node.attrs.enumerated,
        enumerator: node.attrs.enumerator,
        ...(node.attrs.label ? { label: node.attrs.label } : {}),
    }),
    inlineMath: (node: Node): InlineMath => ({
        type: "inlineMath",
        value: node.textContent,
    }),
    blockBreak: (node: Node): BlockBreak => ({
        type: "blockBreak",
        meta: node.attrs.meta,
    }),
    table: (node: Node): Table => ({
        type: "table",
        children: handleChildren<Table>(node),
    }),
    table_row: (node: Node): TableRow => ({
        type: "tableRow",
        children: handleChildren<TableRow>(node),
    }),
    table_cell: (node: Node): TableCell => {
        const style = node.attrs.style as string | null;
        let align: "left" | "right" | "center" | undefined = undefined;
        if (style) {
            if (style.includes("text-align:center")) align = "center";
            else if (style.includes("text-align:right")) align = "right";
            else if (style.includes("text-align:left")) align = "left";
        }
        return {
            type: "tableCell",
            ...(align && { align }),
            children: handleChildren<TableCell>(node),
        };
    },
    footnoteDefinition: (node: Node): FootnoteDefinition => ({
        type: "footnoteDefinition",
        identifier: node.attrs.identifier,
        children: handleChildren<FootnoteDefinition>(node),
    }),
    break: (_node: Node): Break => ({ type: "break" }),
    image: (node: Node): Image => ({
        type: "image",
        url: node.attrs.url,
        class: node.attrs.class,
        alt: node.attrs.alt,
        align: node.attrs.align,
        width: node.attrs.width,
        title: node.attrs.title,
    }),
    imageWrapper: (wrapper: Node): Image => {
        const node = wrapper.children[0];
        return {
            type: "image",
            url: node.attrs.url,
            class: node.attrs.class,
            alt: node.attrs.alt,
            align: node.attrs.align,
            width: node.attrs.width,
            title: node.attrs.title,
        };
    },
    aside: (node: Node): Aside => ({
        type: "aside",
        ...(node.attrs.label !== undefined ? { label: node.attrs.label } : {}),
        kind: node.attrs.kind,
        children: handleChildren<Aside>(node),
    }),
    caption: (node: Node): Caption => ({
        type: "caption",
        children: handleChildren<Caption>(node),
    }),
    captionNumber: (node: Node): CaptionNumber => ({
        type: "captionNumber",
        kind: node.attrs.kind,
        label: node.attrs.label,
        html_id: node.attrs.html_id,
        enumerator: node.attrs.enumerator,
        identifier: node.attrs.identifier,
        children: handleChildren<CaptionNumber>(node),
    }),
    tableRow: (node: Node): TableRow => ({
        type: "tableRow",
        children: handleChildren<TableRow>(node),
    }),
    tableCell: (node: Node): TableCell => ({
        type: "tableCell",
        align: node.attrs.align,
        width: node.attrs.width,
        colspan: node.attrs.colspan,
        rowspan: node.attrs.rowspan,
        header: node.attrs.header,
        children: handleChildren<TableCell>(node),
    }),
} satisfies Record<NodeName, (node: Node) => MystNode>;

/**
 * Convert a ProseMirror node into its corresponding MyST AST node.
 * @param node - ProseMirror Node
 * @returns A MyST AST node
 */
export function proseMirrorToMyst(node: Node): MystNode {
    return proseMirrorToMystHandlers[node.type.name as NodeName](node);
}

/**
 * Serialize a ProseMirror node back to MyST Markdown.
 * @param node - ProseMirror AST node
 * @returns Markdown string in MyST syntax
 */
export function proseMirrorToMarkdown(node: Node): string {
    const mystAst = proseMirrorToMyst(node);
    const processor = unified().use(mystToMd);
    const mdast = processor.runSync(mystAst as Root);
    const result = processor.stringify(mdast).result as string;
    if (typeof result !== "string") {
        throw new Error("invalid result from remark-stringify");
    }
    return result;
}

/**
 * Convert the inline content of a ProseMirror node (paragraph, heading, etc.) into a
 * flat array of MyST PhrasingContent, preserving the exact nesting of marks.
 * TODO: There is still a bug, not every test case succeeds:
 * Expected: *one **two *three*** four*
 * Received: *one *two **three*** four*
 */
function handleInline(node: Node): PhrasingContent[] {
    const tokens = Array.from(node.content.content);

    type Span = { mark: Mark; first: number; last: number; length: number };

    // 1) Collect positions for each mark instance
    const markMap = new Map<Mark, number[]>();
    tokens.forEach((tok, i) => {
        for (const m of tok.marks) {
            let arr = markMap.get(m);
            if (!arr) {
                arr = [];
                markMap.set(m, arr);
            }
            arr.push(i);
        }
    });

    // 2) Build spans only over truly contiguous runs for each mark,
    //    but break any run if the next token in the doc doesn't have the mark.
    const spans: Span[] = [];
    for (const [mark, positions] of markMap) {
        positions.sort((a, b) => a - b);
        let runStart = positions[0],
            prev = positions[0];
        for (let j = 1; j < positions.length; j++) {
            const cur = positions[j];
            // if it's not adjacent *or* the token after `prev` doesn't carry the mark,
            // end the previous run and start a new one.
            const gap = cur !== prev + 1;
            const sep = !tokens[prev].marks.some((m) => m.eq(mark));
            if (gap || sep) {
                spans.push({
                    mark,
                    first: runStart,
                    last: prev,
                    length: prev - runStart,
                });
                runStart = cur;
            }
            prev = cur;
        }
        // finish last run
        spans.push({
            mark,
            first: runStart,
            last: prev,
            length: prev - runStart,
        });
    }

    // 3) Index opens & closes
    const opens: Record<number, Span[]> = {};
    const closes: Record<number, Span[]> = {};
    for (const s of spans) {
        (opens[s.first] ||= []).push(s);
        (closes[s.last] ||= []).push(s);
    }
    // When multiple spans open at same index, open longer first
    for (const a of Object.values(opens)) a.sort((x, y) => y.length - x.length);
    // When multiple spans close at same index, close shorter first
    for (const a of Object.values(closes))
        a.sort((x, y) => x.length - y.length);

    // 4) Sweep, maintaining a stack of child-arrays
    const root: PhrasingContent[] = [];
    const stack: PhrasingContent[][] = [root];

    for (let i = 0; i < tokens.length; i++) {
        // open spans
        for (const _s of opens[i] || []) stack.push([]);

        // emit token
        const tok = tokens[i]!;
        const leaf: PhrasingContent = tok.isText
            ? ({ type: "text", value: tok.text! } as Text)
            : (proseMirrorToMyst(tok) as PhrasingContent);
        stack[stack.length - 1].push(leaf);

        // close spans
        for (const s of closes[i] || []) {
            const children = stack.pop()!;
            stack[stack.length - 1].push(wrapMark(s.mark, children));
        }
    }

    return root;
}
