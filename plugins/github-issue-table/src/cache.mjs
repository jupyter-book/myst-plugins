import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CACHE_DIR = "_build/temp/github-issues";
const CACHE_TTL = 24 * 3600000; // 24 hours

function getCachePath(query) {
  const key = createHash("md5").update(query).digest("hex");
  return join(CACHE_DIR, `${key}.json`);
}

export function readCache(query) {
  const cachePath = getCachePath(query);
  if (!existsSync(cachePath)) return null;

  const data = JSON.parse(readFileSync(cachePath, "utf8"));
  const age = Date.now() - data.timestamp;

  if (age > CACHE_TTL) return null;
  return data.items;
}

export function writeCache(query, items) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = getCachePath(query);
  writeFileSync(cachePath, JSON.stringify({
    timestamp: Date.now(),
    query,
    items
  }));
}
