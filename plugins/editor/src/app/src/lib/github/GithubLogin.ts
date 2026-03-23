import { createSignal, onMount } from "solid-js";
import { github } from "./githubInteraction";
import { database } from "../localStorage/database";

/**
 * Represents a GitHub user retrieved via the API.
 * @property login - The user's login/username.
 * @property id - The user's unique numeric ID.
 * @property avatar_url - Optional URL to the user's avatar image.
 */
export type GitHubUser = {
    login: string;
    id: number;
    avatar_url?: string;
};

/**
 * Fetches the authenticated GitHub user's profile information.
 *
 * @param token - A valid GitHub OAuth or personal access token.
 * @returns A promise resolving to the authenticated user's info.
 * @throws Error if the HTTP response is not OK.
 */
const getUserInfo = async (token: string): Promise<GitHubUser> => {
    const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to fetch user info");

    return res.json();
};

/**
 * Custom Solid.js hook for GitHub authentication state management.
 * @returns An object containing:
 *   - user: getter for the current GitHubUser or null.
 *   - setUser: setter to update the user manually.
 *   - logout: function to clear stored token and user.
 */
export function useGitHubAuth() {
    // Run once when useGitHubAuth() is first used in a component.
    onMount(() => {
        // Attempt to retrieve previously saved token from localStorage.
        database
            .loadFrom<string>("metadata", "token", "token", "token")
            .then((saved) => {
                if (saved !== undefined) {
                    if (!validateTokenAndLogin(saved)) {
                        //remove bad token from database
                        database
                            .deleteFrom("metadata", "token", "token", "token")
                            .then();
                    }
                }
            });
    });

    /**
     * Logs the user out by clearing token and user signals and localStorage.
     */
    const logout = () => {
        database.deleteFrom("metadata", "token", "token", "token").then();
        github.setAuth("");
        setUser(null);
    };

    return { user, logout };
}

export const [user, setUser] = createSignal<GitHubUser | null>(null);

export async function validateTokenAndLogin(token: string): Promise<boolean> {
    try {
        const res = await fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return false;
        github.setAuth(token);
        const repoInfo = github.fetchRepoInfo(); // load default branch
        if (github.getBranch() == "")
            github.setBranch((await repoInfo).default_branch); // set as curent branch TODO load from database
        database.saveTo<string>("metadata", "token", "token", "token", token); // update token in database with valid token
        getUserInfo(token).then(setUser); //set user, signal to other components that we are finally logged in
        return true;
    } catch {
        return false;
    }
}
