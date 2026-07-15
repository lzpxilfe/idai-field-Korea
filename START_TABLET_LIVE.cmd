@echo off
setlocal
set "ROOT=%~dp0"

if defined IDAI_FIELD_DEV_ROOT (
  set "DEV_ROOT=%IDAI_FIELD_DEV_ROOT%"
) else if exist H:\ (
  set "DEV_ROOT=H:\idai-field-dev"
) else if exist G:\ (
  set "DEV_ROOT=G:\idai-field-dev"
) else (
  echo [ERROR] G: or H: drive is required.
  pause
  exit /b 1
)

set /p NODE_VERSION=<"%ROOT%mobile\.nvmrc"
set "NODE_DIR=%DEV_ROOT%\runtimes\codex\node-v%NODE_VERSION%-win-x64"
if not exist "%NODE_DIR%\node.exe" set "NODE_DIR=%USERPROFILE%\.codex\runtimes\node-v%NODE_VERSION%-win-x64"
if not exist "%NODE_DIR%\node.exe" (
  echo [ERROR] Node %NODE_VERSION% was not found on G: or H:.
  pause
  exit /b 1
)

set "IDAI_FIELD_DEV_ROOT=%DEV_ROOT%"
set "npm_config_cache=%DEV_ROOT%\npm-cache"
set "GRADLE_USER_HOME=%DEV_ROOT%\gradle"
set "TEMP=%DEV_ROOT%\temp"
set "TMP=%TEMP%"
set "PATH=%NODE_DIR%;%PATH%"
set "NODE_BINARY=%NODE_DIR%\node.exe"
if not defined NODE_ENV set "NODE_ENV=development"

"%NODE_DIR%\node.exe" "%ROOT%tools\run-tablet-live.cjs" %*
if errorlevel 1 pause
