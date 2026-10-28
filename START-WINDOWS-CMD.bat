@echo off
setlocal
cd /d "%~dp0"
echo ================================================
echo Fair Power Age Platform - Bharat Infotechs Demo
echo ================================================
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js 20 or newer, then reopen CMD.
  pause
  exit /b 1
)
echo Node version:
node -v
echo.
if not exist node_modules (
  echo Installing dependencies. This requires internet access on first run...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Check internet/proxy/npm registry and try: npm install
    pause
    exit /b 1
  )
)
echo Starting API and website...
call npm run dev
pause
