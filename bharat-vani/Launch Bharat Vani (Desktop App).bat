@echo off
title Bharat Vani - AI Desktop Assistant
chcp 65001 >nul
cls

echo ============================================================================
echo   🇮🇳  BHARAT VANI — AI Desktop Voice Assistant
echo ============================================================================
echo.

cd /d "%~dp0"

:: Check if Node is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: 1. Restart Bharat Vani backend so the latest bundled automation is loaded
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$old = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'dist[\\/]server\.cjs' }; " ^
    "$old | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; " ^
    "Write-Host '[1/2] Starting Bharat Vani AI backend server in background...'; " ^
    "Start-Process -FilePath 'node.exe' -ArgumentList 'dist/server.cjs' -WorkingDirectory '%CD%' -WindowStyle Hidden; " ^
    "Start-Sleep -Milliseconds 1500"

:: 2. Launch Standalone Native Windows App Window with Automatic Microphone Permission
echo [2/2] Launching Bharat Vani Standalone App Window...

where msedge >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start msedge.exe --app=http://localhost:3000 --window-size=1360,900 --app-id=BharatVaniAI --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required
    exit
)

where chrome >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start chrome.exe --app=http://localhost:3000 --window-size=1360,900 --app-id=BharatVaniAI --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required
    exit
)

:: Fallback to Electron
echo Launching via Electron...
call npx electron .
exit
