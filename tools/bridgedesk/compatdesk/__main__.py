"""Command line entry point for BridgeDesk."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from compatdesk.app import BridgeDeskApp
from compatdesk.compatibility import compare_tablet_desktop
from compatdesk.field_data import DEFAULT_TABLET_INBOX_PATH, build_report_context, load_tablet_submissions
from compatdesk.layout_policy import LayoutPolicy
from compatdesk.paths import app_root
from compatdesk.report_export import render_report_text, write_report_package


def _parse_size(raw: str) -> tuple[int, int]:
    try:
        width, height = raw.lower().split("x", maxsplit=1)
        return int(width), int(height)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("size must look like WIDTHxHEIGHT") from exc


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m compatdesk")
    parser.add_argument(
        "--layout",
        type=_parse_size,
        help="Print the resolved layout profile for WIDTHxHEIGHT and exit.",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=app_root() / "config" / "layout.json",
        help="Path to the layout configuration file.",
    )
    parser.add_argument(
        "--compare",
        nargs=2,
        type=_parse_size,
        metavar=("TABLET_SIZE", "DESKTOP_SIZE"),
        help="Compare tablet and desktop compatibility contracts, for example 820x720 1280x800.",
    )
    parser.add_argument(
        "--tablet-data",
        type=Path,
        default=DEFAULT_TABLET_INBOX_PATH,
        help="Path to tablet submission JSON data or an inbox directory.",
    )
    parser.add_argument(
        "--preview-report",
        action="store_true",
        help="Print an HWP-friendly report draft from tablet data and exit.",
    )
    parser.add_argument(
        "--export-report",
        type=Path,
        help="Write HWP-friendly TXT/HTML/CSV report assets to this directory and exit.",
    )
    args = parser.parse_args()

    policy = LayoutPolicy.from_file(args.config)
    if args.preview_report or args.export_report:
        context = build_report_context(load_tablet_submissions(args.tablet_data))
        if args.preview_report:
            print(render_report_text(context))
        if args.export_report:
            for path in write_report_package(context, args.export_report):
                print(path)
        return

    if args.compare:
        report = compare_tablet_desktop(policy, args.compare[0], args.compare[1])
        print(json.dumps(report.to_dict(), indent=2))
        if not report.is_compatible:
            raise SystemExit(1)
        return

    if args.layout:
        width, height = args.layout
        print(json.dumps(policy.profile_for(width, height).to_dict(), indent=2))
        return

    app = BridgeDeskApp(policy=policy, tablet_data_path=args.tablet_data)
    app.mainloop()


if __name__ == "__main__":
    main()
