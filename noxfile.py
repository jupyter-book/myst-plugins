import nox

nox.options.default_venv_backend = "uv|virtualenv"


@nox.session
def docs(session):
    """Build the documentation as static HTML using MyST."""
    session.install("mystmd")
    session.run("myst", "build", "--html")


@nox.session(name="docs-live")
def docs_live(session):
    """Start a live development server for the documentation."""
    session.install("mystmd")
    session.run("myst", "start")


@nox.session(name="clean")
def clean(session):
    """Clean the documentation build artifacts."""
    session.install("mystmd")
    session.run("myst", "clean", "--all")
