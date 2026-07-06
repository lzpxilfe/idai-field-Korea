"""Compatibility contracts for tablet and desktop surfaces."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .layout_policy import LayoutPolicy, LayoutProfile
from .models import DETAIL_FIELDS, nav_action_ids


@dataclass(frozen=True)
class SurfaceContract:
    mode: str
    navigation: str
    detail_pattern: str
    action_ids: tuple[str, ...]
    table_fields: tuple[str, ...]
    detail_fields: tuple[str, ...]

    @classmethod
    def from_profile(cls, profile: LayoutProfile) -> "SurfaceContract":
        return cls(
            mode=profile.mode.value,
            navigation=profile.navigation.value,
            detail_pattern=profile.detail.value,
            action_ids=nav_action_ids(),
            table_fields=profile.visible_table_fields,
            detail_fields=DETAIL_FIELDS,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "navigation": self.navigation,
            "detailPattern": self.detail_pattern,
            "actionIds": list(self.action_ids),
            "tableFields": list(self.table_fields),
            "detailFields": list(self.detail_fields),
        }


@dataclass(frozen=True)
class CompatibilityReport:
    tablet: SurfaceContract
    desktop: SurfaceContract
    missing_actions_on_tablet: tuple[str, ...]
    missing_table_fields_on_tablet: tuple[str, ...]
    missing_detail_fields_on_tablet: tuple[str, ...]

    @property
    def is_compatible(self) -> bool:
        return not (
            self.missing_actions_on_tablet
            or self.missing_table_fields_on_tablet
            or self.missing_detail_fields_on_tablet
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "compatible": self.is_compatible,
            "tablet": self.tablet.to_dict(),
            "desktop": self.desktop.to_dict(),
            "missingActionsOnTablet": list(self.missing_actions_on_tablet),
            "missingTableFieldsOnTablet": list(self.missing_table_fields_on_tablet),
            "missingDetailFieldsOnTablet": list(self.missing_detail_fields_on_tablet),
        }


def compare_tablet_desktop(
    policy: LayoutPolicy,
    tablet_size: tuple[int, int] = (820, 720),
    desktop_size: tuple[int, int] = (1280, 800),
) -> CompatibilityReport:
    tablet = SurfaceContract.from_profile(policy.profile_for(*tablet_size))
    desktop = SurfaceContract.from_profile(policy.profile_for(*desktop_size))

    return CompatibilityReport(
        tablet=tablet,
        desktop=desktop,
        missing_actions_on_tablet=_missing(desktop.action_ids, tablet.action_ids),
        missing_table_fields_on_tablet=_missing(desktop.table_fields, tablet.table_fields),
        missing_detail_fields_on_tablet=_missing(desktop.detail_fields, tablet.detail_fields),
    )


def _missing(required: tuple[str, ...], available: tuple[str, ...]) -> tuple[str, ...]:
    available_set = set(available)
    return tuple(item for item in required if item not in available_set)
