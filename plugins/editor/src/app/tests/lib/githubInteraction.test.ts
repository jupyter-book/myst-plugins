import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    MockedFunction,
    MockInstance,
} from "vitest";
import { github } from "../../src/lib/github/githubInteraction";
import { database } from "../../src/lib/localStorage/database";

interface GitHubInteractionPrivates {
    createBranch(
        owner: string,
        repo: string,
        branch: string,
        base: string,
    ): Promise<void>;
    ensureBranchCommit(
        owner: string,
        repo: string,
        branch: string,
    ): Promise<{
        sha: string;
        treeSha: string;
        parents: { sha: string }[];
    }>;
    createTreeWithFiles(
        owner: string,
        repo: string,
        files: [string, string][],
        options: object,
    ): Promise<{
        sha: string;
        treeSha: string;
        parents: { sha: string }[];
    }>;
    createCommitFromTree(
        owner: string,
        repo: string,
        message: string,
        options: object,
    ): Promise<{
        sha: string;
        treeSha: string;
        parents: { sha: string }[];
    }>;
    updateBranchRef(
        owner: string,
        repo: string,
        branch: string,
        sha: string,
    ): Promise<void>;
    fetchBranchCommitInfo(
        owner: string,
        repo: string,
        branch: string,
    ): Promise<
        | {
              sha: string;
              treeSha: string;
              parents: { sha: string }[];
          }
        | undefined
    >;
    headers: Record<string, string>;
}
let priv: GitHubInteractionPrivates;

describe("GitHubInteraction - unit methods", () => {
    let fetchMock: MockedFunction<typeof fetch>;

    beforeEach(() => {
        github.setAuth("token");
        github.setOwner("owner");
        github.setRepo("repo");
        github.setBranch("branch");
        vi.restoreAllMocks();
        fetchMock = vi.fn() as MockedFunction<typeof fetch>;
        vi.stubGlobal("fetch", fetchMock);
        priv = github as unknown as GitHubInteractionPrivates;
    });

    it("signals get/set work", () => {
        expect(github.getRepo()).toBe("repo");
        github.setRepo("r2");
        expect(github.getRepo()).toBe("r2");

        expect(github.getOwner()).toBe("owner");
        github.setOwner("o2");
        expect(github.getOwner()).toBe("o2");

        expect(github.getAuth()).toBe("token");
        github.setAuth("t2");
        expect(github.getAuth()).toBe("t2");

        expect(github.getBranch()).toBe("branch");
        github.setBranch("b2");
        expect(github.getBranch()).toBe("b2");
    });

    it("fetchFileFromBranch returns text on ok", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            text: async () => "hello",
        } as unknown as Response);
        const txt = await github.fetchFileFromBranch("path.txt", "branch");
        expect(txt).toBe("hello");
    });

    it("fetchFileFromBranch throws on !ok", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            text: async () => "err",
        } as unknown as Response);
        await expect(github.fetchFileFromBranch("x", "y")).rejects.toThrow(
            /Error getting file/,
        );
    });

    it("fetchRepoInfo parses JSON on ok", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ default_branch: "main", owner: "u" }),
        } as unknown as Response);
        const info = await github.fetchRepoInfo();
        expect(info.default_branch).toBe("main");
    });

    it("fetchRepoInfo throws on error", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 404,
            text: async () => "nf",
        } as unknown as Response);
        await expect(github.fetchRepoInfo()).rejects.toThrow(
            /Failed to load repo info/,
        );
    });

    it("fetchRemoteBranches returns list", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => [{ name: "a" }, { name: "b" }],
        } as unknown as Response);
        const list = await github.fetchRemoteBranches();
        expect(list).toEqual(["a", "b"]);
    });

    it("fetchRemoteBranches throws on error", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () => "bad",
        } as unknown as Response);
        await expect(github.fetchRemoteBranches()).rejects.toThrow(
            /Failed to list branches/,
        );
    });

    it("updateTreeInfo updates treeSha and keeps parents", () => {
        const out = github.updateTreeInfo(
            { sha: "S", treeSha: "T", parents: [{ sha: "S" }] },
            "NEW",
        );
        expect(out.treeSha).toBe("NEW");
        expect(out.sha).toBe("S");
        expect(out.parents[0].sha).toBe("S");
    });

    it("createCommitInfo maps response correctly", () => {
        const fake = {
            sha: "S",
            tree: { sha: "T" },
            parents: [{ sha: "A" }, { sha: "B" }],
        };
        const ci = github.createCommitInfo(fake);
        expect(ci.sha).toBe("S");
        expect(ci.treeSha).toBe("T");
        expect(ci.parents.map((p) => p.sha)).toEqual(["A", "B"]);
    });
});

describe("GitHubInteraction - database interaction", () => {
    beforeEach(() => {
        github.setAuth("token");
        github.setOwner("owner");
        github.setRepo("repo");
        github.setBranch("branch");
        vi.restoreAllMocks();
        priv = github as unknown as GitHubInteractionPrivates;
    });

    it("commitFromDatabase throws if load undefined", async () => {
        vi.spyOn(database, "load").mockResolvedValueOnce(undefined);
        await expect(github.commitFromDatabase("m", "k", "s")).rejects.toThrow(
            /No file found/,
        );
    });

    it("commitFromDatabase calls commitFiles when file exists", async () => {
        vi.spyOn(database, "load").mockResolvedValueOnce("content");
        const spy = vi
            .spyOn(github, "commitFiles")
            .mockResolvedValueOnce(undefined);
        await github.commitFromDatabase("m", "k", "s");
        expect(spy).toHaveBeenCalledWith("m", [["k", "content"]]);
    });

    it("commitMultipleFromDatabase throws if any missing", async () => {
        vi.spyOn(database, "loadMultiple").mockResolvedValueOnce([[1, "a"]]);
        await expect(
            github.commitMultipleFromDatabase("m", [1, 2], "s"),
        ).rejects.toThrow(/Missing files for keys: 2/);
    });

    it("commitAllFromDatabase throws on empty store", async () => {
        vi.spyOn(database, "loadAll").mockResolvedValueOnce([]);
        await expect(github.commitAllFromDatabase("m", "s")).rejects.toThrow(
            /No files found/,
        );
    });
});

describe("GitHubInteraction - full fetch & commit workflow", () => {
    beforeEach(() => {
        github.setAuth("token");
        github.setOwner("owner");
        github.setRepo("repo");
        github.setBranch("branch");
        vi.restoreAllMocks();
        priv = github as unknown as GitHubInteractionPrivates;
    });

    it("fetchFiles falls back to default branch then returns", async () => {
        const spyBranch = vi
            .spyOn(github, "fetchFilesFromBranch")
            .mockRejectedValueOnce(new Error("fail"))
            .mockResolvedValueOnce(["ok"]);
        vi.spyOn(github, "fetchRepoInfo").mockResolvedValueOnce({
            default_branch: "main",
            owner: "owner",
        });

        const res = await github.fetchFiles(["x"]);
        expect(res).toEqual(["ok"]);
        expect(spyBranch).toHaveBeenCalledTimes(2);
    });

    it("fetchFiles throws if both branches fail", async () => {
        vi.spyOn(github, "fetchFilesFromBranch").mockRejectedValue(
            new Error("nope"),
        );
        vi.spyOn(github, "fetchRepoInfo").mockResolvedValueOnce({
            default_branch: "main",
            owner: "owner",
        });
        await expect(github.fetchFiles(["x"])).rejects.toThrow(
            /Unable to fetch file contents/,
        );
    });

    it("commitFiles invokes helpers in sequence", async () => {
        const spyEnsure = vi
            .spyOn(priv, "ensureBranchCommit")
            .mockResolvedValueOnce({
                sha: "1",
                treeSha: "2",
                parents: [{ sha: "1" }],
            });
        const spyTree = vi
            .spyOn(priv, "createTreeWithFiles")
            .mockResolvedValueOnce({
                sha: "1",
                treeSha: "3",
                parents: [{ sha: "1" }],
            });
        const spyCommit = vi
            .spyOn(priv, "createCommitFromTree")
            .mockResolvedValueOnce({
                sha: "4",
                treeSha: "3",
                parents: [{ sha: "1" }],
            });
        const spyUpdate = vi
            .spyOn(priv, "updateBranchRef")
            .mockResolvedValueOnce(undefined);

        await github.commitFiles("msg", [["filePath", "content"]]);
        expect(spyEnsure).toHaveBeenCalled();
        expect(spyTree).toHaveBeenCalledWith(
            "owner",
            "repo",
            [["filePath", "content"]],
            expect.any(Object),
        );
        expect(spyCommit).toHaveBeenCalledWith(
            "owner",
            "repo",
            "msg",
            expect.any(Object),
        );
        expect(spyUpdate).toHaveBeenCalledWith("owner", "repo", "branch", "4");
    });
});

describe("GitHubInteraction - fetchFilesFromBranch", () => {
    let fetchFileSpy: MockInstance<
        (filePath: string, branchName: string) => Promise<string>
    >;

    beforeEach(() => {
        github.setAuth("token");
        github.setOwner("owner");
        github.setRepo("repo");
        github.setBranch("branch");
        fetchFileSpy = vi.spyOn(github, "fetchFileFromBranch");
        priv = github as unknown as GitHubInteractionPrivates;
    });

    it("fetchFilesFromBranch returns all file contents in order (parallel)", async () => {
        fetchFileSpy
            .mockResolvedValueOnce("contentA")
            .mockResolvedValueOnce("contentB");
        const result = await github.fetchFilesFromBranch(
            ["a.txt", "b.txt"],
            "branch",
        );
        expect(result).toEqual(["contentA", "contentB"]);
        expect(fetchFileSpy).toHaveBeenCalledTimes(2);
        expect(fetchFileSpy).toHaveBeenCalledWith("a.txt", "branch");
        expect(fetchFileSpy).toHaveBeenCalledWith("b.txt", "branch");
    });

    it("propagates errors from fetchFileFromBranch", async () => {
        fetchFileSpy.mockRejectedValueOnce(new Error("fail"));
        await expect(
            github.fetchFilesFromBranch(["x"], "branch"),
        ).rejects.toThrow("fail");
    });
});

describe("GitHubInteraction - fetchBranchCommitInfo", () => {
    let fetchMock: MockedFunction<typeof fetch>;
    beforeEach(() => {
        github.setAuth("token");
        github.setOwner("owner");
        github.setRepo("repo");
        github.setBranch("branch");
        vi.stubGlobal("fetch", (fetchMock = vi.fn()));
        priv = github as unknown as GitHubInteractionPrivates;
    });

    it("returns undefined on 404 status", async () => {
        fetchMock.mockResolvedValueOnce({ status: 404 } as unknown as Response);
        const res = await priv.fetchBranchCommitInfo("owner", "repo", "branch");
        expect(res).toBeUndefined();
    });

    it("throws on non-404, non-ok status", async () => {
        fetchMock.mockResolvedValueOnce({
            status: 500,
            ok: false,
        } as unknown as Response);
        await expect(
            priv.fetchBranchCommitInfo("owner", "repo", "branch"),
        ).rejects.toThrow(/Error loading branch/);
    });

    it("parses commit info on ok response", async () => {
        const fake = {
            ok: true,
            json: async () => ({
                commit: {
                    sha: "S",
                    commit: { tree: { sha: "T" } },
                    parents: [{ sha: "P" }],
                },
            }),
        } as unknown as Response;
        fetchMock.mockResolvedValueOnce(fake);
        const info = await priv.fetchBranchCommitInfo(
            "owner",
            "repo",
            "branch",
        );
        expect(info).toEqual({
            sha: "S",
            treeSha: "T",
            parents: [{ sha: "P" }],
        });
    });
});

describe("GitHubInteraction - ensureBranchCommit", () => {
    beforeEach(() => {
        github.setAuth("token");
        github.setOwner("owner");
        github.setRepo("repo");
        github.setBranch("branch");
        vi.restoreAllMocks();
        priv = github as unknown as GitHubInteractionPrivates;
    });

    it("does not call createBranch if branch exists", async () => {
        const commitInfo = { sha: "1", treeSha: "2", parents: [{ sha: "1" }] };
        vi.spyOn(github, "fetchRepoInfo").mockResolvedValueOnce({
            default_branch: "main",
            owner: "o",
        });
        vi.spyOn(priv, "fetchBranchCommitInfo").mockResolvedValueOnce(
            commitInfo,
        );
        const branchSpy = vi.spyOn(priv, "createBranch");

        const out = await priv.ensureBranchCommit("o", "r", "b");
        expect(out).toBe(commitInfo);
        expect(branchSpy).not.toHaveBeenCalled();
    });
});

describe("GitHubInteraction - low-level Git operations", () => {
    let fetchMock: MockedFunction<typeof fetch>;

    beforeEach(() => {
        github.setAuth("token");
        github.setOwner("owner");
        github.setRepo("repo");
        github.setBranch("branch");
        vi.stubGlobal("fetch", (fetchMock = vi.fn()));
        priv = github as unknown as GitHubInteractionPrivates;
    });

    it("createBranch succeeds on ok", async () => {
        fetchMock.mockResolvedValueOnce({ ok: true } as unknown as Response);
        await expect(
            priv.createBranch("o", "r", "b", "base"),
        ).resolves.toBeUndefined();
    });

    it("createBranch throws on error", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 400,
            text: async () => "err",
        } as unknown as Response);
        await expect(
            priv.createBranch("o", "r", "b", "base"),
        ).rejects.toThrow();
    });

    it("createTreeWithFiles throws on failure", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () => "fail",
        } as unknown as Response);
        await expect(
            priv.createTreeWithFiles("o", "r", [["p", "c"]], {}),
        ).rejects.toThrow(/Tree creation failed/);
    });

    it("createCommitFromTree returns info on success", async () => {
        const data = { sha: "S", tree: { sha: "T" }, parents: [{ sha: "P" }] };
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => data,
        } as unknown as Response);
        const out = await priv.createCommitFromTree("o", "r", "msg", {
            treeSha: "T",
            parents: [{ sha: "P" }],
        });
        expect(out.sha).toBe("S");
        expect(out.treeSha).toBe("T");
    });

    it("createCommitFromTree throws on error", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () => "err",
        } as unknown as Response);
        await expect(
            priv.createCommitFromTree("o", "r", "msg", {
                treeSha: "T",
                parents: [{ sha: "P" }],
            }),
        ).rejects.toThrow(/Commit creation failed/);
    });

    it("updateBranchRef throws on error", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 403,
            text: async () => "denied",
        } as unknown as Response);
        await expect(
            priv.updateBranchRef("o", "r", "b", "sha"),
        ).rejects.toThrow(/Update ref failed/);
    });
});

describe("GitHubInteraction - database commit successes", () => {
    beforeEach(() => {
        github.setAuth("token");
        github.setOwner("owner");
        github.setRepo("repo");
        github.setBranch("branch");
        vi.restoreAllMocks();
        priv = github as unknown as GitHubInteractionPrivates;
    });

    it("commitMultipleFromDatabase calls commitFiles on success", async () => {
        vi.spyOn(database, "loadMultiple").mockResolvedValueOnce([
            [1, "a"],
            [2, "b"],
        ]);
        const spy = vi
            .spyOn(github, "commitFiles")
            .mockResolvedValueOnce(undefined);
        await github.commitMultipleFromDatabase("msg", [1, 2], "store");
        expect(spy).toHaveBeenCalledWith("msg", [
            ["1", "a"],
            ["2", "b"],
        ]);
    });

    it("commitAllFromDatabase calls commitFiles on success", async () => {
        vi.spyOn(database, "loadAll").mockResolvedValueOnce([[3, "c"]]);
        const spy = vi
            .spyOn(github, "commitFiles")
            .mockResolvedValueOnce(undefined);
        await github.commitAllFromDatabase("msg", "store");
        expect(spy).toHaveBeenCalledWith("msg", [["3", "c"]]);
    });
});

describe("GitHubInteraction - headers getter", () => {
    it("returns correct default headers", () => {
        github.setAuth("my-token");
        const h = priv.headers as Record<string, string>;
        expect(h.Authorization).toBe("token my-token");
        expect(h.Accept).toBe("application/vnd.github.v3+json");
        expect(h["Content-Type"]).toBe("application/json");
    });
});
