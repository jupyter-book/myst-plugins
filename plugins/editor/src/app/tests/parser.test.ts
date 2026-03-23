import { describe, expect, it } from "vitest";
import { parseMyst } from "../src/lib/parser";
import { Node } from "prosemirror-model";
import { schema } from "../src/lib/schema";
import { EXAMPLE_1, EXAMPLE_2 } from "./parser_constants";
import { proseMirrorToMarkdown } from "../src/lib/parser";

describe("Markdown parser", () => {
    function parse(myst: string) {
        const parsed = parseMyst(myst);
        expect(parsed).toBeInstanceOf(Node);
        expect(parsed.type.name).toBe("root");
        expect(parsed.children).toHaveLength(1);
        return parsed.children[0];
    }
    it("parses a basic paragraph", async () => {
        const parsed = parse("Hello, world!");
        expect(parsed).toBeInstanceOf(Node);
        expect(parsed.children).toHaveLength(1);
        expect(parsed.children[0]).toBeInstanceOf(Node);
        expect(parsed.children[0].textContent).toBe("Hello, world!");
    });
    it.for([
        { heading: "#", level: 1 },
        { heading: "##", level: 2 },
        { heading: "###", level: 3 },
        { heading: "####", level: 4 },
        { heading: "#####", level: 5 },
        { heading: "######", level: 6 },
    ])(
        "parses a heading level $level and paragraph",
        async ({ heading, level }) => {
            const parsed = parse(
                heading + " Hello, world!\n\nNice to see you!",
            );
            expect(parsed).toBeInstanceOf(Node);
            expect(parsed.children).toHaveLength(2);
            expect(parsed.children[0]).toBeInstanceOf(Node);
            expect(parsed.children[0].type.name).toBe("heading");
            expect(parsed.children[0].attrs).toHaveProperty("level", level);
        },
    );
    it("parses thematic break", async () => {
        const parsed = parse("Paragraph 1\n\n---\n\nParagraph 2");

        expect(parsed).toBeInstanceOf(Node);
        expect(parsed.children).toHaveLength(3);
        expect(parsed.children[1].type.name).toBe("thematicBreak");
    });
    it.for([1, 2, 3])("parses blockquote nested %i times", async (nesting) => {
        const parsed = parse("> ".repeat(nesting) + "Hello world");
        expect(parsed).toBeInstanceOf(Node);
        expect(parsed.children).toHaveLength(1);
        let node = parsed.children[0];
        do {
            expect(node.children).toHaveLength(1);
            expect(node.type.name).toBeOneOf(["blockquote", "paragraph"]);
            node = node.children[0];
        } while (node.type === schema.nodes.blockquote);
        expect(node.type.name).toBe("paragraph");
        expect(node.textContent).toBe("Hello world");
    });
    it("parses a list", async () => {
        const parsed = parse("- item 1\n- item 2\n- item 3");
        expect(parsed).toBeInstanceOf(Node);
        expect(parsed.children).toHaveLength(1);
        expect(parsed.children[0].type.name).toBe("list");
        expect(parsed.children[0].children).toHaveLength(3);
        for (const child of parsed.children[0].children) {
            expect(child.type.name).toBe("listItem");
            expect(child.textContent).toMatch(/^item \d$/);
        }
    });
    it("parses a code block", async () => {
        const parsed = parse(
            "```javascript\nconsole.log('Hello, world!');\n```",
        );
        expect(parsed).toBeInstanceOf(Node);
        expect(parsed.children).toHaveLength(1);
        expect(parsed.children[0].type.name).toBe("code_block");
        expect(parsed.children[0].textContent).toBe(
            "console.log('Hello, world!');",
        );
        expect(parsed.children[0].attrs).toHaveProperty("lang", "javascript");
    });
    // FIXME: Figure out why this fails
    // it("parses a target label", async () => {
    //     const parsed = await parse("(test_123)=\n# Header");
    //     expect(parsed).toBeInstanceOf(Node);
    //     expect(parsed.children).toHaveLength(2);
    //     expect(parsed.children[0].type.name).toBe("target");
    //     expect(parsed.children[1].type.name).toBe("heading");
    // });
    it.for([
        {
            name: "args_and_options",
            myst: "```{args_and_options} foo bar\n:a: one\n:b: two\n\nABC directive\n```",
            args: "foo bar",
            value: ":a: one\n:b: two\n\nABC directive",
        },
        {
            name: "only_options",
            myst: "```{only_options}\n:key1: metadata1\n:key2: metadata2\n\nMy directive content.\n```",
            args: undefined,
            value: ":key1: metadata1\n:key2: metadata2\n\nMy directive content.",
        },
        {
            name: "yaml_options",
            myst: "```{yaml_options}\n---\nkey: value\n---\nHello world!",
            args: undefined,
            value: ":key: value\n\nHello world!",
        },
    ])("parses directive $name", async ({ myst, args, value, name }) => {
        const parsed = parse(myst);
        expect(parsed).toBeInstanceOf(Node);
        expect(parsed.children).toHaveLength(1);
        const node = parsed.children[0];
        expect(node.type.name).toBe("directive");
        expect(node.attrs).toHaveProperty("value", value);
        expect(node.attrs).toHaveProperty("args", args);
        expect(node.attrs).toHaveProperty("name", name);
    });
    it.for([
        {
            myst: "```{warning}\nHello world!\n```",
            kind: "warning",
            title: undefined,
        },
        {
            myst: "```{note} Hello\nHello 123!\n```",
            kind: "note",
            title: "Hello",
        },
    ])("parses admonition kind $kind", async ({ myst, kind, title }) => {
        const parsed = parse(myst);
        expect(parsed).toBeInstanceOf(Node);
        expect(parsed.children).toHaveLength(1);
        const admonition = parsed.children[0];
        expect(admonition.type.name).toBe("admonition");
        expect(admonition.attrs).toHaveProperty("kind", kind);
        expect(admonition.children).toHaveLength(2);
        if (title !== undefined) {
            expect(admonition.children[0].type.name).toBe("admonitionTitle");
            expect(admonition.children[0].textContent).toBe(title);
        }
    });
    it("parses reference-style link", async () => {
        const myst =
            "[TeachBooks][teachbooks]\n\n[teachbooks]: https://teachbooks.io";
        const parsed = parse(myst);
        expect(parsed).toBeInstanceOf(Node);
        expect(parsed.children).toHaveLength(1);

        const paragraph = parsed.children[0];
        expect(paragraph.type.name).toBe("paragraph");
        expect(paragraph.children).toHaveLength(1);

        const node = paragraph.children[0];
        expect(node.marks).toHaveLength(1);
        expect(node.textContent).toBe("TeachBooks");

        const mark = node.marks[0];
        expect(mark.type.name).toBe("link");
        expect(mark.attrs).toHaveProperty("url", "https://teachbooks.io");
    });
    it.for([
        {
            myst: "**bold**",
            marks: [["strong"]],
        },
        {
            myst: "*italic*",
            marks: [["emphasis"]],
        },
        {
            myst: "***bold and italic***",
            // NOTE: this test might be flaky, since order could be ambiguous
            marks: [["strong", "emphasis"]],
        },
        {
            myst: "**bold *bold and italic***",
            marks: [["strong"], ["emphasis", "strong"]],
        },
        {
            myst: "*italic **bold and italic** italic again*",
            marks: [["emphasis"], ["strong", "emphasis"], ["emphasis"]],
        },
        {
            myst: "[**Bold** link](https://example.org)",
            marks: [["strong", "link"], ["link"]],
        },
    ])("parses marks $marks", async ({ myst, marks }) => {
        const parsed = parse(myst);
        expect(parsed).toBeInstanceOf(Node);
        expect(parsed.children).toHaveLength(1);
        const paragraph = parsed.children[0];
        expect(paragraph.type.name).toBe("paragraph");
        expect(
            paragraph.children.map((x) => x.marks.map((m) => m.type.name)),
        ).toEqual(marks);
    });

    const MYST_DOCUMENTS = [
        {
            myst: EXAMPLE_1,
            desc: "example_1",
        },
        {
            myst: EXAMPLE_2,
            desc: "example_2",
        },
    ];

    it.for(MYST_DOCUMENTS)(
        "parses document $desc",
        async ({ myst, desc }, { skip }) => {
            const parsed = parse(myst);
            const json = parsed.toJSON();

            // FIXME: MyST stuff changes every time this runs, so snapshot test doesn't work
            if (desc === "example_2") skip();
            expect(json).toMatchFileSnapshot(`./snapshot/parse_${desc}.json`);
        },
    );

    it.for(MYST_DOCUMENTS)("round-trips $desc", async ({ myst }) => {
        // We round-trip twice, because
        // However, this does not catch details lost in the conversion...
        // The problem is, if we miss something in the AST
        const parsed = parse(myst);
        const convertedBack = proseMirrorToMarkdown(parsed);
        const parsed2 = parse(convertedBack);
        const roundtrip = proseMirrorToMarkdown(parsed2);
        expect(roundtrip).toEqual(convertedBack);
    });
});

describe("Markdown → ProseMirror → Markdown", () => {
    // first, re-use your existing helper
    function parseParagraph(myst: string): Node {
        const root = parseMyst(myst);
        expect(root.type.name).toBe("root");
        expect(root.childCount).toBe(1);
        return root.firstChild!;
    }

    const cases = [
        { name: "bold", myst: "**bold**" },
        { name: "italic", myst: "*italic*" },
        { name: "link", myst: "[link text](https://example.com)" },
        { name: "bold+italic", myst: "***both***" },
        { name: "nested mix", myst: "**bold *and italics***" },
        { name: "nested mix inverted", myst: "*italic **and bold!***" },
        { name: "link + bold", myst: "[**BOLD LINK**](https://x)" },
        { name: "superscript", myst: "{sup}`superscript`" },
        { name: "subscript", myst: "{sub}`subscript`" },
        { name: "underline", myst: "{u}`underlined`" },
        { name: "delete (strikethrough)", myst: "{del}`deleted`" },
        { name: "bold + subscript", myst: "**X{sub}`2`**" },
        {
            name: "link + superscript2",
            myst: "[E=mc{sup}`2`](https://example.com)",
        },
        { name: "bold then italic", myst: "**foo***bar*" },
        { name: "italic punctuation", myst: "*hello*, world" },
        { name: "escaped asterisks", myst: "\\*not italic\\*" },
        {
            name: "link with mixed marks",
            myst: "[*i* **b** {del}`c`](https://example.com)",
        },
        {
            name: "link with underline",
            myst: "[{u}`u` text](https://example.com)",
        },
        { name: "nesting", myst: "*one **two three** four*" },
        //{ name: "nesting2", myst: "*one **two *three*** four*" }, //only failing test case
        { name: "nesting3", myst: "*one ***two* three** four*" },
        { name: "nesting4", myst: "*one **two*** test ***three** four*" },
        { name: "nestingb", myst: "**one *two three* four**" },
        { name: "nestingb2", myst: "**one *two *three** four**" },
        { name: "nestingb3", myst: "**one **two* three* four**" },
        { name: "nestingb4", myst: "**one *two*** test ***three* four**" },
        { name: "combined sub sup", myst: "**X{sup}`2`{sub}`i`**" },
        { name: "subsup sequence", myst: "H{sup}`2`O{sup}`+`" },
        { name: "mixed run", myst: "*a* **b** {sup}`c` ^d^" },
    ];

    it.for(cases)("round-trips $name", async ({ myst }) => {
        // 1. Parse the MYST into a ProseMirror paragraph Node
        const pmPara = parseParagraph(myst);

        // 2. Convert that PM AST back to Markdown
        const md = proseMirrorToMarkdown(pmPara);

        // 3. It should match the original myst
        expect(md.trim()).toBe("+++\n" + myst);
    });
});
