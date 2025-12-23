// JB plugin checking the latest update per page, slotting in that date in the frontmatter

import { execSync } from 'child_process';
import path from 'path';

// Cache per build-run (key = absolute file path)
const gitDateCache = new Map();

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
function formatDateNL(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('nl-NL', { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
}

// slots in the date per page
const updateDateTransform = {
  name: 'update-date',
  stage: 'document',
  plugin: () => {
    return (node, file) => {
      if (!file?.path) return node;

      const iso = getGitUpdatedISOForFile(file.path);

      if (iso) {
        node.children.unshift({
          type: 'div',
          class: 'font-light text-sm mb-4 updated-date-container',
          children: [{ type: 'text', value: `Updated: ${formatDateNL(iso)}` }],
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
