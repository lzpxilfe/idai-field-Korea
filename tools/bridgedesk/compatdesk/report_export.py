"""HWP-friendly report draft rendering and export."""

from __future__ import annotations

import csv
from html import escape
import json
from pathlib import Path

from .field_data import ReportContext, ReportFinding


def render_report_text(context: ReportContext) -> str:
    lines = [
        f"{context.project_name} 현장기록 보고서 초안",
        "",
        "1. 조사 개요",
        f"- 태블릿 기록 수신 범위: {context.submitted_range}",
        f"- 조사 구역: {', '.join(context.site_names)}",
        f"- 현장 기록자: {', '.join(context.inspectors)}",
        f"- 기록 단말: {', '.join(context.device_ids)}",
        f"- 기록 항목 수: {len(context.findings)}건",
        "",
        "2. 주요 기록 사항",
    ]

    for index, finding in enumerate(context.findings, start=1):
        lines.extend(_finding_text(index, finding))

    lines.extend(
        [
            "",
            "3. 보고서 작성 메모",
            "- 아래 문장은 HWP 본문에 붙여넣은 뒤 기관 양식의 문체에 맞게 다듬는다.",
            "- 사진/도면/유물 번호는 현장 원본과 대조하여 캡션, 도면 목록, 유물대장에 연결한다.",
            "- 출처 번호는 검수 중 원본 입력을 추적하기 위한 값이며 최종 보고서에서는 삭제할 수 있다.",
        ]
    )
    return "\n".join(lines).strip() + "\n"


def render_report_html(context: ReportContext) -> str:
    rows = "\n".join(_finding_row(finding) for finding in context.findings)
    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>{escape(context.project_name)} 현장기록 보고서 초안</title>
  <style>
    body {{ font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; line-height: 1.6; }}
    h1 {{ font-size: 20pt; }}
    h2 {{ font-size: 14pt; margin-top: 24px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 12px; }}
    th, td {{ border: 1px solid #777; padding: 6px 8px; vertical-align: top; }}
    th {{ background: #f1f5f9; }}
  </style>
</head>
<body>
  <h1>{escape(context.project_name)} 현장기록 보고서 초안</h1>
  <h2>1. 조사 개요</h2>
  <ul>
    <li>태블릿 기록 수신 범위: {escape(context.submitted_range)}</li>
    <li>조사 구역: {escape(", ".join(context.site_names))}</li>
    <li>현장 기록자: {escape(", ".join(context.inspectors))}</li>
    <li>기록 단말: {escape(", ".join(context.device_ids))}</li>
    <li>기록 항목 수: {len(context.findings)}건</li>
  </ul>
  <h2>2. 주요 기록 사항</h2>
  <table>
    <thead>
      <tr>
        <th>출처</th>
        <th>위치</th>
        <th>구분</th>
        <th>항목</th>
        <th>상태</th>
        <th>현장 메모</th>
        <th>보고서 반영 메모</th>
        <th>사진/도면/유물</th>
      </tr>
    </thead>
    <tbody>
{rows}
    </tbody>
  </table>
  <h2>3. 보고서 작성 메모</h2>
  <p>발굴 현장 태블릿 기록을 HWP 본문과 표로 옮기기 위한 초안입니다. 기관 양식에 맞게 문체, 층위/유구 번호, 사진/도면 캡션을 정리하세요.</p>
</body>
</html>
"""


def write_report_package(context: ReportContext, output_dir: Path) -> tuple[Path, ...]:
    output_dir.mkdir(parents=True, exist_ok=True)
    text_path = output_dir / "hwp_report_draft.txt"
    html_path = output_dir / "hwp_report_draft.html"
    csv_path = output_dir / "field_findings.csv"
    json_path = output_dir / "normalized_tablet_payload.json"

    text_path.write_text(render_report_text(context), encoding="utf-8")
    html_path.write_text(render_report_html(context), encoding="utf-8")
    json_path.write_text(json.dumps(context.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
    _write_findings_csv(context, csv_path)

    return text_path, html_path, csv_path, json_path


def _finding_text(index: int, finding: ReportFinding) -> list[str]:
    return [
        "",
        f"{index}) {finding.site_name} - {finding.section} / {finding.item}",
        f"- 상태: {finding.status}",
        f"- 기준고/관찰값: {finding.measured_value or '-'}",
        f"- 현장 기록: {finding.memo or '-'}",
        f"- 보고서 반영 메모: {finding.recommendation or '-'}",
        f"- 사진/도면/유물: {finding.photo_text}",
        f"- 출처: {finding.source_ref}, 기록자 {finding.inspector}, 단말 {finding.device_id}",
    ]


def _finding_row(finding: ReportFinding) -> str:
    cells = (
        finding.source_ref,
        finding.site_name,
        finding.section,
        finding.item,
        finding.status,
        finding.memo,
        finding.recommendation,
        finding.photo_text,
    )
    cell_html = "".join(f"<td>{escape(cell)}</td>" for cell in cells)
    return f"      <tr>{cell_html}</tr>"


def _write_findings_csv(context: ReportContext, path: Path) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(["출처", "조사 구역", "구분", "항목", "상태", "기준고/관찰값", "현장 기록", "보고서 반영 메모", "사진/도면/유물"])
        for finding in context.findings:
            writer.writerow(
                [
                    finding.source_ref,
                    finding.site_name,
                    finding.section,
                    finding.item,
                    finding.status,
                    finding.measured_value,
                    finding.memo,
                    finding.recommendation,
                    finding.photo_text,
                ]
            )
