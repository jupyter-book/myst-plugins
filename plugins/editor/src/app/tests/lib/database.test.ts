import "fake-indexeddb/auto"; // requried to use the database in tests
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { database, config } from "../../src/lib/localStorage/database";
import { openDB } from "idb";
import { github } from "../../src/lib/github/githubInteraction";

const repoA = "test/test1";
const repoB = "test/test2";
const branchA = "main";
const branchB = "dev";

const store = "markdown";
const key = "README.md";
const value = "# Hello World";

describe("database module", () => {
    // Ensure database is clean before and after each test
    beforeEach(async () => {
        await database.destroy();
        github.setBranch("");
        github.setRepo("");
        github.setOwner("");
        github.setAuth("");
    });

    afterEach(async () => {
        await database.destroy();
        github.setBranch("");
        github.setRepo("");
        github.setOwner("");
        github.setAuth("");
    });

    /**
     * Verifies that an error is thrown when accessing the DB without setting a repo or branch.
     */
    it("should throw if used before repo or branch is set", async () => {
        await expect(database.getDB()).rejects.toThrow();
    });

    /**
     * Verifies that an error is thrown when accessing the DB without setting a repo.
     */
    it("should throw if used before repo is set", async () => {
        await github.setBranch(branchA);
        await expect(database.getDB()).rejects.toThrow();
    });

    /**
     * Verifies that an error is thrown when accessing the DB without setting a branch.
     */
    it("should throw if used before branch is set", async () => {
        await github.setBranch(branchA);
        await expect(database.getDB()).rejects.toThrow();
    });

    /**
     * Tests storing and retrieving data by key.
     */
    it("should save and load data", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        await database.save(store, key, value);
        const result = await database.load<string>(store, key);
        expect(result).toBe(value);
    });

    /**
     * Makes sure data is separated by branch
     */
    it("should isolate data by branch", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        await database.save(store, key, branchA);

        await github.setBranch(branchB);
        const missing = await database.load<string>(store, key);
        expect(missing).toBeUndefined();

        await github.setBranch(branchA);
        const present = await database.load<string>(store, key);
        expect(present).toBe(branchA);
    });

    /**
     * Ensures all keys are listed.
     */
    it("should list all keys on the correct branch", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        await database.save(store, "a.md", "A");
        await database.save(store, "b.md", "B");
        const keys = await database.keys(store);
        expect(keys.sort()).toEqual(["a.md", "b.md"]);

        await github.setBranch(branchB);
        const otherKeys = await database.keys(store);
        expect(otherKeys).toEqual([]);
    });

    it("should migrate namespace between branches and repos", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        await database.save(store, "one.md", "1");
        await database.save(store, "two.md", "2");

        await database.migrateNamespace(repoA, branchA, repoB, branchB, true, [
            store,
        ]);

        // old data should be removed under old namespace
        const oldKeys = await database.keys(store);
        expect(oldKeys).toEqual([]);

        // data should exist under new namespace
        await github.setRepo(repoB);
        await github.setBranch(branchB);
        const migrated = await database.loadAll<string>(store);
        const migratedKeys = migrated.map(([k]) => k).sort();
        expect(migratedKeys).toEqual(["one.md", "two.md"]);
        const migratedValues = migrated.map(([_, v]) => v);
        expect(migratedValues).toContain("1");
        expect(migratedValues).toContain("2");
    });

    /**
     * Verifies that specific keys can be deleted.
     */
    it("should delete specific keys", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        await database.save(store, "file1.md", "data");
        await database.save(store, "file2.md", "data");
        await database.delete(store, "file1.md");
        const keys = await database.keys(store);
        expect(keys).toEqual(["file2.md"]);
    });

    /**
     * Clears all keys for the current repo within a given store.
     */
    it("should clear all keys for current repo in store", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        await database.save(store, "1.md", "one");
        await database.save(store, "2.md", "two");
        await database.clear(store);
        const keys = await database.keys(store);
        expect(keys).toEqual([]);
    });

    /**
     * Verifies `has()` correctly identifies presence or absence of keys.
     */
    it("should return true/false for has()", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        await database.save(store, "exists.md", "yes");
        const hasIt = await database.has(store, "exists.md");
        const missing = await database.has(store, "missing.md");
        expect(hasIt).toBe(true);
        expect(missing).toBe(false);
    });

    /**
     * Loads all key-value pairs.
     */
    it("should loadAll() key-value pairs for current repo only", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        await database.save(store, "one.md", "1");
        await database.save(store, "two.md", "2");
        const all = await database.loadAll(store);
        expect(all).toEqual([
            ["one.md", "1"],
            ["two.md", "2"],
        ]);
    });

    /**
     * Throws an error when trying to use an invalid store.
     */
    it("should reject invalid store usage", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        await expect(database.save("notastore", "x", "y")).rejects.toThrow();
    });

    /**
     * Verifies transactional rollback.
     */
    it("should not persist partial writes if transaction fails", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        const db = await database.getDB();

        const tx = db.transaction(store, "readwrite");
        const fullKey1 = `${repoA}::partial1.md`;
        const fullKey2 = `${repoA}::partial2.md`;

        await tx.store.put("data1", fullKey1);
        await tx.store.put("data2", fullKey2);

        tx.abort();

        try {
            await tx.done;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            //expected
        }

        // Confirm data is not saved
        const keys = await database.keys(store);
        expect(keys).not.toContain("partial1.md");
        expect(keys).not.toContain("partial2.md");
    });

    /**
     * Confirms another tab (simulated via a separate connection) can read data.
     */
    it("should allow simultaneous access from multiple db connections", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        await database.save(store, "a.md", "From Main Connection");

        // Open a separate IndexedDB connection (simulating another tab)
        const altDB = await openDB(config.name, config.version);
        const tx = altDB.transaction(store, "readonly");
        const val = await tx.store.get(`${repoA}::${branchA}::a.md`);
        await tx.done;

        expect(val).toBe("From Main Connection");
        altDB.close();
    });

    /**
     * Verifies visibility of writes only after the transaction is complete.
     */
    it("should see uncommitted writes only after transaction done", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        const db = await database.getDB();

        const tx = db.transaction(store, "readwrite");
        const fullKey = `${repoA}::${branchA}::transient.md`;
        await tx.store.put("temp", fullKey);

        // Try reading before .done — should still work because IDB commits on success
        const readTx = db.transaction(store, "readonly");
        const result = await readTx.store.get(fullKey);
        await readTx.done;

        expect(result).toBe("temp");

        await tx.done;

        // After commit, data should still be available
        const final = await database.load(store, "transient.md");
        expect(final).toBe("temp");
    });

    /**
     * Confirms that data from an aborted transaction is not persisted.
     */
    it("should not see data from a failed transaction", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        const db = await database.getDB();

        const tx = db.transaction(store, "readwrite");
        const fullKey = `${repoA}::failtest.md`;
        await tx.store.put("will-fail", fullKey);
        tx.abort(); // Cancel transaction
        try {
            await tx.done;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            // expected
        }

        // Should not exist
        const result = await database.load(store, "failtest.md");
        expect(result).toBeUndefined();
    });

    /**
     * Ensures `loadAll()` filters out keys from other repos.
     */
    it("loadAll() should not return data from other repos", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        await database.save(store, "a.md", "A");
        await database.save(store, "b.md", "B");

        await github.setRepo(repoB);
        await github.setBranch(branchB);
        await database.save(store, "z.md", "Z");

        await github.setRepo(repoA);
        await github.setBranch(branchA);
        const result = await database.loadAll(store);
        const keys = result.map(([k]) => k);
        expect(keys).not.toContain("z.md");
    });

    /**
     * Verifies that different stores can be used independently.
     */
    it("should handle multiple stores independently", async () => {
        await github.setRepo(repoA);
        await github.setBranch(branchA);

        // Save to different stores
        await database.save("markdown", "mdfile.md", "Markdown Content");
        await database.save("images", "image.png", "Base64ImageData");
        await database.save("metadata", "meta.json", '{ "author": "alice" }');

        // Load back each value and assert correctness
        const md = await database.load("markdown", "mdfile.md");
        const img = await database.load("images", "image.png");
        const meta = await database.load("metadata", "meta.json");

        expect(md).toBe("Markdown Content");
        expect(img).toBe("Base64ImageData");
        expect(meta).toBe('{ "author": "alice" }');

        // Keys should be isolated per store
        const markdownKeys = await database.keys("markdown");
        const imageKeys = await database.keys("images");
        const metaKeys = await database.keys("metadata");

        expect(markdownKeys).toEqual(["mdfile.md"]);
        expect(imageKeys).toEqual(["image.png"]);
        expect(metaKeys).toEqual(["meta.json"]);
    });

    /**
     * Simulates two tabs working on separate repos without interference.
     */
    it("should allow multiple tabs to work on separate repos simultaneously", async () => {
        // Tab 1
        await github.setRepo(repoA);
        await github.setBranch(branchA);
        await database.save("markdown", "shared1.md", "Content A");

        // Simulate Tab 2 with its own DB connection and different repo
        const altDB = await openDB(config.name, config.version);
        const tx = altDB.transaction("markdown", "readwrite");
        const fullKeyB = `${repoB}::shared2.md`;
        await tx.store.put("Content B", fullKeyB);
        await tx.done;

        // Tab 1 should see only its own data
        const ownData = await database.load("markdown", "shared1.md");
        expect(ownData).toBe("Content A");

        // Tab 2 reads its data directly
        const readTx = altDB.transaction("markdown", "readonly");
        const otherData = await readTx.store.get(fullKeyB);
        await readTx.done;

        expect(otherData).toBe("Content B");

        // Confirm loadAll() from Tab 1 doesn't include Tab 2's entry
        const tab1Keys = await database.keys("markdown");
        expect(tab1Keys).not.toContain("shared2.md"); // from repoB
        expect(tab1Keys).toContain("shared1.md"); // from repoA

        altDB.close();
    });
});
