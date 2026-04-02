import { describe, expect, test } from "vitest";
import { parseWidths } from "../src/utils.mjs";
import { validateOptions } from "../src/index.mjs";

describe("parseWidths", () => {
  test("passes through valid widths that sum to <= 100", () => {
    expect(parseWidths("30,50,20")).toEqual([30, 50, 20]);
  });

  test("normalizes widths when sum exceeds 100", () => {
    const result = parseWidths("60,60,80");
    // 60+60+80 = 200, normalized proportionally
    expect(result).toEqual([30, 30, 40]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
  });

  test("handles decimal values", () => {
    expect(parseWidths("33.3,33.3,33.4")).toEqual([33.3, 33.3, 33.4]);
  });

  test("handles whitespace around values", () => {
    expect(parseWidths(" 30 , 50 , 20 ")).toEqual([30, 50, 20]);
  });
});

describe("validateOptions", () => {
  test("returns null for valid input without widths", () => {
    expect(validateOptions({ columns: ["title", "author"], subIssuesIn: null, widths: null })).toBeNull();
  });

  test("returns null for valid input with correct widths count", () => {
    expect(validateOptions({ columns: ["title", "author"], subIssuesIn: null, widths: "60,40" })).toBeNull();
  });

  test("returns error when widths count does not match columns", () => {
    const result = validateOptions({ columns: ["title", "author"], subIssuesIn: null, widths: "30,40,30" });
    expect(result).toContain("expected 2 values");
    expect(result).toContain("got 3");
  });

  test("returns error for zero width values", () => {
    const result = validateOptions({ columns: ["title", "author"], subIssuesIn: null, widths: "0,100" });
    expect(result).toContain("positive numbers");
  });

  test("returns error for negative width values", () => {
    const result = validateOptions({ columns: ["title", "author"], subIssuesIn: null, widths: "60,-40" });
    expect(result).toContain("positive numbers");
  });

  test("returns error for non-numeric width values", () => {
    const result = validateOptions({ columns: ["title", "author"], subIssuesIn: null, widths: "60,abc" });
    expect(result).toContain("positive numbers");
  });

  test("returns error for invalid append-sub-issues column", () => {
    const result = validateOptions({ columns: ["title", "author"], subIssuesIn: "missing", widths: null });
    expect(result).toContain('append-sub-issues column "missing"');
  });
});
