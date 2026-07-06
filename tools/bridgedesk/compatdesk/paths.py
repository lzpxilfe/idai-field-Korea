"""Runtime path helpers for source and packaged builds."""

from __future__ import annotations

from pathlib import Path
import os
import sys


def app_root() -> Path:
    if getattr(sys, "frozen", False):
        for candidate in _frozen_candidates():
            if (candidate / "config").exists() or (candidate / "data").exists():
                return candidate
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


def _frozen_candidates() -> tuple[Path, ...]:
    exe_dir = Path(sys.executable).resolve().parent
    candidates = [Path.cwd(), exe_dir]
    if exe_dir.parent.name.lower() == "dist":
        candidates.insert(1, exe_dir.parent.parent)
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        candidates.append(Path(meipass).resolve())
    return tuple(_unique_existing(candidates))


def _unique_existing(paths: list[Path]) -> list[Path]:
    seen: set[Path] = set()
    result: list[Path] = []
    for path in paths:
        resolved = Path(os.path.abspath(path))
        if resolved not in seen:
            seen.add(resolved)
            result.append(resolved)
    return result
