@echo off
setlocal
set "ROOT=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%tools\windows\install_field_desktop_shortcut.ps1"
if errorlevel 1 pause
