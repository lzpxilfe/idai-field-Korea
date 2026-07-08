@echo off
setlocal
set "ROOT=%~dp0"

if "%IDAI_FIELD_ANDROID_WORKDIR%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%install-idai-field-android-apk.ps1" -FromLatestArtifact -DownloadOnly
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%install-idai-field-android-apk.ps1" -FromLatestArtifact -DownloadOnly -WorkDirectory "%IDAI_FIELD_ANDROID_WORKDIR%"
)
pause
