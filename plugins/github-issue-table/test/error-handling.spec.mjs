import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

// Mock API to force an error response
vi.mock("../src/github-api.mjs", () => ({
  fetchIssues: vi.fn(async () => {
    throw new Error("403 Forbidden");
  })
}));

// Mock cache to avoid disk access
vi.mock("../../github-shared/utils.mjs", async () => {
  const actual = await vi.importActual("../../github-shared/utils.mjs");
  return {
    ...actual,
    createCache: () => ({
      readCache: vi.fn(() => null),
      writeCache: vi.fn(() => {}),
    }),
  };
});

import plugin from "../src/index.mjs";

describe("GitHub Issue Table error handling", () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  test("renders error message when GitHub fetch fails", async () => {
    const transform = plugin.transforms[0].plugin();

    const tree = {
      type: "root",
      children: [
        {
          type: "githubIssueTablePlaceholder",
          query: "repo:owner/repo is:issue",
          columns: ["title"],
          sort: null,
          limit: 5
        }
      ]
    };

    await transform(tree);

    const node = tree.children[0];
    expect(node.type).toBe("paragraph");
    const text = node.children?.[0]?.value || "";
    expect(text).toContain("fetching GitHub data");
    expect(text).toContain("403 Forbidden");
  });
});
