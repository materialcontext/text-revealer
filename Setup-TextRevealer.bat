@echo off
echo Setting up Text Revealer Launcher...

REM Save the PowerShell script to a permanent location
set "SCRIPT_FOLDER=%APPDATA%\TextRevealer"
set "SCRIPT_PATH=%SCRIPT_FOLDER%\TextRevealer-Launcher.ps1"

REM Create the directory if it doesn't exist
if not exist "%SCRIPT_FOLDER%" mkdir "%SCRIPT_FOLDER%"

REM Write the PowerShell script to the file
powershell -Command "Set-Content -Path '%SCRIPT_PATH%' -Value (Get-Content '%~dp0TextRevealer-Launcher.ps1')"

REM Create the shortcut
powershell -Command "& '%SCRIPT_PATH%' -CreateShortcut"

echo.
echo Setup complete! A shortcut has been created on your desktop.
echo When you click the shortcut, the application will launch in the background.
echo.
echo Press any key to exit...
pause > nul
