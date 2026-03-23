import { openDB, IDBPDatabase } from "idb";
import { github } from "../github/githubInteraction";

/**
 * Configuration for {@link database}.
 */
export const config = {
    /** The name of the IndexedDB database. */
    name: "test_database",

    /**
     * The version of the database. Must be the same across all tabs;
     * mismatches will trigger an upgrade and may cause lock contention.
     */
    version: 1,

    /**
     * The list of object stores used in this database.
     * Extend this to support more data types.
     */
    stores: ["metadata", "markdown", "images"],
};

/**
 * Prefixes a repo to a key, to prevent conflicts between different repos with the same file names.
 * @param repo The repo that the key belongs to.
 * @param key The name of the key.
 * @returns The key with the prefix added.
 */
const _makePrefixedKey = (
    repo: string,
    branch: string,
    key: IDBValidKey,
): IDBValidKey => {
    return `${repo}::${branch}::${key}`;
};

/**
 * Removes the prefix from a key.
 * @param repo The repo that the key belongs to.
 * @param fullKey The combination of the repo and the name of the key.
 * @returns The key with the prefix removed.
 */
const _stripPrefix = (
    repo: string,
    branch: string,
    fullKey: IDBValidKey,
): IDBValidKey => {
    const prefix = `${repo}::${branch}::`;
    if (typeof fullKey === "string" && fullKey.startsWith(prefix)) {
        return fullKey.slice(prefix.length);
    }
    return fullKey;
};

/**
 * Extracts the branch name from a prefixed key of the form `${repo}::${branch}::${key}`.
 * @param repo     The repo namespace you used when prefixing.
 * @param fullKey  The fully-prefixed key (e.g. "my-repo::feature-foo::someFile.txt").
 * @returns        The branch name ("feature-foo") or `undefined` if it doesn’t match.
 */
const getBranchFromKey = (
    repo: string,
    fullKey: IDBValidKey,
): string | undefined => {
    if (typeof fullKey !== "string") return undefined;
    const prefix = `${repo}::`;
    if (!fullKey.startsWith(prefix)) return undefined;

    // strip off "repo::"
    const rest = fullKey.slice(prefix.length);

    // split on "::" and take the first piece as branch
    const [branch] = rest.split("::");
    return branch || undefined;
};

/**
 * Throws an error if the specified store is not in {@link config.stores}.
 * @param store - The store to validate.
 * @throws Will throw if the store is not defined in {@link config.stores}.
 */
const _validateStore = (store: string): void => {
    if (!config.stores.includes(store)) {
        throw new Error(
            `Invalid store "${store}". Must be one of: ${config.stores.join(", ")}`,
        );
    }
};

/**
 * Transactional functions for interacting with IndexedDB.
 * Uses the {@link https://www.npmjs.com/package/idb | idb} library.
 *
 * @property {Promise<IDBPDatabase> | null} dbPromise - Lazily initialised promise resolving to the IDB database.
 */
export const database = {

    /** Lazy-initialized promise for the IndexedDB connection. */
    dbPromise: null as Promise<IDBPDatabase> | null,

    /**
     * Indicates whether the repo has been initialized.
     * @returns True if initialized, false otherwise.
     */
    isInitialised(): boolean {
        return github.getBranch() != "" && github.getRepo() != "";
    },

    /**
     * Gets or initialises the IndexedDB connection.
     * @returns The opened IDB database instance.
     * @throws Will throw if the active repo hasn't been set.
     */
    async getDB(checkInit: boolean = true): Promise<IDBPDatabase> {
        if (checkInit) {
            if (!this.isInitialised()) {
                throw new Error(
                    "Attempting to access database before setting the active repo and or branch. Make sure the repo is set before any database interactions take place!",
                );
            }
        }
        if (!this.dbPromise) {
            this.dbPromise = openDB(config.name, config.version, {
                upgrade(db) {
                    for (const store of config.stores) {
                        if (!db.objectStoreNames.contains(store)) {
                            db.createObjectStore(store);
                        }
                    }
                },
            });
        }
        return this.dbPromise;
    },

    /**
     * Saves a value into the specified store under a namespaced key.
     * @param store - The name of the object store.
     * @param key - The key to store the value under.
     * @param value - The value to save.
     */
    async save<T>(store: string, key: IDBValidKey, value: T): Promise<void> {
        this.getDB(); //make sure the DB is initialised
        await this.saveTo(
            store,
            github.getRepo(),
            github.getBranch(),
            key,
            value,
        );
    },

    /**
     * Saves a value into the specified store under a namespaced key.
     * @param store - The name of the object store.
     * @param key - The key to store the value under.
     * @param value - The value to save.
     */
    async saveTo<T>(
        store: string,
        repo: string,
        branch: string,
        key: IDBValidKey,
        value: T,
    ): Promise<void> {
        _validateStore(store);
        const db = await this.getDB(false);
        const tx = db.transaction(store, "readwrite");
        const fullKey = _makePrefixedKey(repo, branch, key);
        await tx.store.put(value, fullKey);
        console.log("saved " + fullKey);
        console.log("data " + value);
        await tx.done;
    },

    /**
     * Loads a value by key from the specified store.
     * @param store - The object store to load from.
     * @param key - The key to retrieve.
     * @returns The stored value or undefined if not found.
     */
    async load<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
        this.getDB(); //make sure the DB is initialised
        return await this.loadFrom(
            store,
            github.getRepo(),
            github.getBranch(),
            key,
        );
    },

    /**
     * Loads a value by key from the specified store.
     * @param store - The object store to load from.
     * @param key - The key to retrieve.
     * @returns The stored value or undefined if not found.
     */
    async loadFrom<T>(
        store: string,
        repo: string,
        branch: string,
        key: IDBValidKey,
    ): Promise<T | undefined> {
        _validateStore(store);
        const db = await this.getDB(false);
        const tx = db.transaction(store, "readonly");
        const fullKey = _makePrefixedKey(repo, branch, key);
        const result = await tx.store.get(fullKey);
        await tx.done;
        return result;
    },

    /**
     * Scans locally saved files and extracts branch names from the keys.
     * @param store - The object store to load from.
     * @returns Branches for the current repo.
     */
    async loadLocalbranches(store: string): Promise<string[]> {
        const branches: string[] = [];

        _validateStore(store);
        const db = await this.getDB(false);
        const tx = db.transaction(store, "readonly");
        const allKeys = await tx.store.getAllKeys();
        await tx.done;
        allKeys
            .filter(
                (k) =>
                    typeof k === "string" &&
                    k.startsWith(`${github.getRepo()}::`),
            )
            .map((a) => {
                const branch = getBranchFromKey(github.getRepo(), a);
                if (branch === undefined) return;
                if (!branches.includes(branch)) {
                    branches.push(branch);
                    console.log(branch);
                }
            });
        return branches;
    },

    /**
     * Loads values for keys from the specified store.
     * @param store - The object store to load from.
     * @param keys - The keys to retrieve.
     * @returns An array of [key, value] tuples for found values.
     */
    async loadMultiple<T>(
        store: string,
        keys: IDBValidKey[],
    ): Promise<[IDBValidKey, T][]> {
        _validateStore(store);
        const db = await this.getDB();
        const tx = db.transaction(store, "readonly");
        const results: [IDBValidKey, T][] = [];

        for (const key of keys) {
            const fullKey = _makePrefixedKey(
                github.getRepo(),
                github.getBranch(),
                key,
            );
            const value = await tx.store.get(fullKey);
            if (value !== undefined) {
                results.push([key, value]);
            }
        }

        await tx.done;
        return results;
    },

    /**
     * Loads all key-value pairs for the current repo and branch in the specified store.
     * @param store - The object store to load from.
     * @returns An array of [key, value] tuples.
     */
    async loadAll<T>(store: string): Promise<[IDBValidKey, T][]> {
        _validateStore(store);
        const db = await this.getDB();
        const tx = db.transaction(store, "readonly");
        const allKeys = await tx.store.getAllKeys();
        const results: [IDBValidKey, T][] = [];

        // Only include keys for the current repo AND branch
        const prefix = `${github.getRepo()}::${github.getBranch()}::`;
        for (const key of allKeys) {
            if (typeof key === "string" && key.startsWith(prefix)) {
                const strippedKey = _stripPrefix(
                    github.getRepo(),
                    github.getBranch(),
                    key,
                );
                const value = await tx.store.get(key);
                if (value !== undefined) {
                    results.push([strippedKey, value]);
                }
            }
        }

        await tx.done;
        return results;
    },

    /**
     * Deletes a single key from the specified store.
     * @param store - The store from which to delete.
     * @param key - The key to delete.
     */
    async delete(store: string, key: IDBValidKey): Promise<void> {
        this.getDB(); //make sure the DB is initialised
        await this.deleteFrom(store, github.getRepo(), github.getBranch(), key);
    },

    /**
     * Deletes a single key from the specified store.
     * @param store - The store from which to delete.
     * @param key - The key to delete.
     */
    async deleteFrom(
        store: string,
        repo: string,
        branch: string,
        key: IDBValidKey,
    ): Promise<void> {
        _validateStore(store);
        const db = await this.getDB();
        const tx = db.transaction(store, "readwrite");
        const fullKey = _makePrefixedKey(repo, branch, key);
        await tx.store.delete(fullKey);
        await tx.done;
    },

    /**
     * Gets all keys for the current repo and branch in the specified store.
     * @param store - The store to list keys from.
     * @returns An array of repo-scoped keys.
     */
    async keys(store: string): Promise<IDBValidKey[]> {
        _validateStore(store);
        const db = await this.getDB();
        const tx = db.transaction(store, "readonly");
        const allKeys = await tx.store.getAllKeys();
        await tx.done;
        return allKeys
            .filter(
                (k) =>
                    typeof k === "string" &&
                    k.startsWith(
                        `${github.getRepo()}::${github.getBranch()}::`,
                    ),
            )
            .map((k) => _stripPrefix(github.getRepo(), github.getBranch(), k));
    },

    /**
     * Clears all keys associated with the current repo and branch in the given store.
     * @param store - The store to clear.
     */
    async clear(store: string): Promise<void> {
        _validateStore(store);
        const db = await this.getDB();
        const tx = db.transaction(store, "readwrite");
        const allKeys = await tx.store.getAllKeys();
        for (const key of allKeys) {
            if (
                typeof key === "string" &&
                key.startsWith(`${github.getRepo()}::${github.getBranch()}::`)
            ) {
                await tx.store.delete(key);
            }
        }
        await tx.done;
    },

    /**
     * Checks if a specific key exists in the store for the active repo and active branch.
     * @param store - The store to check.
     * @param key - The key to look for.
     * @returns True if the key exists, false otherwise.
     */
    async has(store: string, key: IDBValidKey): Promise<boolean> {
        _validateStore(store);
        const db = await this.getDB();
        const tx = db.transaction(store, "readonly");
        const fullKey = _makePrefixedKey(
            github.getRepo(),
            github.getBranch(),
            key,
        );
        const exists = (await tx.store.getKey(fullKey)) !== undefined;
        await tx.done;
        return exists;
    },

    /**
     * Destroys the database connection and deletes the database unless otherwise specified.
     * @param options - Options to control reset behavior.
     * @param options.preserveRepo - If true, does not clear the active repo.
     * @param options.preserveBranch - If true, does not clear the active branch.
     * @param options.preserveData - If true, does not delete database data
     */
    async destroy({ preserveData = false } = {}): Promise<void> {
        if (this.dbPromise) {
            (await this.dbPromise).close();
            this.dbPromise = null;
        }
        if (!preserveData) await indexedDB.deleteDatabase(config.name);
    },

    /**
     * Atomically re-prefixes every key from one namespace to another.
     * @param oldRepo    The current repo namespace.
     * @param oldBranch  The current branch namespace.
     * @param newRepo    The new repo namespace.
     * @param newBranch  The new branch namespace.
     * @param deleteOldValues Set to true to delete the old key-value pairs from the database.
     * @param stores The stores to execute the namespace change for.
     */
    async migrateNamespace(
        oldRepo: string,
        oldBranch: string,
        newRepo: string,
        newBranch: string,
        deleteOldValues: boolean = false,
        stores: string[] = config.stores,
    ): Promise<void> {
        for (const store of stores) {
            const keyDataPairs = await this.loadAll(store);
            for (const [fullKey, value] of keyDataPairs) {
                if (deleteOldValues) await this.delete(store, fullKey);
                const strippedKey = _stripPrefix(oldRepo, oldBranch, fullKey);
                await this.saveTo(
                    store,
                    newRepo,
                    newBranch,
                    strippedKey,
                    value,
                );
            }
        }
    },
};
