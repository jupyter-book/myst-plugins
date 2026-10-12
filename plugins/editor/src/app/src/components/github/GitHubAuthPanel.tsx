import { Show } from "solid-js";
import { GitHubTokenInput } from "./GitHubTokenInput";
import { GitHubUserPanel } from "./GitHubUserPanel";
import {
  validateTokenAndLogin,
  type GitHubUser,
} from "../../lib/github/GithubLogin";

type Props = {
  token: string | null;
  user: GitHubUser | null;
  onLogout: () => void;
};

export const GitHubAuthPanel = (props: Props) => {
  return (
    <div class="p-6" style={{ width: "100%" }}>
      <Show when={!props.token}>
        <GitHubTokenInput
          onTokenSet={(token) => validateTokenAndLogin(token)}
        />
      </Show>
      <Show when={props.user} keyed>
        {(user) => (
          <GitHubUserPanel
            user={user}
            onLogout={props.onLogout}
            token={props.token ?? ""}
          />
        )}
      </Show>
    </div>
  );
};
