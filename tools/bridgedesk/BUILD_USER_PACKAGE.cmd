@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

call "%ROOT%installers\shared\run_python.cmd" "%ROOT%tools\build_user_package.py"
if errorlevel 1 pause
