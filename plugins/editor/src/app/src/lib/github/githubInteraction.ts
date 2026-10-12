import { database } from "../localStorage/database";
import { createSignal } from "solid-js";

/**
 * Interface to simplify handling data from GitHub API calls.
 */
interface RepoInfo {
    /** Owner of the repo. */
    owner: string;

    /** Default branch of the repo. */
    default_branch: string;
}

/**
 * Interface to simplify handling data from GitHub API calls.
 */
interface BranchCommitInfo {
    /** The commit SHA for this branch tip. */
    sha: string;

    /** The SHA of the Git tree at this commit. */
    treeSha: string;

    /** The list of parent commits (usually one, but can be two for merges). */
    parents: { sha: string }[];
}

/**
 * Encapsulates interactions with the GitHub API, including fetching file
 * contents, listing branches, and creating commits/trees.
 */
class GitHubInteraction {
    /** The current repository name. */
    private repo = "";

    /** The current repository owner. */
    private owner = "";

    /** Personal access token or OAuth token for authentication. */
    private auth = "";

    /** The branch to target for fetches and commits. */
    private branch = "";

    /** Signal getter for the repository name. */
    public getRepo: () => string;

    /** Signal setter for the repository name. */
    public setRepo: (v: string) => void;

    /** Signal getter for the repo owner. */
    public getOwner: () => string;

    /** Signal setter for the repo owner. */
    public setOwner: (v: string) => void;

    /** Signal getter for the auth token. */
    public getAuth: () => string;

    /** Signal setter for the auth token. */
    public setAuth: (v: string) => void;

    /** Signal getter for the branch name. */
    public getBranch: () => string;

    /** Signal setter for the branch name. */
    public setBranch: (v: string) => void;

    /**
     * Create a new GitHubInteraction.
     * @param repo - Initial repository name.
     * @param owner - Initial repository owner.
     * @param auth - Initial authentication token.
     * @param branch - Initial branch name.
     */
    constructor(repo: string, owner: string, auth: string, branch: string) {
        // Assign variables.
        this.repo = repo;
        this.owner = owner;
        this.auth = auth;
        this.branch = branch;

        // Create reactive signals for each piece of state.
        const [getRepoSignal, setRepoSignal] = createSignal(this.repo);
        this.getRepo = getRepoSignal;
        this.setRepo = setRepoSignal;

        const [getOwnerSignal, setOwnerSignal] = createSignal(this.owner);
        this.getOwner = getOwnerSignal;
        this.setOwner = setOwnerSignal;

        const [getAuthSignal, setAuthSignal] = createSignal(this.auth);
        this.getAuth = getAuthSignal;
        this.setAuth = setAuthSignal;

        const [getBranchSignal, setBranchSignal] = createSignal(this.branch);
        this.getBranch = getBranchSignal;
        this.setBranch = setBranchSignal;
    }

    /**
     * HTTP headers including authentication for GitHub API calls.
     */
    private get headers(): Record<string, string> {
        // start with the always-present headers
        const headers: Record<string, string> = {
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        };

        // only add Authorization if we actually have a token
        const token = this.getAuth();
        if (token) {
            headers.Authorization = `token ${token}`;
        }

        return headers;
    }

    /**
     * Fetches raw file contents for the given file paths, trying the current
     * branch first and falling back to the repository's default branch.
     * @param filePaths - Array of file paths within the repo.
     * @returns Array of file contents as strings, in the same order.
     * @throws If files cannot be retrieved from either branch.
     */
    public async fetchFiles(filePaths: string[]): Promise<string[]> {
        // Try to load content from current branch.
        try {
            return await this.fetchFilesFromBranch(filePaths, this.getBranch());
        } catch (e) {
            console.log(
                "unable to fetch file contents from current branch. " + e,
            );
        }

        // Try to load content from default branch.
        try {
            const repoInfo = await this.fetchRepoInfo(
                this.getOwner(),
                this.getRepo(),
            );
            return await this.fetchFilesFromBranch(
                filePaths,
                repoInfo.default_branch,
            );
        } catch (e) {
            console.log(
                "unable to fetch file contents from default branch. " + e,
            );
        }

        // Throw if no content was retrieved.
        throw new Error("Unable to fetch file contents.");
    }

    /**
     * Fetches raw file contents from a single named branch.
     * @param filePaths - Array of file paths.
     * @param branchName - Branch name to fetch from.
     * @returns Array of file contents as strings.
     */
    public async fetchFilesFromBranch(
        filePaths: string[],
        branchName: string,
    ): Promise<string[]> {
        return Promise.all(
            filePaths.map((fp) => this.fetchFileFromBranch(fp, branchName)),
        );
    }

    /**
     * Fetches the raw contents of a single file via GitHub's "raw" media type.
     * @param filePath - Path to the file in the repo.
     * @param branchName - Branch from which to fetch.
     * @returns File content as a string.
     * @throws If the HTTP response is not OK.
     */
    public async fetchFileFromBranch(
        filePath: string,
        branchName: string,
    ): Promise<string> {
        // Edit the header to make sure we get raw data for the file contents.
        const header = this.headers;
        header.Accept = "application/vnd.github.v3.raw";

        // Fetch the data, throw if the response was not okay.
        const resp = await fetch(
            `https://api.github.com/repos/${this.getOwner()}/${this.getRepo()}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branchName)}`,
            { headers: header },
        );
        if (!resp.ok) {
            throw new Error(`Error getting file from "${filePath}"! \n`);
        }

        // Return the text content of the response if the response was okay.
        return await resp.text();
    }

    /**
     * Creates a Git commit on the configured branch by uploading blobs,
     * creating a tree and commit, then updating the branch ref.
     * @template T type of file contents.
     * @param message - Commit message.
     * @param files - Array of [filePath, content] tuples.
     */
    public async commitFiles<T>(
        message: string,
        files: [string, T][],
    ): Promise<void> {
        // Make sure the branch exists
        const baseCommit = await this.ensureBranchCommit(
            this.getOwner(),
            this.getRepo(),
            this.getBranch(),
        );

        // Create a tree
        const treeCommit = await this.createTreeWithFiles(
            this.getOwner(),
            this.getRepo(),
            files,
            baseCommit,
        );

        // Create a commit
        const newCommit = await this.createCommitFromTree(
            this.getOwner(),
            this.getRepo(),
            message,
            treeCommit,
        );

        // Update branch ref
        await this.updateBranchRef(
            this.getOwner(),
            this.getRepo(),
            this.getBranch(),
            newCommit.sha,
        );
    }

    /**
     * Commits a single file from the local database to GitHub.
     * @template T type of file contents.
     * @param message - Commit message.
     * @param key - Key of the file in the database.
     * @param store - Name of the object store.
     * @throws If no file is found under the given key.
     */
    public async commitFromDatabase<T>(
        message: string,
        key: IDBValidKey,
        store: string,
    ): Promise<void> {
        // Load file from database.
        const file = await database.load<T>(store, key);

        // Throw if the file was not found.
        if (file === undefined) {
            throw new Error(
                `No file found under key "${key}" in store "${store}"`,
            );
        }

        // Commit the file if it exists.
        await this.commitFiles<T>(message, [[key.toString(), file]]);
    }

    /**
     * Commits multiple files from the local database to GitHub.
     * @template T type of file contents.
     * @param message - Commit message.
     * @param keys - Array of keys in the database.
     * @param store - Name of the object store.
     * @throws If any file keys are missing in the database.
     */
    public async commitMultipleFromDatabase<T>(
        message: string,
        keys: IDBValidKey[],
        store: string,
    ): Promise<void> {
        // Load files from database.
        const files = await database.loadMultiple<T>(store, keys);

        // Make sure all keys were retrieved, throw otherwise.
        const foundKeys = new Set(files.map(([k]) => k.toString()));
        const missing = keys
            .map((k) => k.toString())
            .filter((k) => !foundKeys.has(k));
        if (missing.length) {
            throw new Error(`Missing files for keys: ${missing.join(", ")}`);
        }

        // Commit all files for the keys!
        await this.commitFiles<T>(
            message,
            files.map((a: [IDBValidKey, T]) => [a[0].toString(), a[1]]),
        );
    }

    /**
     * Commits all files from the local IndexedDB database to GitHub.
     * @template T type of file contents.
     * @param message - Commit message.
     * @param store - Name of the object store.
     * @throws If no files are found in the object store.
     */
    public async commitAllFromDatabase<T>(
        message: string,
        store: string,
    ): Promise<void> {
        // Load all files from the database.
        const files = await database.loadAll<T>(store);

        // Throw if the database is empty.
        if (!files.length) {
            throw new Error(`No files found in store "${store}"`);
        }

        // Commit all found files!
        await this.commitFiles<T>(
            message,
            files.map((a: [IDBValidKey, T]) => [a[0].toString(), a[1]]),
        );
    }

    /**
     * Fetches up to 100 remote branches from the GitHub repository.
     * @returns Array of branch names.
     * @throws If the HTTP request fails.
     */
    public async fetchRemoteBranches(): Promise<string[]> {
        // Fetch.
        const resp = await fetch(
            `https://api.github.com/repos/${this.getOwner()}/${this.getRepo()}/branches?per_page=100`, // TODO check if higher numbers are allowed
            { headers: this.headers },
        );

        // Throw if response not ok.
        if (!resp.ok) {
            throw new Error(
                `Failed to list branches: ${resp.status} ${await resp.text()}`,
            );
        }

        // Return an array of the names of all branches.
        const data: { name: string }[] = await resp.json();
        return data.map((b) => b.name);
    }

    /**
     * Ensures the target branch exists by reading its current commit or
     * creating it off the default branch if missing.
     * @param owner - Repo owner.
     * @param repo - Repo name.
     * @param branch - Branch name to ensure.
     * @returns Commit info for the branch tip.
     * @throws If creation or fetch fails.
     */
    private async ensureBranchCommit(
        owner: string,
        repo: string,
        branch: string,
    ): Promise<BranchCommitInfo> {
        // Get the repoInfo for the specified repo.
        const repoInfo = await this.fetchRepoInfo(owner, repo);

        // Get commit info the the specified branch.
        let commit: BranchCommitInfo | undefined;
        const remoteBranches = await this.fetchRemoteBranches();
        if (remoteBranches.includes(branch)) {
            commit = await this.fetchBranchCommitInfo(owner, repo, branch);
        }

        // If the branch does not exist on remote, attempt to create it from the default branch.
        if (commit === undefined) {
            // Fetch default branch commit info so we can grab a sha
            const defaultInfo = await this.fetchBranchCommitInfo(
                owner,
                repo,
                repoInfo.default_branch,
            );
            if (!defaultInfo) {
                throw new Error(
                    `Cannot create branch ${branch}: default branch ${repoInfo.default_branch} has no commit`,
                );
            }

            //  Create the new branch using the sha from the default branch
            try {
                await this.createBranch(
                    owner,
                    repo,
                    branch,
                    defaultInfo.sha, // ← now a valid 40-char SHA
                );
            } catch (err) {
                if (
                    !(err instanceof Error) ||
                    !err.message.includes("Reference already exists")
                ) {
                    throw err;
                }
            }
            // Check if the new branch now exists.
            commit = await this.fetchBranchCommitInfo(owner, repo, branch);

            // If creation of a new branch fails, throw.
            if (!commit) {
                throw new Error(
                    "Branch creation failed; could not load commit info.",
                );
            }
        }

        // Return the info for the branch.
        return commit;
    }

    /**
     * Builds a new tree on top of a base commit by adding or updating blobs.
     * @param base - The base commit info.
     * @param newTreeSha - SHA of the newly created tree.
     * @returns A BranchCommitInfo struct pointing to the new tree.
     */
    public updateTreeInfo(
        base: BranchCommitInfo,
        newTreeSha: string,
    ): BranchCommitInfo {
        return {
            sha: base.sha,
            treeSha: newTreeSha,
            parents: [{ sha: base.sha }],
        };
    }

    /**
     * Converts a raw GitHub commit response into BranchCommitInfo.
     * @param response - JSON response from POST /git/commits.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public createCommitInfo(response: any): BranchCommitInfo {
        return {
            sha: response.sha,
            treeSha: response.tree.sha,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parents: response.parents.map((p: any) => ({ sha: p.sha })),
        };
    }

    /**
     * Fetches repository metadata (including default branch).
     * @param owner - Repo owner.
     * @param repo - Repo name.
     * @returns RepoInfo JSON.
     * @throws On HTTP errors.
     */
    public async fetchRepoInfo(
        owner: string = this.getOwner(),
        repo: string = this.getRepo(),
    ): Promise<RepoInfo> {
        const resp = await fetch(
            `https://api.github.com/repos/${owner}/${repo}`,
            { headers: this.headers },
        );
        if (!resp.ok) {
            throw new Error(
                `Failed to load repo info: ${resp.status} ${await resp.text()}`,
            );
        }
        return resp.json();
    }

    /**
     * Reads the current commit info for a branch.
     * @param owner - Repo owner.
     * @param repo - Repo name.
     * @param branch - Branch name.
     * @returns BranchCommitInfo or undefined if 404.
     * @throws On non-404 HTTP errors.
     */
    private async fetchBranchCommitInfo(
        owner: string,
        repo: string,
        branch: string,
    ): Promise<BranchCommitInfo | undefined> {
        const resp = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
            { headers: this.headers },
        );
        if (resp.status === 404) return undefined;
        if (!resp.ok) {
            throw new Error(`Error loading branch: ${resp.status}`);
        }
        const data = await resp.json();
        return {
            sha: data.commit.sha,
            treeSha: data.commit.commit.tree.sha,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parents: data.commit.parents.map((p: any) => ({ sha: p.sha })),
        };
    }

    /**
     * Creates a new branch reference in the repository.
     * @param owner - Repo owner.
     * @param repo - Repo name.
     * @param branch - New branch name.
     * @param base - SHA of the base commit (usually default branch tip).
     */
    private async createBranch(
        owner: string,
        repo: string,
        branch: string,
        base: string,
    ): Promise<void> {
        const resp = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/refs`,
            {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify({
                    ref: `refs/heads/${branch}`,
                    sha: base,
                }),
            },
        );

        if (resp.ok) {
            return;
        }

        const errorBody = await resp.text();
        throw new Error(`Create branch failed: ${resp.status} ${errorBody}`);
    }

    /**
     * Ensures a branch exists on the remote, creating it from the default
     * branch if missing.
     * @param branch - Branch name to ensure.
     */
    public async ensureBranchExists(branch: string): Promise<void> {
        const owner = this.getOwner();
        const repo = this.getRepo();
        const repoInfo = await this.fetchRepoInfo(owner, repo);
        const remoteBranches = await this.fetchRemoteBranches();
        if (remoteBranches.includes(branch)) return;

        const baseInfo = await this.fetchBranchCommitInfo(
            owner,
            repo,
            repoInfo.default_branch,
        );
        if (!baseInfo) {
            throw new Error(
                `Cannot create branch ${branch}: default branch ${repoInfo.default_branch} has no commit`,
            );
        }
        try {
            await this.createBranch(owner, repo, branch, baseInfo.sha);
        } catch (err) {
            if (
                !(err instanceof Error) ||
                !err.message.includes("Reference already exists")
            ) {
                throw err;
            }
        }
    }

    /**
     * Creates a Git tree with the provided files on top of a base commit.
     * @param owner - Repo owner.
     * @param repo - Repo name.
     * @param files - Array of [path, content] tuples.
     * @param base - Base commit info.
     * @returns Updated BranchCommitInfo pointing to new tree.
     */
    private async createTreeWithFiles<T>(
        owner: string,
        repo: string,
        files: [string, T][],
        base: BranchCommitInfo,
    ): Promise<BranchCommitInfo> {
        // Create the entries for the files
        const entries = files.map(([path, content]) => ({
            path,
            mode: "100644",
            type: "blob",
            content:
                typeof content === "string" ? content : JSON.stringify(content),
        }));

        // Create a tree from the entries.
        const resp = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/trees`,
            {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify({
                    base_tree: base.treeSha,
                    tree: entries,
                }),
            },
        );

        // Throw if the creation failed.
        if (!resp.ok) {
            throw new Error(
                `Tree creation failed: ${resp.status} ${await resp.text()}`,
            );
        }

        // Return an updated version of the base branch info with the new tree sha.
        const data = await resp.json();
        return this.updateTreeInfo(base, data.sha);
    }

    /**
     * Creates a Git commit from a tree.
     * @param owner - Repo owner.
     * @param repo - Repo name.
     * @param message - Commit message.
     * @param base - Info about the tree/parents.
     * @returns BranchCommitInfo for the new commit.
     */
    private async createCommitFromTree(
        owner: string,
        repo: string,
        message: string,
        base: BranchCommitInfo,
    ): Promise<BranchCommitInfo> {
        // Create a commit.
        const resp = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/commits`,
            {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify({
                    message,
                    tree: base.treeSha,
                    parents: base.parents.map((p) => p.sha),
                }),
            },
        );

        // Throw if it failed.
        if (!resp.ok) {
            throw new Error(
                `Commit creation failed: ${resp.status} ${await resp.text()}`,
            );
        }

        // Return the info from the response.
        const data = await resp.json();
        return this.createCommitInfo(data);
    }

    /**
     * Updates a branch reference to point to a new commit SHA.
     * @param owner - Repo owner.
     * @param repo - Repo name.
     * @param branch - Branch name to update.
     * @param sha - New commit SHA.
     */
    private async updateBranchRef(
        owner: string,
        repo: string,
        branch: string,
        sha: string,
    ): Promise<void> {
        const resp = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
            {
                method: "PATCH",
                headers: this.headers,
                body: JSON.stringify({ sha }),
            },
        );
        if (!resp.ok) {
            throw new Error(
                `Update ref failed: ${resp.status} ${await resp.text()}`,
            );
        }
    }

    /**
     * Creates a pull request from head to base.
     * @param owner - Repo owner.
     * @param repo - Repo name.
     * @param title - PR title.
     * @param head - Source branch name.
     * @param base - Target branch name.
     * @param body - Optional PR body.
     */
    public async createPullRequest(
        owner: string,
        repo: string,
        title: string,
        head: string,
        base: string,
        body?: string,
    ): Promise<{ html_url?: string }> {
        const resp = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/pulls`,
            {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify({
                    title,
                    head,
                    base,
                    body,
                }),
            },
        );
        if (!resp.ok) {
            throw new Error(
                `Create pull request failed: ${resp.status} ${await resp.text()}`,
            );
        }
        return resp.json();
    }
}

/**
 * Singleton instance of GitHubInteraction.
 */
export const github = new GitHubInteraction("", "", "", "");
