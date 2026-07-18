@echo off
cd /d "%~dp0"
echo ============================================
echo   VAR Notulen wordt gestart...
echo ============================================
echo.
echo Laat dit venster open staan zolang je de app gebruikt.
echo Sluit dit venster om de app weer te stoppen.
echo.
call npm start
pause
