import { buttonRole } from "myst-ext-button";
import { cardDirective } from "myst-ext-card";
import { exerciseDirectives } from "myst-ext-exercise";
import { gridDirective } from "myst-ext-grid";
import { proofDirective } from "myst-ext-proof";
import { tabDirectives } from "myst-ext-tabs";
import { PageFrontmatter, validatePageFrontmatter } from "myst-frontmatter";
import { mystParse } from "myst-parser";
import {
    WikiTransformer,
    GithubTransformer,
    DOITransformer,
    RRIDTransformer,
    RORTransformer,
    getFrontmatter,
    ReferenceState,
    reconstructHtmlPlugin,
    htmlPlugin,
    basicTransformationsPlugin,
    mathPlugin,
    glossaryPlugin,
    abbreviationPlugin,
    enumerateTargetsPlugin,
    linksPlugin,
    footnotesPlugin,
    joinGatesPlugin,
    resolveReferencesPlugin,
    keysPlugin,
} from "myst-transforms";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { VFile } from "vfile";

/**
 * Parse the MyST text into the MyST AST. This function is adapted from the
 * [MyST Demo].
 *
 * [MyST Demo]: https://github.com/jupyter-book/myst-theme/blob/main/packages/myst-demo/
 */

export function parseToMystAST(
    text: string,
    defaultFrontmatter?: PageFrontmatter,
) {
    const vfile = new VFile();
    const parseMyst = (content: string) =>
        mystParse(content, {
            markdownit: { linkify: true },
            directives: [
                cardDirective,
                gridDirective,
                ...tabDirectives,
                proofDirective,
                ...exerciseDirectives,
            ],
            roles: [buttonRole],
            vfile,
        });
    const mdast = parseMyst(text);
    const linkTransforms = [
        new WikiTransformer(),
        new GithubTransformer(),
        new DOITransformer(),
        new RRIDTransformer(),
        new RORTransformer(),
    ];
    // const references: References = {
    //     cite: { order: [], data: {} },
    // };
    const frontmatterRaw = getFrontmatter(vfile, mdast, {
        keepTitleNode: true,
    });
    const frontmatter: Omit<PageFrontmatter, "parts"> = validatePageFrontmatter(
        frontmatterRaw,
        {
            property: "frontmatter",
            messages: {},
        },
    );
    const state = new ReferenceState("", {
        frontmatter: {
            ...frontmatter,
            numbering: frontmatter.numbering ?? defaultFrontmatter?.numbering,
        },
        vfile,
    });
    visit(mdast, (n) => {
        // Before we put in the citation render, we can mark them as errors
        if (n.type === "cite") {
            n.error = true;
        }
    });
    unified()
        .use(reconstructHtmlPlugin) // We need to group and link the HTML first
        .use(htmlPlugin) // Some of the HTML plugins need to operate on the transformed html, e.g. figure caption transforms
        .use(basicTransformationsPlugin, { parser: parseMyst })
        .use(mathPlugin, { macros: frontmatter?.math ?? {} }) // This must happen before enumeration, as it can add labels
        .use(glossaryPlugin) // This should be before the enumerate plugins
        .use(abbreviationPlugin, { abbreviations: frontmatter.abbreviations })
        .use(enumerateTargetsPlugin, { state })
        .use(linksPlugin, { transformers: linkTransforms })
        .use(footnotesPlugin)
        .use(joinGatesPlugin)
        .use(resolveReferencesPlugin, { state })
        .use(keysPlugin)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .runSync(mdast as any, vfile);

    return mdast;
}
