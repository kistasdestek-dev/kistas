@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0scripts\publish-web.ps1"
set "result=%errorlevel%"
echo.
if not "%result%"=="0" echo Yayinlama tamamlanmadi. Yukaridaki mesaji kontrol edin.
pause
exit /b %result%
