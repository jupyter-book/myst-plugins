from pathlib import Path

import nox

nox.options.default_venv_backend = "uv|virtualenv"


@nox.session(python=False)
def build(session):
    """Build all plugins that have a build.mjs file."""
    for build_file in sorted(Path("plugins").glob("*/build.mjs")):
        plugin_dir = build_file.parent
        session.log(f"Building {plugin_dir.name}...")
        with session.chdir(plugin_dir):
            session.run("npm", "install", external=True, silent=True)
            session.run("npm", "run", "build", external=True)


@nox.session
def docs(session):
    """Build the documentation as static HTML using MyST."""
    build(session)
    session.install("mystmd")
    session.run("myst", "build", "--html")


@nox.session(name="docs-live")
def docs_live(session):
    """Start a live development server for the documentation."""
    build(session)
    session.install("mystmd")
    session.run("myst", "start")


@nox.session(name="clean")
def clean(session):
    """Clean the documentation build artifacts."""
    session.install("mystmd")
    session.run("myst", "clean", "--all")


@nox.session
def release(session):
    """Create GitHub releases for plugins.

    See src/release.py for details. This just passes args and kwargs to that script.
    """
    build(session)
    session.run("python", "-m", "src.release", *session.posargs)
