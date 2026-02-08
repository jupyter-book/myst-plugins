import { describe, expect, test } from "vitest";
import { fillTemplate } from "../src/utils.mjs";

describe("fillTemplate", () => {
  test("substitutes fields without filters", () => {
    expect(fillTemplate("Hello {{name}}", { name: "world" })).toBe("Hello world");
  });

  test("returns empty string when all fields are missing", () => {
    expect(fillTemplate("{{missing}}", {})).toBe("");
  });

  test("applies urlencode filter", () => {
    const result = fillTemplate("https://example.com?q={{ title | urlencode }}", {
      title: "hello world & more",
    });
    expect(result).toBe("https://example.com?q=hello%20world%20%26%20more");
  });

  test("unknown filter passes value through unchanged", () => {
    expect(fillTemplate("{{ name | nope }}", { name: "hi" })).toBe("hi");
  });
});
