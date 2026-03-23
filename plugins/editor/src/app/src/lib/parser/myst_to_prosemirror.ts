import { schema } from "../schema";

import type {
    Node as MystNode,
    Block,
    Paragraph,
    Text,
    Emphasis,
    Strong,
    Link,
    Definition,
    HTML,
    Root,
    Heading,
    ThematicBreak,
    Blockquote,
    List,
    ListItem,
    Code,
    Target,
    Directive,
    Admonition,
    AdmonitionTitle,
    Container,
    Math,
    InlineMath,
    Image,
    Caption,
    FootnoteDefinition,
    Subscript,
    Superscript,
    Underline,
} from "myst-spec";
import type { GenericNode, GenericParent } from "myst-common";
import { Mark, Node } from "prosemirror-model";
import { Aside, CaptionNumber, Delete } from "myst-spec-ext";
// import { parseToMystAST } from "./parse_myst";

/** Parse raw MyST into a ProseMirror document.
 */
// export function parseMyst(source: string): Node {
//     const parsed = parseToMystAST(source);
//     return mystToProseMirror(parsed);
// }

/** Parse MyST abstract syntax tree into a ProseMirror document.
 */
export function mystToProseMirror(myst: GenericParent): Node {
    try {
        console.log("Attempting standard mode");
        const res = transformAst(myst, false);
        if (Array.isArray(res)) {
            throw new TypeError("Final parse result should not be array");
        }
        console.log("Standard successful.", res);
        console.log("HELLO TEST")
        return res;
    } catch (e) {
        if (e instanceof RangeError && e.message.includes("Invalid content")) {
            console.warn("Standard parse failed, trying safe mode");
            const res = transformAst(myst, true);
            if (Array.isArray(res)) {
                throw new TypeError("Final parse result should not be array");
            }
            console.log("Safe mode successful.");
            return res;
        } else {
            console.warn("Safe mode failed");
            throw e;
        }
    }
}

/** Utility function to recursively convert children in a handler function.
 */
function children(
    node: GenericNode,
    safe: boolean = false,
): Node[] | undefined {
    return node.children?.flatMap((x) => {
        const res = transformAst(x, safe);
        return Array.isArray(res) ? res : [res];
    });
}

/** Utility function to recursively mark children in a handler function.
 * This is used to mark inline content as
 */
function markChildren(
    node: GenericNode,
    safe: boolean,
    ...marks: Mark[]
): Node[] | undefined {
    return node?.children
        ?.flatMap((n) => transformAst(n, safe))
        ?.map((x) => x.mark([...x.marks, ...marks]));
}

function pick<T extends object, A extends keyof T>(
    src: T,
    ...attrs: A[]
): Pick<T, A> {
    const obj: Record<PropertyKey, unknown> = {};
    for (const attr of attrs) {
        obj[attr] = src[attr];
    }
    return obj as Pick<T, A>;
}

/** List of supported directives
 *
 * This is the list of directives we currently render into editable content.
 * Other directives remain untouched and their code will be shown in the editor.
 */
const SUPPORTED_DIRECTIVES = [
    "admonition",
    "attention", // alias of 'admonition'
    "caution", // alias of 'admonition'
    "danger", // alias of 'admonition'
    "error", // alias of 'admonition'
    "important", // alias of 'admonition'
    "hint", // alias of 'admonition'
    "note", // alias of 'admonition'
    "seealso", // alias of 'admonition'
    "tip", // alias of 'admonition'
    "warning", // alias of 'admonition'
];

/** Handlers for MyST AST types
 *
 * These are the handlers that convert the MyST abstract syntax tree into
 * ProseMirror nodes. They are called by the transformAst function, and in turn
 * call the transformAst function again, to convert the AST recursively.
 *
 * Some nodes cannot be directly converted to ProseMirror nodes, because,
 * according to the MyST spec, they can include block (flow) or inline
 * (phrasing) content. This is not supported by ProseMirror, which only allows
 * a certain node type to support flow xor phrasing content. We get around this
 * by wrapping inline children in a paragraph. For an example, see listItem
 *
 * TODO: Right now, typing is messy, with casting and all. Figure out a way to
 * have better typing.
 *
 * TODO: It seems keeping track of definitions is not necessary, since the
 * parser seemingly handles this already. It doesn't emit the linkReference
 * node, even though it is defined in the MyST specification.
 */
const handlers = {
    root: (node: Root, safe: boolean) =>
        schema.node("root", {}, children(node, safe)),
    block: (node: Block, safe: boolean) =>
        schema.node("block", { meta: node.meta }, children(node, safe)),
    paragraph: (node: Paragraph, safe: boolean) =>
        schema.node("paragraph", {}, children(node, safe)),
    definition: (node: Definition) =>
        schema.node("definition", {
            url: node.url,
            identifier: node.identifier,
        }),
    heading: (node: Heading, safe: boolean) =>
        schema.node(
            "heading",
            {
                level: node.depth,
                enumerated: node.enumerated,
                enumerator: node.enumerator,
                identifier: node.identifier,
                label: node.label,
            },
            children(node, safe),
        ),
    thematicBreak: (_node: ThematicBreak) => schema.node("thematicBreak"),
    blockquote: (node: Blockquote, safe: boolean) =>
        schema.node("blockquote", {}, children(node, safe)),
    list: (node: List, safe: boolean) =>
        schema.node(
            "list",
            { spread: node.spread, ordered: node.ordered, start: node.start },
            children(node, safe),
        ),
    listItem: (node: ListItem, safe: boolean) => {
        let myChildren = children(node, safe);
        if (myChildren !== undefined && myChildren.every((x) => x.isInline)) {
            myChildren = [schema.node("paragraph", {}, myChildren)];
        }
        return schema.node("listItem", { spread: node.spread }, myChildren);
    },
    text: (node: Text) => schema.text(node.value),
    html: (node: HTML) => schema.node("html", { value: node.value }),
    code: (node: Code) =>
        schema.node(
            "code_block",
            pick(
                node,
                "lang",
                "meta",
                "class",
                "showLineNumbers",
                "emphasizeLines",
                "identifier",
                "label",
            ),
            schema.text(node.value),
        ),
    iframe: (node: any) => {
        const webpage = node.src || "";
        const width = node.width ? `\n:width: ${node.width}` : "";
        const height = node.height ? `\n:height: ${node.height}` : "";
        const mystString = `:::{iframe} ${webpage}${width}${height}\n:::`;

        // Use code_block instead of paragraph
        return schema.node(
            "code_block", 
            { lang: "myst" }, // Tagging it as MyST can help with styling
            [schema.text(mystString)]
        );
    },
    inlineCode: (node: { value: string }) =>
        schema.text(node.value, [schema.mark("code")]),
    table: (node: Table, safe: boolean) =>
        schema.node("table", {}, children(node, safe)),
    tableRow: (node: TableRow, safe: boolean) =>
        schema.node("table_row", {}, children(node, safe)),
    tableCell: (node: TableCell, safe: boolean) => {
        const align = node.align;
        const style = align ? `text-align:${align}` : null;
        const processedChildren = children(node, safe);
        if (processedChildren && processedChildren.every((c) => c.isInline)) {
            return schema.node("table_cell", { style }, [
                schema.node("paragraph", {}, processedChildren),
            ]);
        }
        return schema.node("table_cell", { style }, processedChildren);
    },
    mystTarget: (node: Target) =>
        schema.node("target", { label: node.label?.trim()?.toLowerCase() }),
    mystDirective: (node: Directive, safe: boolean) =>
        schema.node(
            "directive",
            pick(node, "name", "value", "args"),
            SUPPORTED_DIRECTIVES.includes(node.name)
                ? children(node, safe)
                : undefined,
        ),
    admonition: (node: Admonition, safe: boolean) =>
        schema.node(
            "admonition",
            { kind: node.kind, class: node.class },
            children(node, safe),
        ),
    admonitionTitle: (node: AdmonitionTitle, safe: boolean) =>
        schema.node("admonitionTitle", {}, children(node, safe)),
    container: (node: Container, safe: boolean) =>
        schema.node("container", { kind: node.kind }, children(node, safe)),
    emphasis: (node: Emphasis, safe: boolean) =>
        markChildren(node, safe, schema.mark("emphasis")),
    strong: (node: Strong, safe: boolean) =>
        markChildren(node, safe, schema.mark("strong")),
    link: (node: Link, safe: boolean) => {
        const url = node.url ?? "";
        const children = node.children ?? [];
        const isEmptyChildren =
            children.length === 0 ||
            children.every(
                (child) =>
                    child.type === "text" &&
                    (child as Text).value.trim() === "",
            );
        if (url.startsWith("#") && isEmptyChildren) {
            return schema.node(
                "referenceLink",
                {},
                schema.text(`[](${url})`),
            );
        }
        return markChildren(
            node,
            safe,
            schema.mark("link", pick(node, "url", "title")),
        );
    },
    superscript: (node: Superscript, safe: boolean) =>
        markChildren(node, safe, schema.mark("superscript")),

    subscript: (node: Subscript, safe: boolean) =>
        markChildren(node, safe, schema.mark("subscript")),

    underline: (node: Underline, safe: boolean) =>
        markChildren(node, safe, schema.mark("underline")),

    delete: (node: Delete, safe: boolean) =>
        markChildren(node, safe, schema.mark("strikethrough")),
    linkReference: (node: LinkReference, safe: boolean) =>
        markChildren(
            node,

            safe,
            schema.mark("link", {
                url: defs.get(node.identifier!.trim().toLowerCase()),
                reference: {
                    referenceType: node.referenceType,
                },
            }),
        ),
    math: (node: Math) =>
        schema.node(
            "math",
            pick(node, "identifier", "label"),
            schema.text(node.value),
        ),
    inlineMath: (node: InlineMath) =>
        schema.node("inlineMath", {}, schema.text(node.value)),

    image: (node: Image) => {
        const img = schema.node(
            "image",
            pick(node, "class", "width", "align", "url", "title", "alt"),
        );

        return schema.node("imageWrapper", {}, img);
    },

    caption: (node: Caption, safe: boolean) =>
        schema.node("caption", {}, children(node, safe)),
    footnoteDefinition: (node: FootnoteDefinition, safe: boolean) =>
        schema.node(
            "footnoteDefinition",
            { identifier: node.identifier },
            children(node, safe),
        ),
    captionNumber: (node: CaptionNumber, safe: boolean) =>
        schema.node(
            "captionNumber",
            pick(node, "identifier", "kind", "label", "html_id", "enumerator"),
            children(node, safe),
        ),
    // Extension types
    aside: (node: Aside, safe: boolean) =>
        schema.node(
            "aside",
            { kind: node.kind, class: node.class },
            children(node, safe),
        ),

    default: (node: Text) => schema.text(node.value),
};

function transformAst(myst: MystNode, safe: boolean = false): Node | Node[] {
    const handler = (
        handlers as unknown as Record<
            string,
            (node: MystNode, safe: boolean) => Node
        >
    )[myst.type];
    if (!(myst.type in handlers)) {
        console.warn(`Unknown node type '${myst.type}'`);
        // We return a ProseMirror `code_block` or `code` node.
        if (safe || !("children" in myst)) {
            // No children so likely inline
            let nodeContent: string;
            let editable: boolean = false;
            // Transform unsupported node to text
            if (myst.data) {
                nodeContent = JSON.stringify(myst.data, null, 2);
                editable = true;
            } else {
                nodeContent =
                    "Directive not supported and no text content found";
            }

            return schema.text(nodeContent, [
                schema.mark("unsupported", {
                    myst: myst,
                    editable: editable,
                }),
            ]);
        } else {
            // Likely a block Node because it has children
            let nodeContent: string;
            let editable = false;

            // If the Node has a string value make it editable
            if ("value" in myst && typeof myst.value === "string") {
                nodeContent = myst.value;
                editable = true;
            } else {
                // If Node has no string value make it not editable
                nodeContent = JSON.stringify(myst, null, 2);
            }

            // Return the unsupported MyST Node
            return schema.node(
                "unsupported_block",
                { myst: myst, editable: editable },
                schema.text(nodeContent),
            );
        }
    }
    return handler(myst, safe);
}
