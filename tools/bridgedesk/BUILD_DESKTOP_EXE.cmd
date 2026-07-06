@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

call "%ROOT%installers\shared\run_python.cmd" "%ROOT%tools\build_desktop_exe.py"
if errorlevel 1 pause
