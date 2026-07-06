from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class DistributionAssetTests(unittest.TestCase):
    def test_user_launchers_exist(self) -> None:
        for relative in (
            "START_DESKTOP.cmd",
            "START_TABLET_SERVER.cmd",
            "EXPORT_HWP_REPORT.cmd",
            "INSTALL_DESKTOP_SHORTCUTS.cmd",
            "BUILD_DESKTOP_EXE.cmd",
            "BUILD_USER_PACKAGE.cmd",
        ):
            self.assertTrue((ROOT / relative).exists(), relative)

    def test_tablet_manifest_is_valid_json(self) -> None:
        manifest = json.loads((ROOT / "tablet" / "manifest.webmanifest").read_text(encoding="utf-8"))

        self.assertEqual(manifest["display"], "standalone")
        self.assertGreaterEqual(len(manifest["icons"]), 2)

    def test_tablet_app_has_install_assets(self) -> None:
        for relative in (
            "tablet/index.html",
            "tablet/app.css",
            "tablet/app.js",
            "tablet/service-worker.js",
            "tablet/icons/icon-192.png",
            "tablet/icons/icon-512.png",
        ):
            self.assertTrue((ROOT / relative).exists(), relative)

    def test_readme_screenshots_exist(self) -> None:
        for relative in (
            "docs/screenshots/desktop-report.png",
            "docs/screenshots/tablet-input.png",
        ):
            self.assertTrue((ROOT / relative).exists(), relative)


if __name__ == "__main__":
    unittest.main()
