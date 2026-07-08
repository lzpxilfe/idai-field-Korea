@echo off
setlocal
set "ROOT=%~dp0"
set "DEFAULT_WORKDIR=G:\idai-field-android"

set /p WORKDIR=Work directory for APK download [%DEFAULT_WORKDIR%]:
if "%WORKDIR%"=="" set "WORKDIR=%DEFAULT_WORKDIR%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%install-idai-field-android-apk.ps1" -FromLatestArtifact -DownloadOnly -WorkDirectory "%WORKDIR%"
pause
