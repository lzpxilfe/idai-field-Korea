"""Create a user-facing release zip with launchers and optional exe build."""

from __future__ import annotations

from pathlib import Path
import zipfile


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "dist" / "BridgeDesk-user-package.zip"

INCLUDE_FILES = (
    ".gitignore",
    "README.md",
    "pyproject.toml",
    "START_DESKTOP.cmd",
    "START_TABLET_SERVER.cmd",
    "EXPORT_HWP_REPORT.cmd",
    "INSTALL_DESKTOP_SHORTCUTS.cmd",
    "BUILD_DESKTOP_EXE.cmd",
    "BUILD_USER_PACKAGE.cmd",
)

INCLUDE_DIRS = (
    "assets",
    "compatdesk",
    "config",
    "data",
    "docs",
    "installers",
    "tablet",
    "tests",
    "tools",
)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as package:
        for relative in INCLUDE_FILES:
            add_file(package, ROOT / relative)
        for relative in INCLUDE_DIRS:
            add_tree(package, ROOT / relative)
        for exe_dir in (ROOT / "dist" / "BridgeDesk", ROOT / "dist" / "BridgeDeskTabletServer"):
            if exe_dir.exists():
                add_tree(package, exe_dir)

    print(f"User package created: {OUTPUT}")


def add_tree(package: zipfile.ZipFile, directory: Path) -> None:
    if not directory.exists():
        return
    for path in directory.rglob("*"):
        if path.is_file() and should_include(path):
            add_file(package, path)


def add_file(package: zipfile.ZipFile, path: Path) -> None:
    if path.exists() and should_include(path):
        package.write(path, path.relative_to(ROOT))


def should_include(path: Path) -> bool:
    parts = set(path.parts)
    if "__pycache__" in parts or ".git" in parts:
        return False
    if path.suffix in {".pyc", ".pyo"}:
        return False
    if path == OUTPUT:
        return False
    return True


if __name__ == "__main__":
    main()
