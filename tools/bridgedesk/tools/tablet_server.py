"""Serve the tablet field input app on the local network."""

from __future__ import annotations

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import socket
import sys
import webbrowser


def frozen_candidates() -> tuple[Path, ...]:
    exe_dir = Path(sys.executable).resolve().parent
    candidates = [Path.cwd(), exe_dir]
    if exe_dir.parent.name.lower() == "dist":
        candidates.insert(1, exe_dir.parent.parent)
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        candidates.append(Path(meipass).resolve())
    result: list[Path] = []
    seen: set[Path] = set()
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved not in seen:
            seen.add(resolved)
            result.append(resolved)
    return tuple(result)


def runtime_root() -> Path:
    if getattr(sys, "frozen", False):
        for candidate in frozen_candidates():
            if (candidate / "tablet").exists():
                return candidate
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


ROOT = runtime_root()
PORT = 8765


class BridgeDeskHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        print(format % args)


def main() -> None:
    print("BridgeDesk tablet server")
    print("========================")
    print("Keep this window open while tablets are connected.")
    print("")
    for url in tablet_urls():
        print(url)
    print("")
    print("Open one of these URLs on the tablet, then add it to the home screen.")
    print("Press Ctrl+C to stop the server.")
    print("")

    if os.environ.get("BRIDGEDESK_NO_BROWSER") != "1":
        webbrowser.open(f"http://127.0.0.1:{PORT}/tablet/")
    server = ThreadingHTTPServer(("0.0.0.0", PORT), BridgeDeskHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("")
        print("Tablet server stopped.")
    finally:
        server.server_close()


def tablet_urls() -> tuple[str, ...]:
    addresses = {"127.0.0.1"}
    hostname = socket.gethostname()
    for info in socket.getaddrinfo(hostname, None, family=socket.AF_INET):
        address = info[4][0]
        if not address.startswith("127."):
            addresses.add(address)
    return tuple(f"http://{address}:{PORT}/tablet/" for address in sorted(addresses))


if __name__ == "__main__":
    os.chdir(ROOT)
    main()
