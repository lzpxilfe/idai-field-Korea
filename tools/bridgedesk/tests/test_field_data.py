from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
import shutil

from compatdesk.field_data import DEFAULT_TABLET_DATA_PATH, build_report_context, load_tablet_submissions
from compatdesk.report_export import (
    render_finding_clipboard_text,
    render_finding_table_row,
    render_findings_table_text,
    render_report_html,
    render_report_text,
    write_report_package,
)


class FieldDataTests(unittest.TestCase):
    def test_sample_tablet_payload_builds_report_context(self) -> None:
        submissions = load_tablet_submissions(DEFAULT_TABLET_DATA_PATH)
        context = build_report_context(submissions)

        self.assertEqual(context.project_name, "월성 북편 발굴조사")
        self.assertEqual(len(context.submissions), 2)
        self.assertEqual(len(context.findings), 4)
        self.assertIn("TAB-ARCH-03", context.device_ids)

    def test_report_text_preserves_source_traceability(self) -> None:
        context = build_report_context(load_tablet_submissions(DEFAULT_TABLET_DATA_PATH))
        report = render_report_text(context)

        self.assertIn("현장기록 보고서 초안", report)
        self.assertIn("ARCH-2026-0706-001/E-001", report)
        self.assertIn("사진/도면/유물", report)

    def test_report_html_contains_hwp_ready_table(self) -> None:
        context = build_report_context(load_tablet_submissions(DEFAULT_TABLET_DATA_PATH))
        html = render_report_html(context)

        self.assertIn("<table>", html)
        self.assertIn("수혈 유구 SK-03", html)

    def test_selected_finding_clipboard_text_is_hwp_ready(self) -> None:
        context = build_report_context(load_tablet_submissions(DEFAULT_TABLET_DATA_PATH))
        snippet = render_finding_clipboard_text(context.findings[0], index=1)

        self.assertIn("1) 3트렌치 북벽 - 토층 / 북벽 3층 경계", snippet)
        self.assertIn("보고서 반영 메모", snippet)
        self.assertIn("P-001, P-002, D-001", snippet)

    def test_finding_table_text_uses_tabs_for_hwp_paste(self) -> None:
        context = build_report_context(load_tablet_submissions(DEFAULT_TABLET_DATA_PATH))
        table = render_findings_table_text(context)
        row = render_finding_table_row(context.findings[0])

        self.assertIn("출처\t조사 구역\t구분", table)
        self.assertIn("ARCH-2026-0706-001/E-001\t3트렌치 북벽\t토층", row)

    def test_report_package_exports_copy_ready_assets(self) -> None:
        context = build_report_context(load_tablet_submissions(DEFAULT_TABLET_DATA_PATH))

        with tempfile.TemporaryDirectory() as directory:
            paths = write_report_package(context, Path(directory))

            self.assertEqual(len(paths), 4)
            for path in paths:
                self.assertTrue(path.exists(), path)

    def test_inbox_directory_loads_tablet_json_files(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            inbox = Path(directory)
            shutil.copy(DEFAULT_TABLET_DATA_PATH, inbox / "field.json")

            submissions = load_tablet_submissions(inbox)

        self.assertEqual(len(submissions), 2)

    def test_empty_inbox_falls_back_to_sample_payload(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            submissions = load_tablet_submissions(Path(directory))

        self.assertEqual(len(submissions), 2)


if __name__ == "__main__":
    unittest.main()
