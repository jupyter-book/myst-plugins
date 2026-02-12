import { describe, expect, test, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of the myst-plugins project
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const AST_FILE = path.join(PROJECT_ROOT, '_build', 'site', 'content', 'github-handle-links.json');

describe('GitHub Handle Links Plugin', () => {
  beforeAll(() => {
    // Build the project from root
    execSync('myst build', {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
    });
  });

  test('AST output exists', () => {
    expect(fs.existsSync(AST_FILE)).toBe(true);
  });

  test('valid handle is converted to a link', () => {
    const content = fs.readFileSync(AST_FILE, 'utf-8');
    const ast = JSON.parse(content);

    // Find link nodes with github-handle-link class
    const handleLinks = findNodes(ast, (node) =>
      node.type === 'link' &&
      node.data?.hProperties?.class === 'github-handle-link'
    );

    // Should have at least one github handle link (for valid handles like @kirstiejane, @mfisher87)
    expect(handleLinks.length).toBeGreaterThanOrEqual(1);

    // Check one has proper structure
    const link = handleLinks[0];
    expect(link.url).toContain('github.com');
    expect(link.title).toContain('GitHub profile');
  });

  test('already-linked handle is not double-wrapped', () => {
    const content = fs.readFileSync(AST_FILE, 'utf-8');
    const ast = JSON.parse(content);

    // Find all link nodes
    const allLinks = findNodes(ast, (node) => node.type === 'link');

    // Check none have nested links
    const nestedLinks = allLinks.filter((link) => hasNestedLink(link));
    expect(nestedLinks.length).toBe(0);
  });

  test('handle already linked to GitHub gets avatar and styling', () => {
    const content = fs.readFileSync(AST_FILE, 'utf-8');
    const ast = JSON.parse(content);

    // The example doc has [@kirstiejane](https://github.com/kirstiejane)
    // which SHOULD get the github-handle-link treatment.
    // Match via the user-provided lowercase URL to distinguish from the
    // plugin-generated link (which uses GitHub's canonical casing).
    const handleLinks = findNodes(ast, (node) =>
      node.type === 'link' &&
      node.url === 'https://github.com/kirstiejane' &&
      node.data?.hProperties?.class === 'github-handle-link'
    );
    expect(handleLinks.length).toBeGreaterThanOrEqual(1);

    // It should have styles properly applied
    const wrapperSpan = findNodes(handleLinks[0], (node) =>
      node.type === 'span' && node.style?.whiteSpace === 'nowrap'
    );
    expect(wrapperSpan.length).toBe(1);

    const avatarSpan = findNodes(wrapperSpan[0], (node) =>
      node.type === 'span' && node.style?.borderRadius === '50%'
    );
    expect(avatarSpan.length).toBe(1);
  });

  test('invalid handle is not converted to a github-handle-link', () => {
    const content = fs.readFileSync(AST_FILE, 'utf-8');
    const ast = JSON.parse(content);

    const invalidLinks = findNodes(ast, (node) =>
      node.type === 'link' &&
      node.data?.hProperties?.class === 'github-handle-link' &&
      node.data?.hProperties?.['data-github-user'] === 'thisuserwontbelinked'
    );

    expect(invalidLinks.length).toBe(0);
  });

  test('handle in backticks is not converted', () => {
    const content = fs.readFileSync(AST_FILE, 'utf-8');
    const ast = JSON.parse(content);

    const invalidLinks = findNodes(ast, (node) =>
      node.type === 'link' &&
      node.data?.hProperties?.class === 'github-handle-link' &&
      node.data?.hProperties?.['data-github-user'] === 'usernamesinbackticks'
    );

    expect(invalidLinks.length).toBe(0);
  });

  test('handle linked to non-GitHub URL is not styled', () => {
    const content = fs.readFileSync(AST_FILE, 'utf-8');
    const ast = JSON.parse(content);

    // The example doc has [@kirstiejane](https://mystmd.org)
    // which should NOT get the github-handle-link treatment
    const nonGithubLinks = findNodes(ast, (node) =>
      node.type === 'link' &&
      node.url === 'https://mystmd.org' &&
      node.data?.hProperties?.class === 'github-handle-link'
    );

    expect(nonGithubLinks.length).toBe(0);
  });
});

// Helper: recursively find nodes matching a predicate
function findNodes(node, predicate, results = []) {
  if (!node) return results;
  if (predicate(node)) {
    results.push(node);
  }
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => findNodes(child, predicate, results));
  }
  // Also check mdast property if present
  if (node.mdast) {
    findNodes(node.mdast, predicate, results);
  }
  return results;
}

// Helper: check if a link node contains another link
function hasNestedLink(node) {
  if (!node || !Array.isArray(node.children)) return false;
  for (const child of node.children) {
    if (child.type === 'link') return true;
    if (hasNestedLink(child)) return true;
  }
  return false;
}
