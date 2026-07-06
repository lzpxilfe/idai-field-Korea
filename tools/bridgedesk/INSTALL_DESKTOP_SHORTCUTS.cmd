@echo off
setlocal
set "ROOT=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%installers\desktop\install_shortcuts.ps1"
pause
