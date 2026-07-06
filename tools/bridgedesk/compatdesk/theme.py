"""Visual tokens for the BridgeDesk desktop UI."""

from __future__ import annotations

from dataclasses import dataclass
from tkinter import ttk


@dataclass(frozen=True)
class Theme:
    background: str = "#f6f7f2"
    surface: str = "#ffffff"
    surface_alt: str = "#edf2f7"
    border: str = "#cbd5e1"
    text: str = "#172033"
    muted: str = "#5d6b82"
    accent: str = "#256f9c"
    accent_alt: str = "#2f8f6b"
    warning: str = "#a96d1f"


def apply_theme(root: object, theme: Theme = Theme()) -> None:
    style = ttk.Style(root)
    try:
        style.theme_use("clam")
    except Exception:
        pass

    style.configure(".", font=("Segoe UI", 10), foreground=theme.text)
    style.configure("App.TFrame", background=theme.background)
    style.configure("Surface.TFrame", background=theme.surface)
    style.configure("Nav.TFrame", background=theme.text)
    style.configure("Header.TLabel", background=theme.background, foreground=theme.text, font=("Segoe UI", 18, "bold"))
    style.configure("Subtle.TLabel", background=theme.background, foreground=theme.muted)
    style.configure("Surface.TLabel", background=theme.surface, foreground=theme.text)
    style.configure("Muted.Surface.TLabel", background=theme.surface, foreground=theme.muted)
    style.configure("Metric.TLabel", background=theme.surface, foreground=theme.text, font=("Segoe UI", 16, "bold"))
    style.configure("Nav.TButton", background=theme.text, foreground=theme.surface, borderwidth=0, focusthickness=0)
    style.map("Nav.TButton", background=[("active", theme.accent)])
    style.configure("Accent.TButton", background=theme.accent, foreground=theme.surface)
    style.map("Accent.TButton", background=[("active", theme.accent_alt)])
    style.configure("Treeview", background=theme.surface, fieldbackground=theme.surface, foreground=theme.text, rowheight=30)
    style.configure("Treeview.Heading", background=theme.surface_alt, foreground=theme.text, font=("Segoe UI", 9, "bold"))
    style.map("Treeview", background=[("selected", theme.accent)], foreground=[("selected", theme.surface)])
