@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"
set "OUT=%ROOT%exports\report-draft"

call "%ROOT%installers\shared\run_python.cmd" -m compatdesk --export-report "%OUT%"
if errorlevel 1 (
  pause
  exit /b 1
)

explorer "%OUT%"
pause
