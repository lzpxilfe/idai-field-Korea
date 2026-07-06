"""Build a standalone BridgeDesk desktop app with PyInstaller."""

from __future__ import annotations

from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    icon_path = ROOT / "assets" / "icons" / "bridgedesk.ico"
    if not icon_path.exists():
        subprocess.run([sys.executable, str(ROOT / "tools" / "make_visual_assets.py")], check=True)

    desktop_command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--windowed",
        "--name",
        "BridgeDesk",
        "--distpath",
        str(ROOT / "dist"),
        "--workpath",
        str(ROOT / "build" / "pyinstaller"),
        "--specpath",
        str(ROOT / "build" / "pyinstaller"),
        "--add-data",
        f"{ROOT / 'config'};config",
        "--add-data",
        f"{ROOT / 'data'};data",
        "--icon",
        str(icon_path),
        str(ROOT / "compatdesk" / "__main__.py"),
    ]
    subprocess.run(desktop_command, check=True)

    tablet_server_command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--console",
        "--name",
        "BridgeDeskTabletServer",
        "--distpath",
        str(ROOT / "dist"),
        "--workpath",
        str(ROOT / "build" / "pyinstaller"),
        "--specpath",
        str(ROOT / "build" / "pyinstaller"),
        "--add-data",
        f"{ROOT / 'tablet'};tablet",
        "--icon",
        str(icon_path),
        str(ROOT / "tools" / "tablet_server.py"),
    ]
    subprocess.run(tablet_server_command, check=True)
    print("")
    print(f"Standalone app created: {ROOT / 'dist' / 'BridgeDesk' / 'BridgeDesk.exe'}")
    print(f"Tablet server created: {ROOT / 'dist' / 'BridgeDeskTabletServer' / 'BridgeDeskTabletServer.exe'}")


if __name__ == "__main__":
    main()
