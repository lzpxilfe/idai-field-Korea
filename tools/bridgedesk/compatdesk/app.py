"""Tkinter application shell that consumes the shared layout policy."""

from __future__ import annotations

import tkinter as tk
from tkinter import ttk
from pathlib import Path

from .field_data import DEFAULT_TABLET_INBOX_PATH, ReportFinding, build_report_context, load_tablet_submissions
from .layout_policy import LayoutPolicy, LayoutProfile, NavigationPattern
from .models import DETAIL_FIELDS, NAV_ACTIONS, field_meta
from .report_export import (
    render_finding_clipboard_text,
    render_finding_table_row,
    render_findings_table_text,
    render_report_text,
)
from .theme import Theme, apply_theme


class BridgeDeskApp(tk.Tk):
    def __init__(self, policy: LayoutPolicy | None = None, tablet_data_path: Path = DEFAULT_TABLET_INBOX_PATH) -> None:
        super().__init__()
        self.policy = policy or LayoutPolicy()
        self.theme = Theme()
        self.report_context = build_report_context(load_tablet_submissions(tablet_data_path))
        self.findings = self.report_context.findings
        self.finding_by_id = {finding.source_ref: finding for finding in self.findings}
        self.selected_finding_id = tk.StringVar(value=self.findings[0].source_ref)
        self.active_action_id = tk.StringVar(value=NAV_ACTIONS[0].action_id)
        self.current_profile: LayoutProfile | None = None
        self.current_table_fields: tuple[str, ...] = ()

        window = self.policy.config.window
        self.title("BridgeDesk")
        self.geometry(f"{window.default_width}x{window.default_height}")
        self.minsize(window.min_width, window.min_height)
        configure_grid_weight(self, row=0, column=0)
        apply_theme(self, self.theme)

        self.shell = ttk.Frame(self, style="App.TFrame")
        self.shell.grid(row=0, column=0, sticky="nsew")

        self.nav = ttk.Frame(self.shell, style="Nav.TFrame")
        self.workspace = ttk.Frame(self.shell, style="App.TFrame")
        self.header = ttk.Frame(self.workspace, style="App.TFrame")
        self.metrics = ttk.Frame(self.workspace, style="App.TFrame")
        self.content = ttk.Frame(self.workspace, style="App.TFrame")
        self.report_panel = ttk.Frame(self.workspace, style="Surface.TFrame", padding=0)
        self.list_panel = ttk.Frame(self.content, style="Surface.TFrame", padding=0)
        self.detail_panel = ttk.Frame(self.content, style="Surface.TFrame", padding=0)
        self.status = ttk.Frame(self.workspace, style="App.TFrame")

        self.nav_buttons: list[ttk.Button] = []
        self.metrics_labels: list[ttk.Frame] = []
        self.detail_captions: dict[str, ttk.Label] = {}
        self.detail_labels: dict[str, ttk.Label] = {}
        self.list_title: ttk.Label
        self.detail_title: ttk.Label
        self.report_title: ttk.Label
        self.report_header: ttk.Frame
        self.report_text: tk.Text
        self.detail_header: ttk.Frame
        self.copy_title: ttk.Label
        self.copy_text: tk.Text
        self.clipboard_label: ttk.Label
        self.tree_scroll_x: ttk.Scrollbar
        self.tree = self._build_list_panel()
        self._build_header()
        self._build_metrics()
        self._build_report_panel()
        self._build_detail_panel()
        self._build_status()
        self._populate_tree()
        self._sync_detail()
        self._sync_report_preview()

        self.bind("<Configure>", self._handle_resize)
        self.after_idle(lambda: self._apply_profile(self.policy.profile_for(self.winfo_width(), self.winfo_height())))

    def _build_header(self) -> None:
        ttk.Label(self.header, text="BridgeDesk", style="Header.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(
            self.header,
            text="태블릿 발굴 기록을 HWP 보고서 초안으로 정리",
            style="Subtle.TLabel",
        ).grid(row=1, column=0, sticky="w", pady=(4, 0))
        ttk.Button(self.header, text="새로고침", style="Accent.TButton", command=self._sync_detail).grid(row=0, column=1, rowspan=2, sticky="e")
        configure_grid_weight(self.header, row=0, column=0)

    def _build_metrics(self) -> None:
        metric_data = (
            ("태블릿 원본", f"{len(self.report_context.submissions)}건"),
            ("기록 항목", f"{len(self.report_context.findings)}건"),
            ("HWP 초안", "준비됨"),
        )
        for index, (label, value) in enumerate(metric_data):
            frame = ttk.Frame(self.metrics, style="Surface.TFrame", padding=(14, 12))
            ttk.Label(frame, text=value, style="Metric.TLabel").grid(row=0, column=0, sticky="w")
            ttk.Label(frame, text=label, style="Muted.Surface.TLabel").grid(row=1, column=0, sticky="w", pady=(4, 0))
            self.metrics_labels.append(frame)
            frame.grid(row=0, column=index, sticky="nsew")
            self.metrics.grid_columnconfigure(index, weight=1, uniform="metrics")

    def _build_report_panel(self) -> None:
        self.report_header = ttk.Frame(self.report_panel, style="Surface.TFrame")
        self.report_header.grid(row=0, column=0, sticky="ew")
        self.report_title = ttk.Label(self.report_header, text="HWP 보고서 초안", style="Surface.TLabel")
        self.report_title.grid(row=0, column=0, sticky="w")
        ttk.Button(self.report_header, text="초안 복사", command=self._copy_report).grid(row=0, column=1, sticky="e", padx=(8, 0))
        ttk.Button(self.report_header, text="표 복사", command=self._copy_all_table).grid(row=0, column=2, sticky="e", padx=(8, 0))
        self.report_header.grid_columnconfigure(0, weight=1)
        self.report_text = tk.Text(
            self.report_panel,
            height=7,
            wrap="word",
            borderwidth=0,
            highlightthickness=1,
            relief="flat",
            font=("Malgun Gothic", 10),
            foreground=self.theme.text,
            background=self.theme.surface,
            highlightbackground=self.theme.border,
        )
        self.report_text.grid(row=1, column=0, sticky="nsew")
        configure_grid_weight(self.report_panel, row=1, column=0)

    def _build_list_panel(self) -> ttk.Treeview:
        self.list_title = ttk.Label(self.list_panel, text="발굴 현장 기록", style="Surface.TLabel")
        self.list_title.grid(row=0, column=0, sticky="w")
        tree = ttk.Treeview(self.list_panel, show="headings", selectmode="browse", height=6)
        self.tree_scroll_x = ttk.Scrollbar(self.list_panel, orient="horizontal", command=tree.xview)
        tree.configure(xscrollcommand=self.tree_scroll_x.set)
        tree.grid(row=1, column=0, sticky="nsew")
        self.tree_scroll_x.grid(row=2, column=0, sticky="ew")
        tree.bind("<<TreeviewSelect>>", self._handle_tree_select)
        configure_grid_weight(self.list_panel, row=1, column=0)
        return tree

    def _build_detail_panel(self) -> None:
        self.detail_header = ttk.Frame(self.detail_panel, style="Surface.TFrame")
        self.detail_header.grid(row=0, column=0, columnspan=2, sticky="ew")
        self.detail_title = ttk.Label(self.detail_header, text="선택 기록", style="Surface.TLabel")
        self.detail_title.grid(row=0, column=0, sticky="w")
        ttk.Button(self.detail_header, text="기록 복사", command=self._copy_selected_finding).grid(row=0, column=1, sticky="e", padx=(8, 0))
        ttk.Button(self.detail_header, text="표 행 복사", command=self._copy_selected_table_row).grid(row=0, column=2, sticky="e", padx=(8, 0))
        self.detail_header.grid_columnconfigure(0, weight=1)
        for index, field in enumerate(DETAIL_FIELDS, start=1):
            caption = ttk.Label(self.detail_panel, text=field_meta(field).label, style="Muted.Surface.TLabel")
            value = ttk.Label(self.detail_panel, text="", style="Surface.TLabel", wraplength=320)
            caption.grid(row=index, column=0, sticky="nw")
            value.grid(row=index, column=1, sticky="nw")
            self.detail_captions[field] = caption
            self.detail_labels[field] = value
        self.copy_title = ttk.Label(self.detail_panel, text="HWP 붙여넣기 미리보기", style="Muted.Surface.TLabel")
        self.copy_text = tk.Text(
            self.detail_panel,
            height=7,
            wrap="word",
            borderwidth=0,
            highlightthickness=1,
            relief="flat",
            font=("Malgun Gothic", 9),
            foreground=self.theme.text,
            background=self.theme.surface,
            highlightbackground=self.theme.border,
        )
        self.detail_panel.grid_columnconfigure(1, weight=1)

    def _build_status(self) -> None:
        self.profile_label = ttk.Label(self.status, text="", style="Subtle.TLabel")
        self.profile_label.grid(row=0, column=0, sticky="w")
        self.clipboard_label = ttk.Label(self.status, text="복사 대기", style="Subtle.TLabel")
        self.clipboard_label.grid(row=0, column=1, sticky="e")
        self.status.grid_columnconfigure(0, weight=1)

    def _handle_resize(self, event: tk.Event[object]) -> None:
        if event.widget is not self:
            return
        self._apply_profile(self.policy.profile_for(event.width, event.height))

    def _handle_tree_select(self, _event: tk.Event[object]) -> None:
        selected = self.tree.selection()
        if selected:
            self.selected_finding_id.set(selected[0])
            self._sync_detail()

    def _select_action(self, action_id: str) -> None:
        self.active_action_id.set(action_id)
        if self.current_profile:
            self._update_status(self.current_profile)

    def _apply_profile(self, profile: LayoutProfile) -> None:
        if self.current_profile == profile:
            return
        self.current_profile = profile
        self._layout_shell(profile)
        self._layout_workspace(profile)
        self._layout_content(profile)
        self._layout_navigation(profile)
        self._layout_detail(profile)
        self._layout_panels(profile)
        self._configure_table(profile)
        self._sync_detail()
        self._update_status(profile)

    def _layout_shell(self, profile: LayoutProfile) -> None:
        forget_grid(self.nav, self.workspace)
        reset_grid(self.shell)
        if profile.navigation == NavigationPattern.TOP:
            self.nav.grid(row=0, column=0, sticky="ew")
            self.workspace.grid(row=1, column=0, sticky="nsew")
            self.shell.grid_rowconfigure(0, minsize=profile.navigation_size, weight=0)
            configure_grid_weight(self.shell, row=1, column=0)
        else:
            self.nav.grid(row=0, column=0, sticky="nsew")
            self.workspace.grid(row=0, column=1, sticky="nsew")
            self.shell.grid_columnconfigure(0, minsize=profile.navigation_size, weight=0)
            configure_grid_weight(self.shell, row=0, column=1)

    def _layout_workspace(self, profile: LayoutProfile) -> None:
        forget_grid(self.header, self.metrics, self.report_panel, self.content, self.status)
        reset_grid(self.workspace)
        pad = profile.padding
        self.header.grid(row=0, column=0, sticky="ew", padx=pad, pady=(pad, profile.gap // 2))
        self.metrics.grid(row=1, column=0, sticky="ew", padx=pad, pady=(0, profile.gap))
        self.report_panel.grid(row=2, column=0, sticky="nsew", padx=pad, pady=(0, profile.gap))
        self.content.grid(row=3, column=0, sticky="nsew", padx=pad, pady=(0, profile.gap))
        self.status.grid(row=4, column=0, sticky="ew", padx=pad, pady=(0, pad))
        configure_grid_weight(self.workspace, row=3, column=0)

    def _layout_content(self, profile: LayoutProfile) -> None:
        forget_grid(self.list_panel, self.detail_panel)
        reset_grid(self.content)
        if profile.content_columns == 1:
            self.list_panel.grid(row=0, column=0, sticky="nsew", pady=(0, profile.gap))
            self.detail_panel.grid(row=1, column=0, sticky="nsew")
            self.content.grid_rowconfigure(0, weight=3)
            self.content.grid_rowconfigure(1, weight=2)
            self.content.grid_columnconfigure(0, weight=1)
            return

        self.list_panel.grid(row=0, column=0, sticky="nsew", padx=(0, profile.gap // 2))
        self.detail_panel.grid(row=0, column=1, sticky="nsew", padx=(profile.gap // 2, 0))
        self.content.grid_columnconfigure(0, weight=3)
        self.content.grid_columnconfigure(1, weight=2)
        self.content.grid_rowconfigure(0, weight=1)

    def _layout_navigation(self, profile: LayoutProfile) -> None:
        for button in self.nav_buttons:
            button.destroy()
        self.nav_buttons.clear()
        reset_grid(self.nav)
        orient_horizontal = profile.navigation == NavigationPattern.TOP
        button_width = max(len(action.label) for action in NAV_ACTIONS)

        for index, action in enumerate(NAV_ACTIONS):
            button = ttk.Button(
                self.nav,
                text=action.label,
                style="Nav.TButton",
                width=button_width,
                command=lambda action_id=action.action_id: self._select_action(action_id),
            )
            row = 0 if orient_horizontal else index
            column = index if orient_horizontal else 0
            button.grid(
                row=row,
                column=column,
                sticky="ew",
                padx=profile.gap // 2,
                pady=profile.gap // 2,
                ipady=max(2, profile.touch_target // 8),
            )
            self.nav_buttons.append(button)

        if orient_horizontal:
            for index in range(len(NAV_ACTIONS)):
                self.nav.grid_columnconfigure(index, weight=1)
        else:
            self.nav.grid_columnconfigure(0, weight=1)

    def _layout_panels(self, profile: LayoutProfile) -> None:
        inset = profile.padding
        self.report_header.grid_configure(padx=inset, pady=(inset, profile.gap // 2))
        self.report_text.grid_configure(padx=inset, pady=(0, inset))
        self.list_title.grid_configure(padx=inset, pady=(inset, profile.gap // 2))
        self.tree.grid_configure(padx=inset, pady=(0, inset))
        self.tree_scroll_x.grid_configure(padx=inset, pady=(0, inset))
        self.detail_header.grid_configure(padx=inset, pady=(inset, profile.gap // 2))
        ttk.Style(self).configure("Treeview", rowheight=profile.touch_target)

    def _layout_detail(self, profile: LayoutProfile) -> None:
        fields = list(self.detail_labels.items())
        inset = profile.padding
        if profile.form_columns == 1:
            for index, (field, label) in enumerate(fields, start=1):
                caption = self.detail_captions[field]
                caption.grid(row=index * 2 - 1, column=0, sticky="nw", padx=inset, pady=(profile.gap // 2, 0))
                label.grid(row=index * 2, column=0, sticky="new", padx=inset, pady=(2, profile.gap // 3))
                label.configure(wraplength=max(260, profile.width - profile.navigation_size - 80))
            copy_row = len(fields) * 2 + 1
            self.copy_title.grid(row=copy_row, column=0, sticky="w", padx=inset, pady=(profile.gap, 2))
            self.copy_text.grid(row=copy_row + 1, column=0, sticky="nsew", padx=inset, pady=(0, inset))
            self.detail_panel.grid_columnconfigure(0, weight=1)
            self.detail_panel.grid_columnconfigure(1, weight=0)
            return

        for index, (field, label) in enumerate(fields, start=1):
            caption = self.detail_captions[field]
            caption.grid(row=index, column=0, sticky="nw", padx=inset, pady=(profile.gap // 3, 0))
            label.grid(row=index, column=1, sticky="new", padx=inset, pady=(profile.gap // 3, 0))
            label.configure(wraplength=360)
        copy_row = len(fields) + 1
        self.copy_title.grid(row=copy_row, column=0, columnspan=2, sticky="w", padx=inset, pady=(profile.gap, 2))
        self.copy_text.grid(row=copy_row + 1, column=0, columnspan=2, sticky="nsew", padx=inset, pady=(0, inset))
        self.detail_panel.grid_columnconfigure(0, weight=0)
        self.detail_panel.grid_columnconfigure(1, weight=1)

    def _configure_table(self, profile: LayoutProfile) -> None:
        if self.current_table_fields == profile.visible_table_fields:
            return
        self.current_table_fields = profile.visible_table_fields
        columns = profile.visible_table_fields
        self.tree.configure(columns=columns)
        for column in columns:
            meta = field_meta(column)
            anchor = "w"
            self.tree.heading(column, text=meta.label, anchor=anchor)
            self.tree.column(column, anchor=anchor, stretch=meta.stretch, width=meta.width, minwidth=meta.min_width)
        self._populate_tree()

    def _populate_tree(self) -> None:
        for item_id in self.tree.get_children():
            self.tree.delete(item_id)
        columns = self.tree.cget("columns")
        if not columns:
            return
        for finding in self.findings:
            values = [_finding_value(finding, field) for field in columns]
            self.tree.insert("", "end", iid=finding.source_ref, values=values)
        self.tree.selection_set(self.selected_finding_id.get())

    def _sync_detail(self) -> None:
        finding = self.finding_by_id[self.selected_finding_id.get()]
        for field, label in self.detail_labels.items():
            label.configure(text=_finding_value(finding, field))
        self.copy_text.configure(state="normal")
        self.copy_text.delete("1.0", "end")
        self.copy_text.insert("1.0", render_finding_clipboard_text(finding, self._selected_finding_index() + 1))
        self.copy_text.configure(state="disabled")

    def _sync_report_preview(self) -> None:
        self.report_text.configure(state="normal")
        self.report_text.delete("1.0", "end")
        self.report_text.insert("1.0", render_report_text(self.report_context))
        self.report_text.configure(state="disabled")

    def _update_status(self, profile: LayoutProfile) -> None:
        self.profile_label.configure(
            text=(
                f"{profile.mode.value} | {profile.navigation.value} | {profile.detail.value} | "
                f"{profile.width}x{profile.height} | action:{self.active_action_id.get()}"
            )
        )

    def _copy_report(self) -> None:
        self._copy_to_clipboard(render_report_text(self.report_context), "전체 초안을 복사했습니다")

    def _copy_all_table(self) -> None:
        self._copy_to_clipboard(render_findings_table_text(self.report_context), "전체 표를 복사했습니다")

    def _copy_selected_finding(self) -> None:
        finding = self.finding_by_id[self.selected_finding_id.get()]
        self._copy_to_clipboard(render_finding_clipboard_text(finding, self._selected_finding_index() + 1), "선택 기록을 복사했습니다")

    def _copy_selected_table_row(self) -> None:
        finding = self.finding_by_id[self.selected_finding_id.get()]
        self._copy_to_clipboard(render_finding_table_row(finding), "선택 표 행을 복사했습니다")

    def _copy_to_clipboard(self, text: str, message: str) -> None:
        self.clipboard_clear()
        self.clipboard_append(text)
        self.update()
        self.clipboard_label.configure(text=message)

    def _selected_finding_index(self) -> int:
        selected_id = self.selected_finding_id.get()
        for index, finding in enumerate(self.findings):
            if finding.source_ref == selected_id:
                return index
        return 0


def configure_grid_weight(widget: tk.Misc, row: int, column: int) -> None:
    widget.grid_rowconfigure(row, weight=1)
    widget.grid_columnconfigure(column, weight=1)


def forget_grid(*widgets: tk.Widget) -> None:
    for widget in widgets:
        widget.grid_forget()


def reset_grid(widget: tk.Misc) -> None:
    for index in range(8):
        widget.grid_rowconfigure(index, weight=0, minsize=0)
        widget.grid_columnconfigure(index, weight=0, minsize=0)


def _finding_value(finding: ReportFinding, field: str) -> str:
    value = getattr(finding, field)
    return str(value)
