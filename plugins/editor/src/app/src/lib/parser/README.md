# The Parser

## High-level explanation

For parsing the Markdown to ProseMirror, we use [MySTMD].
MystMD gives us an abstract syntax tree, which is defined by myst-spec. (Side
note: myst-spec is typescript types converted from a JSON schema, giving a less-than-ideal type model for the AST, so we have to work around that in some cases.)

We then have handlers for the MyST AST types, located in `myst_to_prosemirror.ts`, which
convert the nodes to their corresponding ProseMirror nodes. And vice versa for `prosemirror_to_myst.ts`

ProseMirror handles links, bold or emphasized text and other 'marks', as they
are called by the ProseMirror documentation, differently than the MyST AST.

Instead of having an 'emphasis' or a 'strong' node, ProseMirror has text nodes
that have any number of [marks]. Because of this, we have to use some non-trivial
algorithms to convert between one and the other. Conversion of these formats is
a one-to-one mapping.

[marks]: https://prosemirror.net/docs/guide/#schema.marks
[MystMD]: https://mystmd.org

## Files

- `parse_myst.ts` contains the function that parses the raw string to a MyST AST.
- `myst_to_prosemirror.ts` contains the logic to convert a MyST AST to a ProseMirror AST.
- `prosemirror_to_myst.ts` contains the logic to convert a ProseMirror AST to a Myst AST.

## Links

[ProseMirror Guide](https://prosemirror.net/docs/guide)
[ProseMirror Reference](https://prosemirror.net/docs/ref)
