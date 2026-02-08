// Shared utilities for the GitHub plugin family.
// Provides file-based caching, tree traversal, API headers, and title cleaning.

import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CACHE_DIR = "_build/cache";
const CACHE_TTL = 24 * 3600000; // 24 hours

/**
 * Create a scoped file-based cache. Returns { readCache, writeCache }.
 * Stores JSON in _build/cache/ keyed by MD5 hash with a 24h TTL.
 */
export function createCache(prefix) {
  function getCachePath(key) {
    const hash = createHash("md5").update(key).digest("hex");
    return join(CACHE_DIR, `${prefix}-${hash}.json`);
  }

  function readCache(key) {
    const cachePath = getCachePath(key);
    if (!existsSync(cachePath)) return null;
    const data = JSON.parse(readFileSync(cachePath, "utf8"));
    if (Date.now() - data.timestamp > CACHE_TTL) return null;
    return data.value;
  }

  function writeCache(key, value) {
    mkdirSync(CACHE_DIR, { recursive: true });
    const cachePath = getCachePath(key);
    writeFileSync(cachePath, JSON.stringify({ timestamp: Date.now(), key, value }));
  }

  return { readCache, writeCache };
}

/** Depth-first tree walk. Calls callback(node, parent) on every node. */
export function walk(node, parent, callback) {
  if (!node) return;
  callback(node, parent);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, node, callback);
    }
  }
}

/** Return GitHub REST API headers, including Authorization when GITHUB_TOKEN is set. */
export function githubApiHeaders() {
  const headers = { Accept: "application/vnd.github+json" };
  const token = process?.env?.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** Remove [...] and (...) prefixes from issue/PR titles. */
export function stripBrackets(title) {
  if (!title) return "";
  return title.replace(/^(\[.*?\]|\(.*?\))\s*/g, "").trim();
}
