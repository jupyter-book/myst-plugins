// File-based cache for GitHub API responses.
// Stores results in _build/cache/ as JSON files keyed by MD5 hash.
// Prevents repeated API calls across builds (24h TTL).
// Same pattern as github-issue-table/src/cache.mjs.

import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CACHE_DIR = "_build/cache";
const CACHE_PREFIX = "github-issue";
const CACHE_TTL = 24 * 3600000; // 24 hours

function getCachePath(key) {
  const hash = createHash("md5").update(key).digest("hex");
  return join(CACHE_DIR, `${CACHE_PREFIX}-${hash}.json`);
}

export function readCache(key) {
  const cachePath = getCachePath(key);
  if (!existsSync(cachePath)) return null;

  const data = JSON.parse(readFileSync(cachePath, "utf8"));
  if (Date.now() - data.timestamp > CACHE_TTL) return null;
  return data.item;
}

export function writeCache(key, item) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = getCachePath(key);
  writeFileSync(cachePath, JSON.stringify({ timestamp: Date.now(), key, item }));
}
