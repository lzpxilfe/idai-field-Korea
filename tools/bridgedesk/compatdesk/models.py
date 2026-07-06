"""Shared UI metadata for BridgeDesk."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class NavAction:
    action_id: str
    label: str


@dataclass(frozen=True)
class FieldMeta:
    label: str
    width: int
    min_width: int = 80
    stretch: bool = False


NAV_ACTIONS = (
    NavAction("home", "Home"),
    NavAction("queue", "Queue"),
    NavAction("review", "Review"),
    NavAction("settings", "Settings"),
)


TABLE_FIELDS = ("source_ref", "site_name", "section", "item", "status", "inspector", "submitted_at")
COMPACT_TABLE_FIELDS = ("source_ref", "site_name", "item", "status")
DETAIL_FIELDS = (
    "source_ref",
    "site_name",
    "section",
    "item",
    "status",
    "measured_value",
    "memo",
    "recommendation",
    "photo_text",
    "inspector",
    "device_id",
    "submitted_at",
)


FIELD_META = {
    "source_ref": FieldMeta("출처", width=160, min_width=130, stretch=True),
    "site_name": FieldMeta("조사 구역", width=160, min_width=120, stretch=True),
    "section": FieldMeta("구분", width=90),
    "item": FieldMeta("항목", width=150, min_width=110, stretch=True),
    "status": FieldMeta("상태", width=90),
    "inspector": FieldMeta("기록자", width=90),
    "submitted_at": FieldMeta("수신시간", width=190, min_width=160, stretch=True),
    "measured_value": FieldMeta("기준고/관찰값", width=180, min_width=130, stretch=True),
    "memo": FieldMeta("현장 기록", width=260, min_width=180, stretch=True),
    "recommendation": FieldMeta("보고서 반영 메모", width=260, min_width=180, stretch=True),
    "photo_text": FieldMeta("사진/도면/유물", width=140, min_width=100, stretch=True),
    "device_id": FieldMeta("단말", width=120),
}


def field_meta(field: str) -> FieldMeta:
    return FIELD_META.get(field, FieldMeta(field.replace("_", " ").title(), width=110))


def nav_action_ids() -> tuple[str, ...]:
    return tuple(action.action_id for action in NAV_ACTIONS)
