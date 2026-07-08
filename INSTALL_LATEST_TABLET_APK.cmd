@echo off
setlocal
set "ROOT=%~dp0"

if "%IDAI_FIELD_ANDROID_WORKDIR%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%install-idai-field-android-apk.ps1" -FromLatestArtifact -DownloadPlatformTools
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%install-idai-field-android-apk.ps1" -FromLatestArtifact -DownloadPlatformTools -WorkDirectory "%IDAI_FIELD_ANDROID_WORKDIR%"
)
if errorlevel 1 pause
