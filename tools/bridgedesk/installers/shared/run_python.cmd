@echo off
setlocal

where py >nul 2>nul
if not errorlevel 1 (
  py -3 %*
  exit /b %errorlevel%
)

where python >nul 2>nul
if not errorlevel 1 (
  python %*
  exit /b %errorlevel%
)

echo Python 3.11 or newer is required.
echo Opening the Python download page.
start "" "https://www.python.org/downloads/windows/"
exit /b 1
