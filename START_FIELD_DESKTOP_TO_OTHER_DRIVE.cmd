@echo off
setlocal
set "ROOT=%~dp0"
set "DEFAULT_RUNTIME=G:\idai-field-desktop-runtime"

set /p RUNTIME_DIR=Runtime/cache directory for Field Desktop [%DEFAULT_RUNTIME%]:
if "%RUNTIME_DIR%"=="" set "RUNTIME_DIR=%DEFAULT_RUNTIME%"
set "IDAI_FIELD_RUNTIME_DIR=%RUNTIME_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%run-idai-field-ko.ps1"
if errorlevel 1 pause
