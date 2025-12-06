import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache directory relative to test file
const CACHE_DIR = path.join(__dirname, '..', '..', '..', '_build', 'temp', 'github-issues');

describe('GitHub Issue Table Cache Validation', () => {
  test('cache directory exists', () => {
    expect(fs.existsSync(CACHE_DIR)).toBe(true);
  });

  test('cache directory contains files', () => {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
  });

  test('all cache files contain valid data', () => {
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));

    let totalItems = 0;
    files.forEach(file => {
      const filePath = path.join(CACHE_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Should be valid JSON
      const data = JSON.parse(content);

      // Should have items array
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);

      // Count total items across all cache files
      totalItems += data.items.length;
    });

    // At least one cache file should have returned data
    expect(totalItems).toBeGreaterThan(0);
  });
});
