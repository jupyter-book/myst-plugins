// Cache Management for GitHub Issue Table Plugin

import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CACHE_DIR = "_build/temp/github-issues";
const CACHE_TTL = 24 * 3600000; // 24 hours in milliseconds

/**
 * Generate MD5 hash for cache key
 * @param {string} query - Query string
 * @returns {string} MD5 hash
 */
function getCacheKey(query) {
  return createHash("md5").update(query).digest("hex");
}

/**
 * Get cache file path for query
 * @param {string} query - Query string
 * @returns {string} Cache file path
 */
function getCachePath(query) {
  const key = getCacheKey(query);
  return join(CACHE_DIR, `${key}.json`);
}

/**
 * Read cached data if valid
 * @param {string} query - Query string
 * @returns {Array|null} Cached items or null if expired/missing
 */
export function readCache(query) {
  const cachePath = getCachePath(query);
  if (!existsSync(cachePath)) return null;

  const data = JSON.parse(readFileSync(cachePath, "utf8"));
  const age = Date.now() - data.timestamp;

  if (age > CACHE_TTL) return null;
  return data.items;
}

/**
 * Write data to cache
 * @param {string} query - Query string
 * @param {Array} items - Items to cache
 */
export function writeCache(query, items) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = getCachePath(query);
  writeFileSync(cachePath, JSON.stringify({
    timestamp: Date.now(),
    query,
    items
  }));
}
