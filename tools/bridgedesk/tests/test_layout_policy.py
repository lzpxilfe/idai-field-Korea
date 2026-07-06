from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from compatdesk.compatibility import compare_tablet_desktop
from compatdesk.layout_policy import (
    Breakpoints,
    LayoutConfig,
    LayoutMode,
    LayoutPolicy,
    NavigationPattern,
    WindowScale,
)


class LayoutPolicyTests(unittest.TestCase):
    def test_tablet_and_desktop_modes_share_policy(self) -> None:
        policy = LayoutPolicy()

        tablet = policy.profile_for(820, 720)
        desktop = policy.profile_for(1280, 800)

        self.assertEqual(tablet.mode, LayoutMode.TABLET)
        self.assertEqual(tablet.navigation, NavigationPattern.RAIL)
        self.assertEqual(tablet.content_columns, 1)
        self.assertEqual(tablet.visible_table_fields, desktop.visible_table_fields)
        self.assertFalse(tablet.is_desktop_like)

        self.assertEqual(desktop.mode, LayoutMode.DESKTOP)
        self.assertEqual(desktop.navigation, NavigationPattern.SIDEBAR)
        self.assertEqual(desktop.content_columns, 2)
        self.assertTrue(desktop.is_desktop_like)

    def test_tablet_desktop_contract_has_no_missing_features(self) -> None:
        report = compare_tablet_desktop(LayoutPolicy())

        self.assertTrue(report.is_compatible)
        self.assertEqual(report.missing_actions_on_tablet, ())
        self.assertEqual(report.missing_table_fields_on_tablet, ())
        self.assertEqual(report.missing_detail_fields_on_tablet, ())

    def test_config_file_controls_columns_and_fields(self) -> None:
        config_json = """
        {
          "breakpoints": {"tablet": 700, "desktop": 1000, "wide": 1300},
          "contentColumns": {"desktop": 2},
          "formColumns": {"desktop": 2},
          "tableFields": {"desktop": ["source_ref", "status"]}
        }
        """
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "layout.json"
            path.write_text(config_json, encoding="utf-8")

            profile = LayoutPolicy.from_file(path).profile_for(1100, 780)

        self.assertEqual(profile.content_columns, 2)
        self.assertEqual(profile.form_columns, 2)
        self.assertEqual(profile.visible_table_fields, ("source_ref", "status"))

    def test_partial_config_keeps_default_modes(self) -> None:
        config = LayoutConfig.from_mapping({"contentColumns": {"desktop": 2}})

        self.assertEqual(config.content_columns[LayoutMode.TABLET], 1)
        self.assertEqual(config.content_columns[LayoutMode.WIDE], 2)
        self.assertEqual(config.table_fields[LayoutMode.DESKTOP], (
            "source_ref",
            "site_name",
            "section",
            "item",
            "status",
            "inspector",
            "submitted_at",
        ))

    def test_config_cannot_drop_desktop_fields_from_tablet(self) -> None:
        with self.assertRaises(ValueError):
            LayoutConfig.from_mapping(
                {
                    "tableFields": {
                        "tablet": ["source_ref", "site_name"],
                        "desktop": ["source_ref", "site_name", "status"],
                    }
                }
            )

    def test_project_config_keeps_tablet_desktop_table_parity(self) -> None:
        policy = LayoutPolicy.from_file(Path("config/layout.json"))
        report = compare_tablet_desktop(policy)

        self.assertTrue(report.is_compatible)

    def test_invalid_breakpoints_are_rejected(self) -> None:
        with self.assertRaises(ValueError):
            LayoutConfig(breakpoints=Breakpoints(tablet=900, desktop=800, wide=1300))

    def test_invalid_window_scale_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            LayoutConfig(window=WindowScale(default_width=500, default_height=500, min_width=600, min_height=520))

    def test_widths_are_normalized_before_profile_creation(self) -> None:
        profile = LayoutPolicy().profile_for(0, 0)

        self.assertEqual(profile.width, 1)
        self.assertEqual(profile.height, 1)
        self.assertEqual(profile.mode, LayoutMode.COMPACT)


if __name__ == "__main__":
    unittest.main()
