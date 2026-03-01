// JB plugin checking the latest update per page, slotting in that date in the frontmatter

import { execSync } from 'child_process';
import path from 'path';
import { readFileSync } from 'fs';

// Cache per build-run (key = absolute file path)
const gitDateCache = new Map();

// Function to read frontmatter - used to check if file is excluded via frontmatter
function getFrontmatter(srcPath) {
  try {
    const text = readFileSync(srcPath, 'utf-8');
    // Regex to capture everything between the first two sets of ---
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    
    if (!match) return null;

    const frontmatterBlock = match[1];
    const data = {};

    // Split by line and parse key-value pairs manually
    frontmatterBlock.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        
        // Basic type conversion
        if (value.toLowerCase() === 'false') data[key.trim()] = false;
        else if (value.toLowerCase() === 'true') data[key.trim()] = true;
        else data[key.trim()] = value;
      }
    });

    return data;
  } catch (err) {
    return null;
  }
}

function getRepoRoot() {
  return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
}

function getGitUpdatedISOForFile(filePathAbs) {
  if (gitDateCache.has(filePathAbs)) return gitDateCache.get(filePathAbs);

  try {
    const repoRoot = getRepoRoot();

    // checks relative path
    const rel = path.relative(repoRoot, filePathAbs).replace(/\\/g, '/'); // windows-safe

    // --follow = checks renamed files
    // %cI = strict ISO 8601
    const iso = execSync(`git log -1 --follow --format=%cI -- "${rel}"`, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    const result = iso || null;
    gitDateCache.set(filePathAbs, result);
    return result;
  } catch {
    gitDateCache.set(filePathAbs, null);
    return null;
  }
}

// returns date in given format
function formatDate(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
}

// slots in the date per page
const updateDateTransform = {
  name: 'update-date',
  stage: 'document',
  plugin: () => {
    return (node, file) => {
      if (!file?.path) return node;
      
      // Return if PDF export
      const isPDF = process.argv.some(arg => arg.includes("pdf") || arg.includes("typst"));
      if (isPDF) return node; 

      // Return if frontmatter has no-update-date: true
      const frontmatter = getFrontmatter(file.path);
      if (frontmatter?.['no-update-date'] === true) {
          return node;
      }

      const iso = getGitUpdatedISOForFile(file.path);

      if (iso) {
        node.children.unshift({
          type: 'div',
          class: 'font-light text-sm mb-4 updated-date-container',
          children: [{ type: 'text', value: `Updated: ${formatDate(iso)}` }],
        });
      } else {
        node.children.unshift({
          type: 'div',
          class: 'font-light text-sm mb-4',
          children: [],
        });
      }

      return node;
    };
  },
};

const plugin = {
  name: 'Auto Update Date Plugin',
  transforms: [updateDateTransform],
};

export default plugin;
