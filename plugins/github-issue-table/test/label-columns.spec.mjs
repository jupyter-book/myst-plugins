import { describe, expect, test } from "vitest";
import { matchesLabelPattern } from "../src/utils.mjs";

describe("matchesLabelPattern", () => {
  test("exact match", () => {
    expect(matchesLabelPattern("bug", "bug")).toBe(true);
    expect(matchesLabelPattern("bug", "feature")).toBe(false);
    expect(matchesLabelPattern("type:bug", "bug")).toBe(false);
  });

  test("wildcard match", () => {
    expect(matchesLabelPattern("type:bug", "type:*")).toBe(true);
    expect(matchesLabelPattern("type:feature", "type:*")).toBe(true);
    expect(matchesLabelPattern("priority:high", "type:*")).toBe(false);
  });

  test("wildcard at start", () => {
    expect(matchesLabelPattern("feature-request", "*-request")).toBe(true);
    expect(matchesLabelPattern("bug", "*-request")).toBe(false);
  });

  test("multiple patterns (comma-separated)", () => {
    expect(matchesLabelPattern("type:bug", "type:*,bug")).toBe(true);
    expect(matchesLabelPattern("bug", "type:*,bug")).toBe(true);
    expect(matchesLabelPattern("priority:high", "type:*,bug")).toBe(false);
  });
});
