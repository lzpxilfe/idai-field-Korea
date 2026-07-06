"""Responsive layout policy shared by tablet and desktop UI surfaces."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
import json
from pathlib import Path
from typing import Any, Mapping

from .models import COMPACT_TABLE_FIELDS, TABLE_FIELDS


class LayoutMode(StrEnum):
    COMPACT = "compact"
    TABLET = "tablet"
    DESKTOP = "desktop"
    WIDE = "wide"


class NavigationPattern(StrEnum):
    TOP = "top"
    RAIL = "rail"
    SIDEBAR = "sidebar"


class DetailPattern(StrEnum):
    STACKED = "stacked"
    SPLIT = "split"


@dataclass(frozen=True)
class Breakpoints:
    tablet: int = 720
    desktop: int = 1100
    wide: int = 1440

    def validate(self) -> None:
        if not 0 < self.tablet < self.desktop < self.wide:
            raise ValueError("breakpoints must satisfy 0 < tablet < desktop < wide")


@dataclass(frozen=True)
class SpacingScale:
    compact: int = 12
    tablet: int = 16
    desktop: int = 20
    wide: int = 24

    def for_mode(self, mode: LayoutMode) -> int:
        return int(getattr(self, mode.value))


@dataclass(frozen=True)
class NavigationScale:
    top_height: int = 56
    tablet_rail_width: int = 104
    desktop_sidebar_width: int = 236


@dataclass(frozen=True)
class WindowScale:
    default_width: int = 1180
    default_height: int = 760
    min_width: int = 600
    min_height: int = 520

    def validate(self) -> None:
        if min(self.default_width, self.default_height, self.min_width, self.min_height) <= 0:
            raise ValueError("window dimensions must be positive")
        if self.default_width < self.min_width or self.default_height < self.min_height:
            raise ValueError("default window size must be greater than or equal to minimum size")


@dataclass(frozen=True)
class LayoutConfig:
    breakpoints: Breakpoints = Breakpoints()
    spacing: SpacingScale = SpacingScale()
    navigation: NavigationScale = NavigationScale()
    window: WindowScale = WindowScale()
    content_columns: Mapping[LayoutMode, int] = field(default_factory=lambda: {
        LayoutMode.COMPACT: 1,
        LayoutMode.TABLET: 1,
        LayoutMode.DESKTOP: 2,
        LayoutMode.WIDE: 2,
    })
    form_columns: Mapping[LayoutMode, int] = field(default_factory=lambda: {
        LayoutMode.COMPACT: 1,
        LayoutMode.TABLET: 1,
        LayoutMode.DESKTOP: 2,
        LayoutMode.WIDE: 2,
    })
    table_fields: Mapping[LayoutMode, tuple[str, ...]] = field(default_factory=lambda: {
        LayoutMode.COMPACT: COMPACT_TABLE_FIELDS,
        LayoutMode.TABLET: TABLE_FIELDS,
        LayoutMode.DESKTOP: TABLE_FIELDS,
        LayoutMode.WIDE: TABLE_FIELDS,
    })

    def __post_init__(self) -> None:
        self.breakpoints.validate()
        self.window.validate()
        _validate_mode_map(self.content_columns, "contentColumns")
        _validate_mode_map(self.form_columns, "formColumns")
        _validate_mode_map(self.table_fields, "tableFields")
        _validate_tablet_desktop_parity(self.table_fields)

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any]) -> "LayoutConfig":
        defaults = cls()
        breakpoints = Breakpoints(**_camel_to_snake_keys(data.get("breakpoints", {})))
        spacing = SpacingScale(**_camel_to_snake_keys(data.get("spacing", {})))
        navigation = NavigationScale(**_camel_to_snake_keys(data.get("navigation", {})))
        window = WindowScale(**_camel_to_snake_keys(data.get("window", {})))

        return cls(
            breakpoints=breakpoints,
            spacing=spacing,
            navigation=navigation,
            window=window,
            content_columns={**defaults.content_columns, **_mode_int_map(data.get("contentColumns", {}))},
            form_columns={**defaults.form_columns, **_mode_int_map(data.get("formColumns", {}))},
            table_fields={**defaults.table_fields, **_mode_tuple_map(data.get("tableFields", {}))},
        )

    @classmethod
    def from_file(cls, path: Path) -> "LayoutConfig":
        if not path.exists():
            return cls()
        with path.open("r", encoding="utf-8") as config_file:
            return cls.from_mapping(json.load(config_file))

    def content_columns_for(self, mode: LayoutMode) -> int:
        return _resolve_mode_value(self.content_columns, mode, default=1)

    def form_columns_for(self, mode: LayoutMode) -> int:
        return _resolve_mode_value(self.form_columns, mode, default=1)

    def table_fields_for(self, mode: LayoutMode) -> tuple[str, ...]:
        defaults = TABLE_FIELDS
        return _resolve_mode_value(self.table_fields, mode, default=defaults)


@dataclass(frozen=True)
class LayoutProfile:
    mode: LayoutMode
    navigation: NavigationPattern
    detail: DetailPattern
    width: int
    height: int
    gap: int
    padding: int
    navigation_size: int
    content_columns: int
    form_columns: int
    visible_table_fields: tuple[str, ...]
    touch_target: int

    @property
    def is_desktop_like(self) -> bool:
        return self.mode in {LayoutMode.DESKTOP, LayoutMode.WIDE}

    def to_dict(self) -> dict[str, Any]:
        return {
            "mode": self.mode.value,
            "navigation": self.navigation.value,
            "detail": self.detail.value,
            "width": self.width,
            "height": self.height,
            "gap": self.gap,
            "padding": self.padding,
            "navigationSize": self.navigation_size,
            "contentColumns": self.content_columns,
            "formColumns": self.form_columns,
            "visibleTableFields": list(self.visible_table_fields),
            "touchTarget": self.touch_target,
        }


class LayoutPolicy:
    """Converts window size into a data-only profile consumed by the UI."""

    def __init__(self, config: LayoutConfig | None = None) -> None:
        self.config = config or LayoutConfig()

    @classmethod
    def from_file(cls, path: Path) -> "LayoutPolicy":
        return cls(LayoutConfig.from_file(path))

    def profile_for(self, width: int, height: int) -> LayoutProfile:
        normalized_width = max(1, int(width))
        normalized_height = max(1, int(height))
        mode = self._mode_for(normalized_width)
        navigation = self._navigation_for(mode)
        detail = DetailPattern.SPLIT if mode in {LayoutMode.DESKTOP, LayoutMode.WIDE} else DetailPattern.STACKED
        gap = self.config.spacing.for_mode(mode)

        return LayoutProfile(
            mode=mode,
            navigation=navigation,
            detail=detail,
            width=normalized_width,
            height=normalized_height,
            gap=gap,
            padding=gap,
            navigation_size=self._navigation_size_for(navigation),
            content_columns=self.config.content_columns_for(mode),
            form_columns=self.config.form_columns_for(mode),
            visible_table_fields=self.config.table_fields_for(mode),
            touch_target=44 if mode in {LayoutMode.COMPACT, LayoutMode.TABLET} else 36,
        )

    def _mode_for(self, width: int) -> LayoutMode:
        breakpoints = self.config.breakpoints
        if width < breakpoints.tablet:
            return LayoutMode.COMPACT
        if width < breakpoints.desktop:
            return LayoutMode.TABLET
        if width < breakpoints.wide:
            return LayoutMode.DESKTOP
        return LayoutMode.WIDE

    def _navigation_for(self, mode: LayoutMode) -> NavigationPattern:
        if mode == LayoutMode.COMPACT:
            return NavigationPattern.TOP
        if mode == LayoutMode.TABLET:
            return NavigationPattern.RAIL
        return NavigationPattern.SIDEBAR

    def _navigation_size_for(self, navigation: NavigationPattern) -> int:
        scale = self.config.navigation
        if navigation == NavigationPattern.TOP:
            return scale.top_height
        if navigation == NavigationPattern.RAIL:
            return scale.tablet_rail_width
        return scale.desktop_sidebar_width


def _camel_to_snake_keys(data: Mapping[str, Any]) -> dict[str, Any]:
    translations = {
        "topHeight": "top_height",
        "tabletRailWidth": "tablet_rail_width",
        "desktopSidebarWidth": "desktop_sidebar_width",
        "defaultWidth": "default_width",
        "defaultHeight": "default_height",
        "minWidth": "min_width",
        "minHeight": "min_height",
    }
    return {translations.get(key, key): value for key, value in data.items()}


def _mode_int_map(raw: Mapping[str, Any]) -> dict[LayoutMode, int]:
    return {LayoutMode(key): int(value) for key, value in raw.items()}


def _mode_tuple_map(raw: Mapping[str, Any]) -> dict[LayoutMode, tuple[str, ...]]:
    return {LayoutMode(key): tuple(str(item) for item in value) for key, value in raw.items()}


def _validate_mode_map(raw: Mapping[LayoutMode, Any], name: str) -> None:
    invalid_modes = set(raw).difference(LayoutMode)
    if invalid_modes:
        raise ValueError(f"{name} has invalid modes: {sorted(invalid_modes)}")


def _validate_tablet_desktop_parity(table_fields: Mapping[LayoutMode, tuple[str, ...]]) -> None:
    tablet_fields = set(table_fields.get(LayoutMode.TABLET, ()))
    desktop_fields = set(table_fields.get(LayoutMode.DESKTOP, ()))
    missing = tuple(field for field in table_fields.get(LayoutMode.DESKTOP, ()) if field not in tablet_fields)
    if desktop_fields and not desktop_fields.issubset(tablet_fields):
        raise ValueError(
            "tablet tableFields must include every desktop table field; "
            f"missing on tablet: {', '.join(missing)}"
        )


def _resolve_mode_value(
    values: Mapping[LayoutMode, Any] | None,
    mode: LayoutMode,
    default: Any,
) -> Any:
    if not values:
        return default
    return values.get(mode, default)
