"""Tablet field data normalization for desktop report writing."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any, Iterable, Mapping

from .paths import app_root

PROJECT_ROOT = app_root()
DEFAULT_TABLET_DATA_PATH = PROJECT_ROOT / "data" / "tablet_submissions.json"
DEFAULT_TABLET_INBOX_PATH = PROJECT_ROOT / "data" / "inbox"


@dataclass(frozen=True)
class Location:
    address: str
    lat: float | None = None
    lon: float | None = None

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any] | None) -> "Location":
        raw = data or {}
        return cls(
            address=str(raw.get("address", "")).strip(),
            lat=_optional_float(raw.get("lat")),
            lon=_optional_float(raw.get("lon")),
        )


@dataclass(frozen=True)
class FieldEntry:
    entry_id: str
    section: str
    item: str
    status: str
    measured_value: str
    memo: str
    recommendation: str
    photo_ids: tuple[str, ...]

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any]) -> "FieldEntry":
        return cls(
            entry_id=_required_str(data, "entry_id"),
            section=_required_str(data, "section"),
            item=_required_str(data, "item"),
            status=_required_str(data, "status"),
            measured_value=str(data.get("measured_value", "")).strip(),
            memo=str(data.get("memo", "")).strip(),
            recommendation=str(data.get("recommendation", "")).strip(),
            photo_ids=tuple(str(item).strip() for item in data.get("photo_ids", ()) if str(item).strip()),
        )


@dataclass(frozen=True)
class TabletSubmission:
    submission_id: str
    project_name: str
    site_name: str
    submitted_at: str
    inspector: str
    device_id: str
    weather: str
    location: Location
    entries: tuple[FieldEntry, ...]

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any]) -> "TabletSubmission":
        entries = tuple(FieldEntry.from_mapping(entry) for entry in data.get("entries", ()))
        if not entries:
            raise ValueError(f"{data.get('submission_id', '<unknown>')} has no field entries")
        return cls(
            submission_id=_required_str(data, "submission_id"),
            project_name=_required_str(data, "project_name"),
            site_name=_required_str(data, "site_name"),
            submitted_at=_required_str(data, "submitted_at"),
            inspector=_required_str(data, "inspector"),
            device_id=_required_str(data, "device_id"),
            weather=str(data.get("weather", "")).strip(),
            location=Location.from_mapping(data.get("location")),
            entries=entries,
        )


@dataclass(frozen=True)
class ReportFinding:
    source_ref: str
    project_name: str
    site_name: str
    submitted_at: str
    inspector: str
    device_id: str
    section: str
    item: str
    status: str
    measured_value: str
    memo: str
    recommendation: str
    photo_ids: tuple[str, ...]

    @property
    def photo_text(self) -> str:
        return ", ".join(self.photo_ids) if self.photo_ids else "-"


@dataclass(frozen=True)
class ReportContext:
    project_name: str
    submissions: tuple[TabletSubmission, ...]
    findings: tuple[ReportFinding, ...]

    @property
    def site_names(self) -> tuple[str, ...]:
        return _unique(submission.site_name for submission in self.submissions)

    @property
    def inspectors(self) -> tuple[str, ...]:
        return _unique(submission.inspector for submission in self.submissions)

    @property
    def device_ids(self) -> tuple[str, ...]:
        return _unique(submission.device_id for submission in self.submissions)

    @property
    def submitted_range(self) -> str:
        submitted = sorted(submission.submitted_at for submission in self.submissions)
        if not submitted:
            return ""
        if submitted[0] == submitted[-1]:
            return submitted[0]
        return f"{submitted[0]} ~ {submitted[-1]}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "projectName": self.project_name,
            "submittedRange": self.submitted_range,
            "siteNames": list(self.site_names),
            "inspectors": list(self.inspectors),
            "deviceIds": list(self.device_ids),
            "findings": [
                {
                    "sourceRef": finding.source_ref,
                    "siteName": finding.site_name,
                    "section": finding.section,
                    "item": finding.item,
                    "status": finding.status,
                    "measuredValue": finding.measured_value,
                    "memo": finding.memo,
                    "recommendation": finding.recommendation,
                    "photoIds": list(finding.photo_ids),
                }
                for finding in self.findings
            ],
        }


def load_tablet_submissions(path: Path | None = None) -> tuple[TabletSubmission, ...]:
    source = path or DEFAULT_TABLET_INBOX_PATH
    if source.is_dir():
        json_paths = sorted(item for item in source.glob("*.json") if item.is_file())
        if not json_paths:
            return load_tablet_submissions(DEFAULT_TABLET_DATA_PATH)
        submissions: list[TabletSubmission] = []
        for json_path in json_paths:
            submissions.extend(_load_tablet_submission_file(json_path))
        return tuple(submissions)
    return tuple(_load_tablet_submission_file(source))


def _load_tablet_submission_file(path: Path) -> tuple[TabletSubmission, ...]:
    with path.open("r", encoding="utf-8") as data_file:
        raw = json.load(data_file)
    if isinstance(raw, dict):
        raw = [raw]
    if not isinstance(raw, list):
        raise ValueError("tablet submission payload must be a list or object")
    return tuple(TabletSubmission.from_mapping(item) for item in raw)


def build_report_context(submissions: Iterable[TabletSubmission]) -> ReportContext:
    submission_tuple = tuple(submissions)
    if not submission_tuple:
        raise ValueError("at least one tablet submission is required")

    project_names = _unique(submission.project_name for submission in submission_tuple)
    project_name = project_names[0] if len(project_names) == 1 else " / ".join(project_names)
    findings = tuple(_findings_from_submission(submission) for submission in submission_tuple)
    return ReportContext(project_name=project_name, submissions=submission_tuple, findings=_flatten(findings))


def _findings_from_submission(submission: TabletSubmission) -> tuple[ReportFinding, ...]:
    return tuple(
        ReportFinding(
            source_ref=f"{submission.submission_id}/{entry.entry_id}",
            project_name=submission.project_name,
            site_name=submission.site_name,
            submitted_at=submission.submitted_at,
            inspector=submission.inspector,
            device_id=submission.device_id,
            section=entry.section,
            item=entry.item,
            status=entry.status,
            measured_value=entry.measured_value,
            memo=entry.memo,
            recommendation=entry.recommendation,
            photo_ids=entry.photo_ids,
        )
        for entry in submission.entries
    )


def _required_str(data: Mapping[str, Any], field: str) -> str:
    value = str(data.get(field, "")).strip()
    if not value:
        raise ValueError(f"{field} is required")
    return value


def _optional_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    return float(value)


def _unique(values: Iterable[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return tuple(result)


def _flatten(groups: Iterable[Iterable[ReportFinding]]) -> tuple[ReportFinding, ...]:
    return tuple(item for group in groups for item in group)
