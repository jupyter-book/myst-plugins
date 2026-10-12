import { createSignal } from "solid-js";

/**
 * Reactive signal storing the href of the repository source link.
 * Initialized to null until `getRepositoryLink` runs.
 */
export const [repositoryHref, setRepositoryHref] = createSignal<string | null>(
    null,
);

/**
 * Reactive signal storing the href of the current file edit link.
 * Initialized to null until `getCurrentFileHref` runs.
 */
export const [currentFileHref, setCurrentFileHref] = createSignal<
    string | null
>(null);

/**
 * Locates the 'Source Repository' button on the page, extracts its href,
 * updates the 'repositoryHref' signal, logs to console, and returns it.
 *
 * @returns The GitHub repository URL if found, otherwise null.
 */
export function getRepositoryLink(): string | null {
    // Query for the button/link with class .btn-source-repository-button.
    const anchor = document.querySelector<HTMLAnchorElement>(
        "a.btn-source-repository-button",
    );

    // Return the anchor.href or null.
    if (anchor) {
        return setRepositoryHref(anchor.href);
    } else {
        // Only happens when a link to a GitHub repository is not found
        console.warn("Source repository link not found.");
        return setRepositoryHref(null);
    }
}

/**
 * Parses owner and repository name from a GitHub URL.
 *
 * @param href - Full repository URL or null
 * @returns An object with `owner` and `repo` properties, or null if parsing fails.
 */
export function parseOwnerRepoFromHref(
    href: string | null,
): { owner: string; repo: string } | null {
    if (!href) return null;
    // Example: https://github.com/owner/repo
    const match = href.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
        return { owner: match[1], repo: match[2] };
    }
    return null;
}

/**
 * Finds the 'Edit this file' button on the page, extracts its href,
 * updates the `currentFileHref` signal, logs to console, and returns it.
 *
 * @returns The GitHub file edit URL if found, otherwise null.
 */
export function getCurrentFileHref(): string | null {
    // Query for the edit button/link with class .btn-source-edit-button.
    const anchor = document.querySelector<HTMLAnchorElement>(
        "a.btn-source-edit-button",
    );

    // Return the anchor.href or null.
    if (anchor) {
        return setCurrentFileHref(anchor.href);
    } else {
        // In theory, this should never happen
        console.warn("Current file link not found.");
        return setCurrentFileHref(null);
    }
}

/**
 * Extracts the file path from a GitHub file URL.
 * Supports both /blob/<branch>/ and /edit/<branch>/ URLs.
 * Returns the path part after /blob/<branch>/ or /edit/<branch>/ in the GitHub URL,
 * or null if not available or not matched.
 * @param href The GitHub file URL to extract the file path from
 */
export function getFilePathFromHref(href: string | null): string | null {
    if (!href) return null;
    // Match both /blob/<branch>/ and /edit/<branch>/ patterns
    const match = href.match(
        /github\.com\/[^/]+\/[^/]+\/(?:blob|edit)\/[^/]+\/(.+)$/,
    );
    const filePath = match ? match[1] : null;
    console.log("Extracted file path:", filePath);
    return filePath;
}
