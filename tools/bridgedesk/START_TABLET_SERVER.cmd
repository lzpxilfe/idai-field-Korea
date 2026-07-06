@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

if exist "%ROOT%dist\BridgeDeskTabletServer\BridgeDeskTabletServer.exe" (
  "%ROOT%dist\BridgeDeskTabletServer\BridgeDeskTabletServer.exe"
  pause
  exit /b 0
)

call "%ROOT%installers\shared\run_python.cmd" "%ROOT%tools\tablet_server.py"
pause
