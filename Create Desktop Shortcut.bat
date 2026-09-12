@echo off
title Create Bharat Vani Desktop Shortcut
chcp 65001 >nul
cls

echo ============================================================================
echo   🇮🇳  BHARAT VANI — Create Windows Desktop Shortcut
echo ============================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "TARGET_DIR=%SCRIPT_DIR%"
if exist "%SCRIPT_DIR%bharat-vani" set "TARGET_DIR=%SCRIPT_DIR%bharat-vani"

set "LAUNCHER=%TARGET_DIR%\Launch Bharat Vani (Desktop App).bat"
set "ICON_PATH=%TARGET_DIR%\icon.png"

echo Creating shortcut on your Windows Desktop...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$shortcutPath = [System.IO.Path]::Combine($desktop, 'Bharat Vani AI.lnk'); " ^
  "$s = $ws.CreateShortcut($shortcutPath); " ^
  "$s.TargetPath = '%LAUNCHER%'; " ^
  "$s.WorkingDirectory = '%TARGET_DIR%'; " ^
  "$s.Description = 'Bharat Vani - Indian AI Voice Assistant'; " ^
  "$s.WindowStyle = 1; " ^
  "if (Test-Path '%ICON_PATH%') { $s.IconLocation = '%ICON_PATH%' }; " ^
  "$s.Save(); " ^
  "Write-Host '[SUCCESS] Desktop shortcut created at:' $shortcutPath -ForegroundColor Green;"

echo.
echo ============================================================================
echo   Done! You now have a 'Bharat Vani AI' icon on your Desktop.
echo   Simply double-click it anytime to open the assistant!
echo ============================================================================
echo.
pause
