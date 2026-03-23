import { mystToProseMirror } from "./myst_to_prosemirror";
import { parseToMystAST } from "./parse_myst";
import type { Node } from "prosemirror-model";

export {
    proseMirrorToMyst,
    proseMirrorToMarkdown,
} from "./prosemirror_to_myst";

export function parseMyst(source: string): Node {
    console.log(source)
    const parsed = parseToMystAST(source);
    console.log(parsed)
    return mystToProseMirror(parsed);
}
