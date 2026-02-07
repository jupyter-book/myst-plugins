import { describe, expect, test } from "vitest";
import { truncateTree } from "../src/utils.mjs";

describe("truncateTree", () => {
  test("returns nodes unchanged when within budget", () => {
    const nodes = [
      { type: "text", value: "short text" },
    ];
    const result = truncateTree(nodes, 100);
    expect(result.nodes).toEqual(nodes);
    expect(result.remaining).toBe(90);
  });

  test("truncates plain text at word boundary", () => {
    const nodes = [
      { type: "text", value: "hello world this is long" },
    ];
    const result = truncateTree(nodes, 14);
    expect(result.nodes).toEqual([
      { type: "text", value: "hello world..." },
    ]);
    expect(result.remaining).toBe(0);
  });

  test("truncates inside a link without breaking it", () => {
    const nodes = [
      { type: "text", value: "Check out " },
      { type: "link", url: "https://example.com", children: [
        { type: "text", value: "this link" }
      ]},
      { type: "text", value: " for details" },
    ];

    const result = truncateTree(nodes, 18);

    // "Check out " = 10 chars, then 8 remaining truncates inside the link text
    expect(result.nodes).toEqual([
      { type: "text", value: "Check out " },
      { type: "link", url: "https://example.com", children: [
        { type: "text", value: "this..." }
      ]},
    ]);
    expect(result.remaining).toBe(0);
  });

  test("drops sibling nodes after budget is spent", () => {
    const nodes = [
      { type: "text", value: "first" },
      { type: "text", value: "second" },
      { type: "text", value: "third" },
    ];
    const result = truncateTree(nodes, 5);
    expect(result.nodes).toEqual([
      { type: "text", value: "first" },
    ]);
    expect(result.remaining).toBe(0);
  });
});
