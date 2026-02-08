import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache directory relative to test file
const CACHE_DIR = path.join(__dirname, '..', '..', '..', '_build', 'cache');

describe('GitHub Issue Table Cache Validation', () => {
  test('cache directory exists', () => {
    expect(fs.existsSync(CACHE_DIR)).toBe(true);
  });

  test('cache directory contains github-search files', () => {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.startsWith('github-search-') && f.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
  });

  test('all cache files contain valid data', () => {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.startsWith('github-search-') && f.endsWith('.json'));

    let totalItems = 0;
    files.forEach(file => {
      const filePath = path.join(CACHE_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Should be valid JSON with the shared cache format
      const data = JSON.parse(content);
      expect(data).toHaveProperty('value');

      // The value should contain an items array
      expect(data.value).toHaveProperty('items');
      expect(Array.isArray(data.value.items)).toBe(true);

      totalItems += data.value.items.length;
    });

    // At least one cache file should have returned data
    expect(totalItems).toBeGreaterThan(0);
  });
});
