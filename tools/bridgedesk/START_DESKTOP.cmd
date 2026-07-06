@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

if exist "%ROOT%dist\BridgeDesk\BridgeDesk.exe" (
  start "" "%ROOT%dist\BridgeDesk\BridgeDesk.exe"
  exit /b 0
)

call "%ROOT%installers\shared\run_python.cmd" -m compatdesk
if errorlevel 1 pause
