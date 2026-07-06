@echo off
setlocal
set "ROOT=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%run-idai-field-ko.ps1"
if errorlevel 1 pause
