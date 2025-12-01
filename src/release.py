"""Release automation script for MyST plugins.

This script automates the process of creating GitHub releases for plugins in
the myst-plugins repository. It handles building plugins, collecting release
assets, and creating GitHub releases with proper tagging.

Usage:
    python src/release.py                      # List all available plugins
    python src/release.py plugin-name          # Dry-run release for plugin
    python src/release.py plugin-name --deploy # Actually create release
    python src/release.py --all                # Dry-run for all plugins
    python src/release.py --all --deploy       # Create releases for all

Arguments:
    plugin-name     Name of the plugin directory to release
    --all           Process all plugins in the repository
    --deploy        Actually create the release (default is dry-run)

Expected Behavior:
    1. Finds plugins based on folder name
    2. Checks if plugin has changes since last release (skips if no changes)
    3. Detects and runs build.js or build.mjs if present
    4. Collects release assets:
       - From dist/ directory if plugin was built
       - From plugin directory (.mjs files) if no build
    5. Extracts description from plugin README.md (first paragraph)
    6. Generates gh release command with:
       - Tag name: plugin directory name
       - Title: Formatted plugin name
       - Assets: Collected .mjs files
    7. Executes release if --deploy flag is present, otherwise shows command

Examples:
    # List all plugins with release status
    python src/release.py

    # Dry-run release for specific plugin (shows command without executing)
    python src/release.py github-issue-table

    # Actually create release for specific plugin
    python src/release.py github-issue-table --deploy

    # Create releases for all plugins that have changes
    python src/release.py --all --deploy
"""

import subprocess
import sys
from pathlib import Path


def log(message, level="info"):
    """Log a message with optional level."""
    prefix = {
        "success": "✅",
        "error": "❌",
        "warning": "⚠️",
    }.get(level, "")
    print(f"{prefix} {message}" if prefix else message)


def list_plugins(plugins_dir):
    """List all available plugins with their release status."""
    all_plugin_dirs = sorted([p for p in plugins_dir.iterdir() if p.is_dir()])

    log("Available plugins:")
    for plugin_dir in all_plugin_dirs:
        plugin_name = plugin_dir.name

        # Check for existing release
        try:
            result = subprocess.run(
                ["git", "tag", "-l", plugin_name],
                capture_output=True,
                text=True,
                check=True
            )

            if result.stdout.strip():
                # Get release date
                date_result = subprocess.run(
                    ["git", "log", "-1", "--format=%ai", plugin_name],
                    capture_output=True,
                    text=True,
                    check=True
                )
                if date_result.stdout.strip():
                    release_date = date_result.stdout.strip().split()[0]
                    print(
                        f"  - {plugin_name:<30} "
                        f"(last released: {release_date})"
                    )
                else:
                    print(f"  - {plugin_name:<30} (released)")
            else:
                print(f"  - {plugin_name:<30} (never released)")
        except subprocess.CalledProcessError:
            print(f"  - {plugin_name:<30} (status unknown)")

    print("\nUsage: python -m src.release <plugin-name> [--deploy]")
    print("       python -m src.release --all [--deploy]")


def check_changes_since_release(plugin_name, plugin_dir):
    """Check if plugin has changes since last release."""
    try:
        result = subprocess.run(
            ["git", "tag", "-l", plugin_name],
            capture_output=True,
            text=True,
            check=True
        )

        if result.stdout.strip():
            # Tag exists, check for changes since tag
            diff_result = subprocess.run(
                ["git", "diff", "--quiet", plugin_name,
                 "HEAD", "--", str(plugin_dir)],
                capture_output=True
            )

            if diff_result.returncode == 0:
                return False, "No changes since last release"
            else:
                return True, "Changes detected since last release"
        else:
            return True, "No previous release found"

    except subprocess.CalledProcessError as e:
        log(f"Could not check git history: {e}", "warning")
        return True, "Could not check git history"


def build_plugin(plugin_dir, build_file):
    """Build a plugin using its build file."""
    log(f"  Building plugin with {build_file.name}...")

    try:
        # Check if node_modules exists, if not run npm install
        if not (plugin_dir / "node_modules").exists():
            subprocess.run(
                ["npm", "install"],
                cwd=plugin_dir,
                check=True,
                capture_output=True
            )

        # Run the build
        subprocess.run(
            ["node", build_file.name],
            cwd=plugin_dir,
            check=True,
            capture_output=True
        )
        log("  Build successful")
        return True

    except subprocess.CalledProcessError as e:
        log(f"Build failed: {e}", "error")
        return False


def collect_release_assets(plugin_dir, built=False):
    """Collect release assets from plugin directory."""
    if built:
        # Use dist/ directory
        dist_dir = plugin_dir / "dist"
        if dist_dir.exists():
            assets = list(dist_dir.glob("*.mjs"))
            if not assets:
                log("No .mjs files found in dist/", "error")
                return []
            return assets
        else:
            log("dist/ directory not found", "error")
            return []
    else:
        # Use all .mjs files in plugin directory
        assets = list(plugin_dir.glob("*.mjs"))
        if not assets:
            log(f"No .mjs files found in {plugin_dir}", "error")
            return []
        return assets


def create_release(plugin_name, release_assets, deploy=False):
    """Create a GitHub release."""
    # Generate link to plugin README
    readme_url = f"https://github.com/jupyter-book/myst-plugins/tree/main/plugins/{plugin_name}"
    notes = f"See plugin documentation: {readme_url}"

    # Build gh release command
    asset_paths = [
        str(asset.resolve().relative_to(Path.cwd()))
        for asset in release_assets
    ]
    release_cmd = [
        "gh", "release", "create", plugin_name,
        "--title", plugin_name.replace("-", " ").title(),
        "--notes", notes
    ] + asset_paths

    # Show assets
    log(f"  Assets: {', '.join([a.name for a in release_assets])}")

    if deploy:
        log("  Creating release...")
        try:
            result = subprocess.run(
                release_cmd,
                check=True,
                capture_output=True,
                text=True
            )
            log("Release created!", "success")
            return True
        except subprocess.CalledProcessError as e:
            log(f"Release failed: {e.stderr}", "error")
            return False
    else:
        title = plugin_name.replace("-", " ").title()
        log(f'  Command: gh release create {plugin_name} --title "{title}" --notes "{notes}" {asset_paths[0]}')
        log("  (dry-run mode, use --deploy to execute)")
        return True


def process_plugin(plugin_name, plugins_dir, deploy=False):
    """Process a single plugin for release."""
    log(f"\n{plugin_name}:")

    plugin_dir = plugins_dir / plugin_name

    # Check if plugin directory exists
    if not plugin_dir.exists():
        log(f"  Plugin directory not found", "error")
        return False

    # Check if edited since last release
    has_changes, message = check_changes_since_release(plugin_name, plugin_dir)
    if not has_changes:
        log(f"  {message}, skipping")
        return True

    log(f"  {message}")

    # Check for build file
    build_js = plugin_dir / "build.js"
    build_mjs = plugin_dir / "build.mjs"
    build_file = build_js if build_js.exists() else (
        build_mjs if build_mjs.exists() else None
    )

    # Build if needed
    built = False
    if build_file:
        if not build_plugin(plugin_dir, build_file):
            return False
        built = True

    # Collect release assets
    release_assets = collect_release_assets(plugin_dir, built)
    if not release_assets:
        return False

    # Create release
    return create_release(plugin_name, release_assets, deploy)


def main(args=None):
    """Main entry point for the release script."""
    if args is None:
        args = sys.argv[1:]

    plugins_dir = Path("plugins")

    # Parse arguments
    deploy = "--deploy" in args
    all_plugins = "--all" in args
    plugin_names = [arg for arg in args if not arg.startswith("--")]

    # Get list of all plugins
    all_plugin_dirs = sorted([p for p in plugins_dir.iterdir() if p.is_dir()])

    # No arguments: list available plugins
    if not plugin_names and not all_plugins:
        list_plugins(plugins_dir)
        return 0

    # Determine which plugins to process
    if all_plugins:
        targets = [p.name for p in all_plugin_dirs]
    else:
        targets = plugin_names

    # Process each plugin
    success_count = 0
    for plugin_name in targets:
        if process_plugin(plugin_name, plugins_dir, deploy):
            success_count += 1

    log(f"\nProcessed {success_count}/{len(targets)} plugin(s)")

    return 0 if success_count == len(targets) else 1


if __name__ == "__main__":
    sys.exit(main())
